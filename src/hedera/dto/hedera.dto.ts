import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  @ApiPropertyOptional({
    description: 'Human-readable memo stored on the HCS topic',
    example: 'AgentFlow Task Marketplace',
  })
  memo?: string;

  @ApiPropertyOptional({
    description:
      'When true, the newly created topic is promoted to the active marketplace topic in memory',
    example: true,
  })
  setAsMarketplace?: boolean;
}

export class PublishMessageDto {
  @ApiProperty({
    description: 'HCS topic ID to publish to',
    example: '0.0.12345',
  })
  topicId: string;

  @ApiProperty({
    description: 'Message payload (plain string or serialised JSON)',
    example: '{"hello":"world"}',
  })
  message: string;
}

export class PostTaskEventDto {
  @ApiProperty({
    description: 'Marketplace event type',
    enum: ['TASK_POSTED', 'TASK_ACCEPTED', 'TASK_COMPLETED'],
    example: 'TASK_POSTED',
  })
  eventType: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_COMPLETED';

  @ApiProperty({
    description: 'Arbitrary key-value data merged into the HCS message',
    type: 'object',
    additionalProperties: true,
    example: { taskId: 'uuid-here', budgetHbar: 5 },
  })
  payload: Record<string, unknown>;
}

export class TransferHbarDto {
  @ApiProperty({
    description: 'Hedera account ID of the recipient',
    example: '0.0.98765',
  })
  recipientId: string;

  @ApiProperty({
    description: 'Amount to transfer in HBAR (not tinybars)',
    example: 5,
  })
  amountHbar: number;
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export class HederaStatusResponse {
  @ApiProperty({ example: '0.0.7991793' })
  operator: string;

  @ApiPropertyOptional({
    example: '0.0.12345',
    description:
      'null when no marketplace topic is configured — set HEDERA_MARKETPLACE_TOPIC_ID in .env or call POST /hedera/topic',
    nullable: true,
  })
  marketplaceTopicId: string | null;
}

export class TopicIdResponse {
  @ApiProperty({
    description: 'Newly created HCS topic ID',
    example: '0.0.12345',
  })
  topicId: string;
}

export class SequenceNumberResponse {
  @ApiProperty({ description: 'HCS consensus sequence number', example: 42 })
  sequenceNumber: number;
}

export class TransactionIdResponse {
  @ApiProperty({
    description: 'Hedera transaction ID',
    example: '0.0.7991793@1708765432.000000000',
  })
  transactionId: string;
}
