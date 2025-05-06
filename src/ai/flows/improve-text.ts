'use server';
/**
 * @fileOverview A text improving AI agent.
 *
 * - improveText - A function that handles the text improving process.
 * - ImproveTextInput - The input type for the improveText function.
 * - ImproveTextOutput - The return type for the improveText function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ImproveTextInputSchema = z.object({
  text: z.string().describe('The text to improve.'),
  temperature: z.number().min(0).max(1).optional().default(0.5).describe('Controls randomness. 0.0 is deterministic, 1.0 is highly creative for improvements.'),
  maxTokens: z.number().int().min(1).optional().default(250).describe('Maximum number of tokens (roughly, words) in the improved text.'),
  topP: z.number().min(0).max(1).optional().default(0.9).describe('Controls diversity via nucleus sampling for improvements. (e.g., 0.9)'),
});
export type ImproveTextInput = z.infer<typeof ImproveTextInputSchema>;

const ImproveTextOutputSchema = z.object({
  improvedText: z.string().describe('The improved text.'),
});
export type ImproveTextOutput = z.infer<typeof ImproveTextOutputSchema>;

export async function improveText(input: ImproveTextInput): Promise<ImproveTextOutput> {
  return improveTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveTextPrompt',
  input: { // This schema is only for what's directly used in the handlebars template
    schema: z.object({
      text: z.string().describe('The text to improve.'),
    }),
  },
  output: {
    schema: z.object({
      improvedText: z.string().describe('The improved text.'),
    }),
  },
  prompt: `Improve the following text. Make it clearer, more concise, and engaging:\n\n{{{text}}}`,
});

const improveTextFlow = ai.defineFlow<
  typeof ImproveTextInputSchema,
  typeof ImproveTextOutputSchema
>(
  {
    name: 'improveTextFlow',
    inputSchema: ImproveTextInputSchema,
    outputSchema: ImproveTextOutputSchema,
  },
  async input => { // input type is z.infer<typeof ImproveTextInputSchema>
    const {output} = await prompt(
        {text: input.text}, // Pass only the text to the handlebars template
        { 
          temperature: input.temperature,
          maxOutputTokens: input.maxTokens,
          topP: input.topP,
        }
    );
    return output!;
  }
);
