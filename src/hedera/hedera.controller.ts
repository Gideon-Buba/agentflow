import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import {
  ApiCreatedTypedResponse,
  ApiOkTypedResponse,
} from '../common/decorators/api-typed-response.decorator';
import { HederaService } from './hedera.service';
import {
  CreateTopicDto,
  PublishMessageDto,
  PostTaskEventDto,
  TransferHbarDto,
  HederaStatusResponse,
  TopicIdResponse,
  SequenceNumberResponse,
  TransactionIdResponse,
} from './dto/hedera.dto';

@ApiTags('Hedera')
@Controller('hedera')
export class HederaController {
  constructor(private readonly hederaService: HederaService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get operator status',
    description:
      'Returns the operator Hedera account ID and the active marketplace HCS topic ID.',
  })
  @ApiOkTypedResponse(HederaStatusResponse)
  getStatus(): HederaStatusResponse {
    return {
      operator: this.hederaService.getOperatorAccountId(),
      marketplaceTopicId: this.hederaService.getMarketplaceTopicId(),
    };
  }

  @Post('topic')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an HCS topic',
    description:
      'Creates a new Hedera Consensus Service topic. ' +
      'Pass `setAsMarketplace: true` to make this the active marketplace topic.',
  })
  @ApiCreatedTypedResponse(TopicIdResponse)
  @ApiInternalServerErrorResponse({ description: 'Hedera network unreachable' })
  async createTopic(@Body() dto: CreateTopicDto): Promise<TopicIdResponse> {
    const topicId = await this.hederaService.createTopic(dto.memo);
    if (dto.setAsMarketplace) {
      this.hederaService.setMarketplaceTopicId(topicId);
    }
    return { topicId };
  }

  @Post('message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Publish a raw message to an HCS topic',
    description:
      'Submits an arbitrary string message to the specified HCS topic and returns the consensus sequence number.',
  })
  @ApiCreatedTypedResponse(SequenceNumberResponse)
  @ApiBadRequestResponse({ description: 'Invalid topic ID format' })
  @ApiInternalServerErrorResponse({ description: 'Hedera network unreachable' })
  async publishMessage(
    @Body() dto: PublishMessageDto,
  ): Promise<SequenceNumberResponse> {
    const sequenceNumber = await this.hederaService.publishMessage(
      dto.topicId,
      dto.message,
    );
    return { sequenceNumber };
  }

  @Post('task-event')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Post a structured task event to the marketplace topic',
    description:
      'Serialises the event type and payload as JSON and publishes it to the marketplace HCS topic. ' +
      'Requires `HEDERA_MARKETPLACE_TOPIC_ID` to be set or a topic created via `POST /hedera/topic`.',
  })
  @ApiCreatedTypedResponse(SequenceNumberResponse)
  @ApiInternalServerErrorResponse({
    description:
      'Hedera network unreachable or marketplace topic not initialised',
  })
  async postTaskEvent(
    @Body() dto: PostTaskEventDto,
  ): Promise<SequenceNumberResponse> {
    const sequenceNumber = await this.hederaService.postTaskEvent(
      dto.eventType,
      dto.payload,
    );
    return { sequenceNumber };
  }

  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Transfer HBAR to an account',
    description:
      'Sends HBAR from the operator account (configured via `HEDERA_ACCOUNT_ID`) to any Hedera account. ' +
      'Returns the Hedera transaction ID.',
  })
  @ApiCreatedTypedResponse(TransactionIdResponse)
  @ApiBadRequestResponse({ description: 'Invalid recipient account ID' })
  @ApiInternalServerErrorResponse({
    description: 'Hedera network unreachable or insufficient balance',
  })
  async transferHbar(
    @Body() dto: TransferHbarDto,
  ): Promise<TransactionIdResponse> {
    const transactionId = await this.hederaService.transferHbar(
      dto.recipientId,
      dto.amountHbar,
    );
    return { transactionId };
  }
}
