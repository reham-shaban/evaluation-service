import { Injectable } from '@nestjs/common';
import { CohereClientV2 } from 'cohere-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvalService {
  private cohere: CohereClientV2;

  // Constants for long strings
  private readonly systemMessage1: string;
  private readonly evaluationMessageTemplate1: string;
  private readonly systemMessage2: string;
  private readonly evaluationMessageTemplate2: string;

  constructor(private configService: ConfigService) {
    this.cohere = new CohereClientV2({
      token: this.configService.get<string>('COHERE_API_KEY'),
    });

    // Initialize the message templates for eval with rubric
    this.systemMessage1 = `
    You are an assistant that evaluates how well the customer service agent answers a user question by analyzing the context used to generate its response.

You will be provided with the chat history, the context and the submitted answer each delimited with '####' characters.
Compare the factual content of the submitted answer with the context. Ignore any differences in style, grammar, or punctuation.

Score the answer on a scale of 0-10 for each of the following metrics, and provide the reason for each score:
- Sufficiently answers the user question
- Is based on the provided context
- Contains additional information that is not present in the context
- Answers all user questions

    `;

    this.evaluationMessageTemplate1 = `
    Chat history: {delimiter}{chatHistory}{delimiter}
Context: {delimiter}{context}{delimiter}
Submitted answer: {delimiter}{agentAnswer}{delimiter}
   `;

    // Initialize the message templates for eval vs ideal
    this.systemMessage2 = `
   You are an assistant that evaluates how well the customer service agent's answer compares to the ideal (expert) answer.

You will be provided with the chat history, the ideal answer and the submitted answer each delimited with '####' characters.
Compare the factual content of the submitted answer with the ideal answer.
Ignore any differences in style, grammar, or punctuation.

Evaluate the following cases, for each case assign a score between 0-10 and provide a reason:
- The submitted answer is a subset of the ideal answer and is fully consistent with it.
- The submitted answer is a superset of the ideal answer and is fully consistent with it.
- The submitted answer contains all the same details as the ideal answer.
- There is a disagreement between the submitted answer and the ideal answer.
- The answers differ, but these differences don't matter from the perspective of factuality.

You must include evaluations for all the cases listed.
    `;

    this.evaluationMessageTemplate2 = `
   Chat history: {delimiter}{chatHistory}{delimiter}
Ideal answer: {delimiter}{idealAnswer}{delimiter}
Submitted answer: {delimiter}{agentAnswer}{delimiter}
    `;
  }

  async chat(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    model: string = 'command-r-plus-08-2024',
    temperature: number = 0,
    maxTokens: number = 4096,
    responseFormat?: any,
  ) {
    try {
      const response = await this.cohere.chat({
        model,
        messages,
        temperature,
        maxTokens,
        responseFormat,
      });

      return response?.message?.content?.[0]?.text ?? 'No response received';
    } catch (error) {
      console.error('Error occurred while calling Cohere API:', error);
      return 'An error occurred while processing the request.' + error;
    }
  }
  
  async evalWithRubric(
    data: Record<string, any>, // Accepting the data as an object
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[], // Taking messages history
    agentAnswer: string
  ): Promise<string> {
    const delimiter = '####';
  
    // Prepare the user message by replacing placeholders
    const userMessage = this.evaluationMessageTemplate1
      .replace(/{delimiter}/g, delimiter)
      .replace(/{chatHistory}/g, JSON.stringify(chatHistory))
      .replace(/{context}/g, JSON.stringify(data))
      .replace(/{agentAnswer}/g, agentAnswer);
  
    const messages = [
      { role: 'system' as const, content: this.systemMessage1 },
      { role: 'user' as const, content: userMessage },
    ];
  
    // Define the JSON schema for the response format
    const response_format = {
      type: 'json_object',
      schema: {
        type: 'object',
        properties: {
          metrices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric: { type: 'string' },
                score: { type: 'integer' },
                reason: { type: 'string' }
              },
              required: ['metric', 'score', 'reason']
            }
          }
        },
        required: ['metrices']
      }
    };
  
    try {
      // Use the injected chat service to send the messages with response format
      const response = await this.chat(messages, undefined, 0, 4096, response_format);
      return response;
    } catch (error) {
      console.error('Error occurred while processing evaluation:', error);
      return 'Error occurred during evaluation';
    }
  }

  
  // Second evaluation method
async evalWithIdeal(
  messagesHistory: { role: 'user' | 'assistant' | 'system'; content: string }[], // Taking messages history
  agentAnswer: string,
  idealAnswer: string,
): Promise<string> {
  const delimiter = '####';

  // Prepare the user message by replacing placeholders
  const userMessage = this.evaluationMessageTemplate2
    .replace(/{delimiter}/g, delimiter)
    .replace(/{messagesHistory}/g, JSON.stringify(messagesHistory)) // Use messages history instead of question
    .replace(/{idealAnswer}/g, idealAnswer)
    .replace(/{agentAnswer}/g, agentAnswer);

  const messages = [
    { role: 'system' as const, content: this.systemMessage2 },
    { role: 'user' as const, content: userMessage },
  ];

  // Define response format
  const responseFormat = {
    type: "json_object",
    schema: {
      type: "object",
      properties: {
        cases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              case: { type: "string" },
              score: { type: "integer" },
              reason: { type: "string" }
            },
            required: ["case", "score", "reason"]
          }
        }
      },
      required: ["cases"]
    }
  };

  // Use the injected chat service to send the messages with response format
  return await this.chat(messages, undefined, undefined, undefined, responseFormat);
}

}
