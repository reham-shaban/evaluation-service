import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class EvalService {
  private configService: ConfigService;

  // Constants for long strings
  private readonly apiKey;
  private readonly systemMessage1: string;
  private readonly evaluationMessageTemplate1: string;
  private readonly systemMessage2: string;
  private readonly evaluationMessageTemplate2: string;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.apiKey = this.configService.get<string>('MY_OPENAI_API_KEY');

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
The output should be in JSON format
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

  /**
   * A generic chat method using LangChain's OpenAI chat model.
   * This method instantiates a new ChatOpenAI with the provided parameters.
   */

  async chat(
    messages: { role: string; content: string }[],
    model: string = 'gpt-4o-mini',
    temperature: number = 0,
    maxTokens: number = 4096,
    schema?: any,
  ): Promise<object> {
    try {
      // Create a new ChatOpenAI instance with dynamic parameters
      const myModel = new ChatOpenAI({
        modelName: model,
        temperature,
        maxTokens,
        apiKey: this.apiKey,
      });

      const modelWithStructure = myModel.withStructuredOutput(schema);

      // Convert plain messages to LangChain message classes
      const formattedMessages = messages.map((msg) => {
        return msg.role === 'system'
          ? new SystemMessage(msg.content)
          : new HumanMessage(msg.content);
      });

      // Call the chat model
      const response = await modelWithStructure.invoke(formattedMessages);
      console.log('\nFrom Chat: \nresponse: ', response, '\n\n');
      return response;
    } catch (error) {
      console.error(
        'Error occurred while calling OpenAI API via LangChain:',
        error,
      );
      return { 'Chat error': error };
    }
  }

  async evalWithRubric(
    data: Record<string, string>,
    chatHistory: { role: string; content: string }[],
    agentAnswer: string,
  ): Promise<object> {
    const delimiter = '####';

    // Prepare the user message by replacing placeholders in the evaluation template
    const userMessage = this.evaluationMessageTemplate1
      .replace(/{delimiter}/g, delimiter)
      .replace(/{chatHistory}/g, JSON.stringify(chatHistory))
      .replace(/{context}/g, JSON.stringify(data))
      .replace(/{agentAnswer}/g, agentAnswer);

    const messages = [
      { role: 'system', content: this.systemMessage1 },
      { role: 'user', content: userMessage },
    ];

    const schema = {
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
                reason: { type: 'string' },
              },
              required: ['metric', 'score', 'reason'],
            },
          },
        },
        required: ['metrices'],
      },
    };

    try {
      const response = await this.chat(messages, undefined, 0, 4096, schema);
      console.log('Raw response:', response); // Debugging log
      // const parsedResponse = JSON.parse(response);
      return response;
    } catch (error) {
      console.error('Error occurred during rubric evaluation:', error);
      return { 'Rubric error': error };
    }
  }

  async evalWithIdeal(
    chatHistory: { role: string; content: string }[],
    agentAnswer: string,
    idealAnswer: string,
  ): Promise<object> {
    const delimiter = '####';

    // Prepare the user message by replacing placeholders in the evaluation template
    const userMessage = this.evaluationMessageTemplate2
      .replace(/{delimiter}/g, delimiter)
      .replace(/{chatHistory}/g, JSON.stringify(chatHistory))
      .replace(/{idealAnswer}/g, idealAnswer)
      .replace(/{agentAnswer}/g, agentAnswer);

    const messages = [
      { role: 'system', content: this.systemMessage2 },
      { role: 'user', content: userMessage },
    ];

    // Define response format
    const schema = {
      type: 'json_object',
      schema: {
        type: 'object',
        properties: {
          cases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                case: { type: 'string' },
                score: { type: 'integer' },
                reason: { type: 'string' },
              },
              required: ['case', 'score', 'reason'],
            },
          },
        },
        required: ['cases'],
      },
    };

    try {
      const response = await this.chat(messages, undefined, 0, 4096, schema);
      // return JSON.parse(response);
      return response;
    } catch (error) {
      console.error('Error occurred during ideal evaluation:', error);
      return { 'Ideal error': error };
    }
  }
}
