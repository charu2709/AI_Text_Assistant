// src/ai/flows/generate-initial-text.ts
'use server';

/**
 * @fileOverview Text generation flow.
 *
 * - generateInitialText - A function that generates initial text based on a prompt and other parameters.
 * - GenerateInitialTextInput - The input type for the generateInitialText function.
 * - GenerateInitialTextOutput - The return type for the generateInitialText function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateInitialTextInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate text from.'),
  temperature: z.number().min(0).max(1).optional().default(0.7).describe('Controls randomness. 0.0 is deterministic, 1.0 is highly creative.'),
  maxTokens: z.number().int().min(1).optional().default(250).describe('Maximum number of tokens (roughly, words) in the generated text.'),
  topP: z.number().min(0).max(1).optional().default(0.9).describe('Controls diversity via nucleus sampling. 0.1 means only tokens comprising the top 10% probability mass are considered. (e.g., 0.9)'),
  presencePenalty: z.number().min(-2.0).max(2.0).optional().default(0.0).describe('Positive values encourage new topics. Ranges from -2.0 to 2.0. (Influenced by prompt instructions)'),
  frequencyPenalty: z.number().min(-2.0).max(2.0).optional().default(0.0).describe('Positive values penalize repeated words/phrases. Ranges from -2.0 to 2.0. (Influenced by prompt instructions)'),
  seed: z.number().int().optional().describe('Seed for random number generation, for reproducible results.'),
});
export type GenerateInitialTextInput = z.infer<
  typeof GenerateInitialTextInputSchema
>;

const GenerateInitialTextOutputSchema = z.object({
  generatedText: z.string().describe('The generated text.'),
});
export type GenerateInitialTextOutput = z.infer<
  typeof GenerateInitialTextOutputSchema
>;

export async function generateInitialText(
  input: GenerateInitialTextInput
): Promise<GenerateInitialTextOutput> {
  return generateInitialTextFlow(input);
}

// This prompt definition's input schema only includes what's directly used in the handlebars template
const generateInitialTextPrompt = ai.definePrompt({
  name: 'generateInitialTextPrompt',
  input: {
    schema: z.object({
      prompt: z.string().describe('The prompt to generate text from.'),
      presencePenaltyPositive: z.boolean().describe('Instruction to encourage new topics.'),
      presencePenaltyNegative: z.boolean().describe('Instruction to stick to existing topics.'),
      frequencyPenaltyPositive: z.boolean().describe('Instruction to avoid repetition.'),
      frequencyPenaltyNegative: z.boolean().describe('Instruction to allow natural repetition.'),
    }),
  },
  output: {
    schema: z.object({
      generatedText: z.string().describe('The generated text.'),
    }),
  },
  prompt: `Generate text based on the following prompt:

{{prompt}}

{{#if presencePenaltyPositive}}
Strive to introduce new and diverse topics or concepts in your response.
{{/if}}
{{#if presencePenaltyNegative}}
Focus on elaborating on the topics and concepts already present in the prompt or conversation.
{{/if}}

{{#if frequencyPenaltyPositive}}
Make an effort to avoid repeating the same phrases or words unnecessarily.
{{/if}}
{{#if frequencyPenaltyNegative}}
You may repeat phrases or words if it enhances emphasis or flows naturally with the context.
{{/if}}
`,
});

const generateInitialTextFlow = ai.defineFlow<
  typeof GenerateInitialTextInputSchema,
  typeof GenerateInitialTextOutputSchema
>(
  {
    name: 'generateInitialTextFlow',
    inputSchema: GenerateInitialTextInputSchema,
    outputSchema: GenerateInitialTextOutputSchema,
  },
  async input => {
    const promptInput = {
      prompt: input.prompt,
      presencePenaltyPositive: input.presencePenalty > 0,
      presencePenaltyNegative: input.presencePenalty < 0,
      frequencyPenaltyPositive: input.frequencyPenalty > 0,
      frequencyPenaltyNegative: input.frequencyPenalty < 0,
    };

    const config: Record<string, any> = { 
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens,
        topP: input.topP,
      };

    if (input.seed !== undefined) {
      config.seed = input.seed;
    }

    const {output} = await generateInitialTextPrompt(
      promptInput,
      config
    );
    return output!;
  }
);
