import { ApiProperty } from '@nestjs/swagger';

export class AcceptTaskDto {
  @ApiProperty({
    description: 'Hedera account ID of the agent accepting the task',
    example: '0.0.98765',
  })
  agentId: string;
}
