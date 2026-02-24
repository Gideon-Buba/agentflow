import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Short title describing the task',
    example: 'Summarise the latest Hedera blog posts',
  })
  title: string;

  @ApiProperty({
    description: 'Full task description including expected deliverables',
    example:
      'Fetch the 5 most recent posts from hedera.com/blog and return a 3-sentence summary for each.',
  })
  description: string;

  @ApiProperty({
    description: 'Reward for the agent on completion, in HBAR',
    example: 5,
  })
  budgetHbar: number;

  @ApiProperty({
    description: 'Hedera account ID of the user posting the task',
    example: '0.0.7991793',
  })
  creatorId: string;
}
