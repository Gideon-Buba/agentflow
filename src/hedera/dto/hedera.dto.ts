export class CreateTopicDto {
  memo?: string;
  setAsMarketplace?: boolean;
}

export class PublishMessageDto {
  topicId: string;
  message: string;
}

export class PostTaskEventDto {
  eventType: 'TASK_POSTED' | 'TASK_ACCEPTED' | 'TASK_COMPLETED';
  payload: Record<string, unknown>;
}

export class TransferHbarDto {
  recipientId: string;
  amountHbar: number;
}
