import { Controller, Get, Post, Body } from '@nestjs/common';
import { EvalService } from './eval.service';
import { response } from 'express';

@Controller('eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Get()
  getEval() {
    return 'Eval Controller';
  }

  @Post()
  async chat(@Body('message') message: string) {
    const messages = [{ role: 'user' as const, content: message }];
    const response = await this.evalService.chat(messages);

    return response;
  }

  @Post('with-rubric')
  async evalWithRubric(
    @Body()
    body: {
      data: Record<string, any>;
      chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
      agentAnswer: string;
    },
  ): Promise<string> {
    const { data, chatHistory, agentAnswer } = body;
    return await this.evalService.evalWithRubric(data, chatHistory, agentAnswer);
  }

  @Post('with-ideal')
  async evalWithIdeal(
    @Body()
    body: {
      chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
      agentAnswer: string;
      idealAnswer: string;
    },
  ): Promise<string> {
    const { chatHistory, agentAnswer, idealAnswer } = body;
    return await this.evalService.evalWithIdeal(
      chatHistory,
      agentAnswer,
      idealAnswer,
    );
  }
}
