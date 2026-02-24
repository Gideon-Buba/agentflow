import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Summarise the latest Hedera blog posts' })
  title: string;

  @ApiProperty({
    example:
      'Fetch the 5 most recent posts from hedera.com/blog and return a 3-sentence summary for each.',
  })
  description: string;

  @ApiProperty({ description: 'Reward amount in HBAR', example: 5 })
  budget_hbar: number;

  @ApiProperty({
    description: 'Current lifecycle status of the task',
    enum: ['OPEN', 'ACCEPTED', 'COMPLETED', 'CANCELLED'],
    example: 'OPEN',
  })
  status: string;

  @ApiProperty({
    description: 'Hedera account ID of the task creator',
    example: '0.0.7991793',
  })
  creator_id: string;

  @ApiPropertyOptional({
    description: 'Hedera account ID of the agent assigned to the task',
    example: '0.0.98765',
    nullable: true,
  })
  agent_id: string | null;

  @ApiPropertyOptional({
    description: 'HCS sequence number of the TASK_POSTED message',
    example: 42,
    nullable: true,
  })
  hcs_sequence_number: number | null;

  @ApiPropertyOptional({
    description: 'Hedera transaction ID of the HBAR payment (set on completion)',
    example: '0.0.7991793@1708765432.000000000',
    nullable: true,
  })
  payment_tx_id: string | null;

  @ApiProperty({ example: '2026-02-24T11:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2026-02-24T11:05:00.000Z' })
  updated_at: string;
}
