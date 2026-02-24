import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskDto } from '../../tasks/dto/task.dto';

export class AgentDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({ example: 'ResearchBot' })
  name: string;

  @ApiPropertyOptional({
    example: 'Web research and summarisation tasks',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Hedera account ID that receives HBAR rewards',
    example: '0.0.98765',
  })
  hedera_account_id: string;

  @ApiProperty({ example: 'gpt-4o' })
  model: string;

  @ApiProperty({
    description: 'Whether the agent is available or currently executing a task',
    enum: ['IDLE', 'BUSY'],
    example: 'IDLE',
  })
  status: string;

  @ApiProperty({ example: 3 })
  tasks_completed: number;

  @ApiProperty({ example: '2026-02-24T11:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2026-02-24T11:05:00.000Z' })
  updated_at: string;
}

export class AgentRunResultDto {
  @ApiProperty({ type: AgentDto })
  agent: AgentDto;

  @ApiProperty({ type: TaskDto, description: 'The completed task record' })
  task: TaskDto;

  @ApiProperty({
    description: "The agent's final answer / deliverable",
    example: 'Here is a summary of the latest Hedera blog posts...',
  })
  result: string;

  @ApiProperty({
    description: 'Number of web search tool calls made during execution',
    example: 3,
  })
  toolCallsCount: number;
}
