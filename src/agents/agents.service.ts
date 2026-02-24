import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { tavily, TavilyClient } from '@tavily/core';
import { SupabaseService } from '../supabase/supabase.service';
import { TasksService, Task } from '../tasks/tasks.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { RunAgentDto } from './dto/run-agent.dto';

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  hedera_account_id: string;
  model: string;
  status: 'IDLE' | 'BUSY';
  tasks_completed: number;
  created_at: string;
  updated_at: string;
}

export interface AgentRunResult {
  agent: Agent;
  task: Task;
  result: string;
  toolCallsCount: number;
}

const SYSTEM_PROMPT = `You are an autonomous AI agent operating in the AgentFlow marketplace — \
a Hedera blockchain-based task platform where agents are paid in HBAR for completing tasks.

Your goal is to complete the assigned task thoroughly and accurately.
You have access to a web_search tool to look up current information from the web.

Guidelines:
- Search for relevant, up-to-date information before forming your answer
- Make multiple targeted searches if the task requires it
- Be thorough but concise in your final response
- Structure your output clearly (use bullet points, sections, or numbered lists where appropriate)
- Once you have gathered sufficient information, provide your final answer without calling any more tools`;

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly openai: OpenAI;
  private readonly tavily: TavilyClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly tasksService: TasksService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.tavily = tavily({
      apiKey: this.configService.getOrThrow<string>('TAVILY_API_KEY'),
    });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(dto: CreateAgentDto): Promise<Agent> {
    const createResponse = await this.supabase.client
      .from('agents')
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        hedera_account_id: dto.hederaAccountId,
        model: dto.model ?? 'gpt-4o',
        status: 'IDLE',
        tasks_completed: 0,
      })
      .select()
      .single();

    if (createResponse.error) throw new Error(createResponse.error.message);
    const agent = createResponse.data as Agent;
    this.logger.log(`Agent registered: ${agent.id} — "${dto.name}"`);
    return agent;
  }

  async findAll(): Promise<Agent[]> {
    const listResponse = await this.supabase.client
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (listResponse.error) throw new Error(listResponse.error.message);
    return (listResponse.data ?? []) as Agent[];
  }

  async findOne(id: string): Promise<Agent> {
    const findResponse = await this.supabase.client
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (findResponse.error || !findResponse.data) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    return findResponse.data as Agent;
  }

  // ─── Agent execution ─────────────────────────────────────────────────────────

  async run(id: string, dto: RunAgentDto): Promise<AgentRunResult> {
    const agent = await this.findOne(id);

    if (agent.status === 'BUSY') {
      throw new BadRequestException(
        `Agent "${agent.name}" is already executing a task`,
      );
    }

    const task = await this.tasksService.findOne(dto.taskId);

    if (task.status !== 'OPEN') {
      throw new BadRequestException(
        `Task is ${task.status} — only OPEN tasks can be assigned`,
      );
    }

    // Accept the task on behalf of the agent
    await this.tasksService.accept(task.id, {
      agentId: agent.hedera_account_id,
    });

    // Mark agent busy
    await this.setAgentStatus(agent.id, 'BUSY');
    this.logger.log(
      `Agent "${agent.name}" starting task "${task.title}" (${task.id})`,
    );

    let result: string;
    let toolCallsCount: number;

    try {
      ({ result, toolCallsCount } = await this.runAgentLoop(agent, task));
    } catch (err) {
      // Restore agent to IDLE on failure so it can be re-used
      await this.setAgentStatus(agent.id, 'IDLE');
      throw err;
    }

    // Complete the task (HBAR payment + HCS event)
    const completedTask = await this.tasksService.complete(task.id);

    // Update agent: IDLE + increment tasks_completed
    const updateResponse = await this.supabase.client
      .from('agents')
      .update({
        status: 'IDLE',
        tasks_completed: agent.tasks_completed + 1,
      })
      .eq('id', agent.id)
      .select()
      .single();

    this.logger.log(
      `Agent "${agent.name}" completed task "${task.title}" with ${toolCallsCount} tool call(s)`,
    );

    return {
      agent: (updateResponse.data as Agent) ?? agent,
      task: completedTask,
      result,
      toolCallsCount,
    };
  }

  // ─── OpenAI tool-call loop ────────────────────────────────────────────────────

  private async runAgentLoop(
    agent: Agent,
    task: Task,
  ): Promise<{ result: string; toolCallsCount: number }> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Task title: ${task.title}\n\nTask description:\n${task.description}`,
      },
    ];

    const tools: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description:
            'Search the web for up-to-date information. Use targeted queries for best results.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    let toolCallsCount = 0;

    while (true) {
      const response = await this.openai.chat.completions.create({
        model: agent.model,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;
      messages.push(message);

      // No tool calls → model has produced its final answer
      if (!message.tool_calls || message.tool_calls.length === 0) {
        return { result: message.content ?? '', toolCallsCount };
      }

      // Execute each tool call and feed results back
      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const args = JSON.parse(toolCall.function.arguments) as {
          query: string;
        };

        this.logger.debug(`Agent "${agent.name}" searching: "${args.query}"`);

        const searchContent = await this.webSearch(args.query);
        toolCallsCount++;

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: searchContent,
        });
      }
    }
  }

  private async webSearch(query: string): Promise<string> {
    const response = await this.tavily.search(query, {
      maxResults: 5,
      searchDepth: 'basic',
    });

    if (!response.results.length) return 'No results found.';

    return response.results
      .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
      .join('\n\n---\n\n');
  }

  private async setAgentStatus(
    id: string,
    status: 'IDLE' | 'BUSY',
  ): Promise<void> {
    await this.supabase.client.from('agents').update({ status }).eq('id', id);
  }
}
