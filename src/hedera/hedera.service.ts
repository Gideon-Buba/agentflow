import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TransferTransaction,
  Hbar,
  TopicId,
  TransactionReceipt,
  Status,
} from '@hashgraph/sdk';

@Injectable()
export class HederaService implements OnModuleInit {
  private readonly logger = new Logger(HederaService.name);
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private marketplaceTopicId: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const accountId = this.configService.get<string>('HEDERA_ACCOUNT_ID');
    const privateKey = this.configService.get<string>('HEDERA_PRIVATE_KEY');
    const network = this.configService.get<string>('HEDERA_NETWORK', 'testnet');

    if (!accountId || !privateKey) {
      throw new Error(
        'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in environment',
      );
    }

    this.operatorId = AccountId.fromString(accountId);
    this.operatorKey = PrivateKey.fromStringED25519(privateKey);

    this.client =
      network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
    this.client.setOperator(this.operatorId, this.operatorKey);
    // grpcDeadline = per-call timeout; requestTimeout must be > grpcDeadline
    this.client.setMaxAttempts(3);
    this.client.setGrpcDeadline(8_000); // 8 s per gRPC call
    this.client.setRequestTimeout(30_000); // 30 s total across all attempts

    this.logger.log(
      `Hedera client initialized — network: ${network}, operator: ${accountId}`,
    );

    // Create the marketplace topic on startup if not already persisted.
    // Non-fatal — the app boots normally; topic creation can be triggered via
    // POST /hedera/topic or by setting HEDERA_MARKETPLACE_TOPIC_ID in .env.
    await this.initMarketplaceTopic();
  }

  // ─── HCS Topic Management ───────────────────────────────────────────────────

  /**
   * Creates a new HCS topic and returns its ID string (e.g. "0.0.12345").
   * The topic has no admin or submit key so anyone can post to it.
   */
  async createTopic(memo: string = 'AgentFlow Marketplace'): Promise<string> {
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(memo)
      .execute(this.client);

    const receipt: TransactionReceipt = await tx.getReceipt(this.client);

    if (!receipt.topicId) {
      throw new Error('Topic creation failed — no topicId in receipt');
    }

    const topicIdStr = receipt.topicId.toString();
    this.logger.log(`HCS topic created: ${topicIdStr}`);
    return topicIdStr;
  }

  /**
   * Publishes a message to an HCS topic.
   * @param topicId  e.g. "0.0.12345"
   * @param message  arbitrary string payload (JSON encouraged)
   * @returns the consensus sequence number
   */
  async publishMessage(topicId: string, message: string): Promise<number> {
    const tx = await new TopicMessageSubmitTransaction({
      topicId: TopicId.fromString(topicId),
      message,
    }).execute(this.client);

    const receipt: TransactionReceipt = await tx.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(
        `Message submission failed with status: ${receipt.status.toString()}`,
      );
    }

    const seqNum = receipt.topicSequenceNumber?.toNumber() ?? -1;
    this.logger.log(
      `Message published to topic ${topicId} — seq#${seqNum}: ${message.slice(0, 80)}`,
    );
    return seqNum;
  }

  /**
   * Posts a structured task event to the marketplace topic.
   */
  async postTaskEvent(
    eventType: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_COMPLETED',
    payload: Record<string, unknown>,
  ): Promise<number> {
    const topicId = this.getMarketplaceTopicId();
    const message = JSON.stringify({ eventType, ...payload, ts: Date.now() });
    return this.publishMessage(topicId, message);
  }

  // ─── HBAR Payments ──────────────────────────────────────────────────────────

  /**
   * Transfers HBAR from the operator account to a recipient.
   * @param recipientId  Hedera account ID string, e.g. "0.0.98765"
   * @param amountHbar   amount in HBAR (not tinybars)
   * @returns transaction ID string
   */
  async transferHbar(recipientId: string, amountHbar: number): Promise<string> {
    const tx = await new TransferTransaction()
      .addHbarTransfer(this.operatorId, new Hbar(-amountHbar))
      .addHbarTransfer(AccountId.fromString(recipientId), new Hbar(amountHbar))
      .execute(this.client);

    const receipt: TransactionReceipt = await tx.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(
        `HBAR transfer failed with status: ${receipt.status.toString()}`,
      );
    }

    const txId = tx.transactionId.toString();
    this.logger.log(
      `Transferred ${amountHbar} HBAR to ${recipientId} — txId: ${txId}`,
    );
    return txId;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  getMarketplaceTopicId(): string {
    if (!this.marketplaceTopicId) {
      throw new Error(
        'Marketplace topic not initialised. ' +
          'Set HEDERA_MARKETPLACE_TOPIC_ID in .env, or call POST /hedera/topic to create one.',
      );
    }
    return this.marketplaceTopicId;
  }

  /** Manually set the marketplace topic (e.g. after calling POST /hedera/topic). */
  setMarketplaceTopicId(topicId: string): void {
    this.marketplaceTopicId = topicId;
    this.logger.log(`Marketplace topic set to: ${topicId}`);
  }

  getOperatorAccountId(): string {
    return this.operatorId.toString();
  }

  private async initMarketplaceTopic(): Promise<void> {
    // Allow a pre-existing topic to be injected via env so we don't create a
    // new one on every cold start.
    const existingTopicId = this.configService.get<string>(
      'HEDERA_MARKETPLACE_TOPIC_ID',
    );

    if (existingTopicId) {
      this.marketplaceTopicId = existingTopicId;
      this.logger.log(
        `Using existing marketplace topic: ${this.marketplaceTopicId}`,
      );
      return;
    }

    this.logger.log(
      'No HEDERA_MARKETPLACE_TOPIC_ID found — creating new HCS topic…',
    );
    try {
      this.marketplaceTopicId = await this.createTopic(
        'AgentFlow Task Marketplace',
      );
      this.logger.log(
        `Add this to your .env to reuse the topic:\n  HEDERA_MARKETPLACE_TOPIC_ID=${this.marketplaceTopicId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Could not auto-create marketplace topic (${(err as Error).message}). ` +
          'The app will start anyway. Either set HEDERA_MARKETPLACE_TOPIC_ID in .env ' +
          'or call POST /hedera/topic once testnet is reachable.',
      );
    }
  }
}
