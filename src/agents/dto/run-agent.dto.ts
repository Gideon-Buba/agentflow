import { ApiProperty } from '@nestjs/swagger';

export class RunAgentDto {
  @ApiProperty({
    description: 'ID of the OPEN task the agent should accept and complete',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  taskId: string;
}
