import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { EvalService } from './eval.service';

@Controller()
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @GrpcMethod('EvalService', 'EvalWithRubric')
  async evalWithRubric(body: {
    data: Record<string, string>;
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
    agentAnswer: string;
  }): Promise<{ metrices: { metric: string; score: number; reason: string }[] }> {
    const { data, chatHistory, agentAnswer } = body;
    return await this.evalService.evalWithRubric(data, chatHistory, agentAnswer);
  }

  @GrpcMethod('EvalService', 'EvalWithIdeal')
  async evalWithIdeal(body: {
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
    agentAnswer: string;
    idealAnswer: string;
  }): Promise<{ cases: { caseName: string; score: number; reason: string }[] }> {
    const { chatHistory, agentAnswer, idealAnswer } = body;
    return await this.evalService.evalWithIdeal(chatHistory, agentAnswer, idealAnswer);
  }
}
