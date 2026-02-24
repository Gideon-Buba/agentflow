import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  ApiCreatedTypedResponse,
  ApiOkTypedResponse,
  ApiOkTypedArrayResponse,
} from '../common/decorators/api-typed-response.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { RunAgentDto } from './dto/run-agent.dto';
import { AgentDto, AgentRunResultDto } from './dto/agent.dto';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register an agent',
    description:
      'Creates a new AI agent with its own Hedera account ID for receiving HBAR rewards.',
  })
  @ApiCreatedTypedResponse(AgentDto)
  create(@Body() dto: CreateAgentDto): Promise<AgentDto> {
    return this.agentsService.create(dto) as Promise<AgentDto>;
  }

  @Get()
  @ApiOperation({ summary: 'List all agents' })
  @ApiOkTypedArrayResponse(AgentDto)
  findAll(): Promise<AgentDto[]> {
    return this.agentsService.findAll() as Promise<AgentDto[]>;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by ID' })
  @ApiParam({ name: 'id', description: 'Agent UUID' })
  @ApiOkTypedResponse(AgentDto)
  @ApiNotFoundResponse({ description: 'Agent not found' })
  findOne(@Param('id') id: string): Promise<AgentDto> {
    return this.agentsService.findOne(id) as Promise<AgentDto>;
  }

  @Post(':id/run')
  @ApiOperation({
    summary: 'Run an agent on a task',
    description:
      'Assigns the agent to an OPEN task and runs the full autonomous loop:\n\n' +
      '1. Accepts the task (HCS `TASK_ACCEPTED` event)\n' +
      '2. Reasons with OpenAI, calling `web_search` via Tavily as needed\n' +
      "3. Completes the task — transfers HBAR to the agent's Hedera account and emits `TASK_COMPLETED`\n\n" +
      'This call blocks until the agent finishes. For long tasks this may take 30–120 seconds.',
  })
  @ApiParam({ name: 'id', description: 'Agent UUID' })
  @ApiOkTypedResponse(AgentRunResultDto)
  @ApiBadRequestResponse({ description: 'Agent is BUSY or task is not OPEN' })
  @ApiNotFoundResponse({ description: 'Agent or task not found' })
  run(
    @Param('id') id: string,
    @Body() dto: RunAgentDto,
  ): Promise<AgentRunResultDto> {
    return this.agentsService.run(id, dto) as Promise<AgentRunResultDto>;
  }
}
