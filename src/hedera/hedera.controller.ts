import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HederaService } from './hedera.service';
import {
  CreateTopicDto,
  PublishMessageDto,
  PostTaskEventDto,
  TransferHbarDto,
} from './dto/hedera.dto';

@Controller('hedera')
export class HederaController {
  constructor(private readonly hederaService: HederaService) {}

  /** GET /hedera/status — returns the operator account and marketplace topic */
  @Get('status')
  getStatus() {
    return {
      operator: this.hederaService.getOperatorAccountId(),
      marketplaceTopicId: this.hederaService.getMarketplaceTopicId(),
    };
  }

  /** POST /hedera/topic — create a new HCS topic */
  @Post('topic')
  @HttpCode(HttpStatus.CREATED)
  async createTopic(@Body() dto: CreateTopicDto) {
    const topicId = await this.hederaService.createTopic(dto.memo);
    if (dto.setAsMarketplace) {
      this.hederaService.setMarketplaceTopicId(topicId);
    }
    return { topicId };
  }

  /** POST /hedera/message — publish a raw message to any topic */
  @Post('message')
  @HttpCode(HttpStatus.CREATED)
  async publishMessage(@Body() dto: PublishMessageDto) {
    const sequenceNumber = await this.hederaService.publishMessage(
      dto.topicId,
      dto.message,
    );
    return { sequenceNumber };
  }

  /** POST /hedera/task-event — post a structured marketplace event */
  @Post('task-event')
  @HttpCode(HttpStatus.CREATED)
  async postTaskEvent(@Body() dto: PostTaskEventDto) {
    const sequenceNumber = await this.hederaService.postTaskEvent(
      dto.eventType,
      dto.payload,
    );
    return { sequenceNumber };
  }

  /** POST /hedera/transfer — send HBAR from operator to recipient */
  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  async transferHbar(@Body() dto: TransferHbarDto) {
    const transactionId = await this.hederaService.transferHbar(
      dto.recipientId,
      dto.amountHbar,
    );
    return { transactionId };
  }
}
