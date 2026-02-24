import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({
    description: 'Display name for the agent',
    example: 'ResearchBot',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'What this agent specialises in',
    example: 'Web research and summarisation tasks',
  })
  description?: string;

  @ApiProperty({
    description: 'Hedera account ID where HBAR rewards are sent on task completion',
    example: '0.0.98765',
  })
  hederaAccountId: string;

  @ApiPropertyOptional({
    description: 'OpenAI model to use for reasoning',
    example: 'gpt-4o',
    default: 'gpt-4o',
  })
  model?: string;
}
