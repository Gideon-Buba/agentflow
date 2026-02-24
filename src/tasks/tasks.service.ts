import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { HederaService } from '../hedera/hedera.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AcceptTaskDto } from './dto/accept-task.dto';

export type TaskStatus = 'OPEN' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string;
  budget_hbar: number;
  status: TaskStatus;
  creator_id: string;
  agent_id: string | null;
  hcs_sequence_number: number | null;
  payment_tx_id: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly hedera: HederaService,
  ) {}

  async create(dto: CreateTaskDto): Promise<Task> {
    // 1. Persist to Supabase first so we have an ID for the HCS payload
    const insertResponse = await this.supabase.client
      .from('tasks')
      .insert({
        title: dto.title,
        description: dto.description,
        budget_hbar: dto.budgetHbar,
        creator_id: dto.creatorId,
        status: 'OPEN',
      })
      .select()
      .single();

    if (insertResponse.error) throw new Error(insertResponse.error.message);
    const task = insertResponse.data as Task;

    // 2. Publish TASK_POSTED event to HCS (best-effort — don't fail the request)
    try {
      const seqNum = await this.hedera.postTaskEvent('TASK_POSTED', {
        taskId: task.id,
        title: task.title,
        budgetHbar: task.budget_hbar,
        creatorId: task.creator_id,
      });

      // 3. Store the HCS sequence number back on the record
      await this.supabase.client
        .from('tasks')
        .update({ hcs_sequence_number: seqNum })
        .eq('id', task.id);

      task.hcs_sequence_number = seqNum;
    } catch (err) {
      this.logger.warn(
        `Task ${task.id} created but HCS publish failed: ${(err as Error).message}`,
      );
    }

    this.logger.log(`Task created: ${task.id} — "${task.title}"`);
    return task;
  }

  async findAll(status?: TaskStatus): Promise<Task[]> {
    let query = this.supabase.client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const listResponse = await query;
    if (listResponse.error) throw new Error(listResponse.error.message);
    return (listResponse.data ?? []) as Task[];
  }

  async findOne(id: string): Promise<Task> {
    const findResponse = await this.supabase.client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (findResponse.error || !findResponse.data) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return findResponse.data as Task;
  }

  async accept(id: string, dto: AcceptTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status !== 'OPEN') {
      throw new BadRequestException(
        `Task is ${task.status} and cannot be accepted`,
      );
    }

    const acceptResponse = await this.supabase.client
      .from('tasks')
      .update({ status: 'ACCEPTED', agent_id: dto.agentId })
      .eq('id', id)
      .select()
      .single();

    if (acceptResponse.error) throw new Error(acceptResponse.error.message);
    const updated = acceptResponse.data as Task;

    try {
      await this.hedera.postTaskEvent('TASK_ACCEPTED', {
        taskId: id,
        agentId: dto.agentId,
      });
    } catch (err) {
      this.logger.warn(
        `Task ${id} accepted but HCS publish failed: ${(err as Error).message}`,
      );
    }

    this.logger.log(`Task ${id} accepted by agent ${dto.agentId}`);
    return updated;
  }

  async complete(id: string): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Task is ${task.status} — only ACCEPTED tasks can be completed`,
      );
    }

    if (!task.agent_id) {
      throw new BadRequestException('Task has no assigned agent to pay');
    }

    // 1. Transfer HBAR from operator to agent
    let paymentTxId: string | null = null;
    try {
      paymentTxId = await this.hedera.transferHbar(
        task.agent_id,
        task.budget_hbar,
      );
    } catch (err) {
      this.logger.warn(
        `Task ${id} — HBAR payment failed: ${(err as Error).message}`,
      );
    }

    // 2. Mark completed in Supabase
    const completeResponse = await this.supabase.client
      .from('tasks')
      .update({ status: 'COMPLETED', payment_tx_id: paymentTxId })
      .eq('id', id)
      .select()
      .single();

    if (completeResponse.error) throw new Error(completeResponse.error.message);
    const completed = completeResponse.data as Task;

    // 3. Publish TASK_COMPLETED to HCS
    try {
      await this.hedera.postTaskEvent('TASK_COMPLETED', {
        taskId: id,
        agentId: task.agent_id,
        budgetHbar: task.budget_hbar,
        paymentTxId,
      });
    } catch (err) {
      this.logger.warn(
        `Task ${id} completed but HCS publish failed: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `Task ${id} completed — paid ${task.budget_hbar} HBAR to ${task.agent_id}`,
    );
    return completed;
  }
}
