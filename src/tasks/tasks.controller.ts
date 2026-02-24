import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  ApiCreatedTypedResponse,
  ApiOkTypedResponse,
  ApiOkTypedArrayResponse,
} from '../common/decorators/api-typed-response.decorator';
import { TasksService, TaskStatus } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AcceptTaskDto } from './dto/accept-task.dto';
import { TaskDto } from './dto/task.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a task',
    description:
      'Saves the task to Supabase and publishes a `TASK_POSTED` event to the marketplace HCS topic. ' +
      'The returned `hcs_sequence_number` is the consensus position on Hedera.',
  })
  @ApiCreatedTypedResponse(TaskDto)
  @ApiBadRequestResponse({ description: 'Missing required fields' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  create(@Body() dto: CreateTaskDto): Promise<TaskDto> {
    return this.tasksService.create(dto) as Promise<TaskDto>;
  }

  @Get()
  @ApiOperation({
    summary: 'List tasks',
    description:
      'Returns all tasks ordered by creation date (newest first). Filter by `status` to narrow results.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'ACCEPTED', 'COMPLETED', 'CANCELLED'],
    description: 'Filter by task status',
  })
  @ApiOkTypedArrayResponse(TaskDto)
  findAll(@Query('status') status?: TaskStatus): Promise<TaskDto[]> {
    return this.tasksService.findAll(status) as Promise<TaskDto[]>;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkTypedResponse(TaskDto)
  @ApiNotFoundResponse({ description: 'Task not found' })
  findOne(@Param('id') id: string): Promise<TaskDto> {
    return this.tasksService.findOne(id) as Promise<TaskDto>;
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept a task',
    description:
      'Assigns an agent to an `OPEN` task and publishes a `TASK_ACCEPTED` event to HCS. ' +
      'The task status moves to `ACCEPTED`.',
  })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkTypedResponse(TaskDto)
  @ApiBadRequestResponse({ description: 'Task is not OPEN' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  accept(
    @Param('id') id: string,
    @Body() dto: AcceptTaskDto,
  ): Promise<TaskDto> {
    return this.tasksService.accept(id, dto) as Promise<TaskDto>;
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete a task',
    description:
      'Marks an `ACCEPTED` task as `COMPLETED`, transfers the `budget_hbar` from the operator ' +
      'account to the agent via Hedera, and publishes a `TASK_COMPLETED` event to HCS. ' +
      'The Hedera transaction ID is stored in `payment_tx_id`.',
  })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkTypedResponse(TaskDto)
  @ApiBadRequestResponse({
    description: 'Task is not ACCEPTED or has no assigned agent',
  })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  complete(@Param('id') id: string): Promise<TaskDto> {
    return this.tasksService.complete(id) as Promise<TaskDto>;
  }
}
