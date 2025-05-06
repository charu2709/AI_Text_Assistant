// SummarizeText flow implementation
'use server';

/**
 * @fileOverview Summarizes text provided by the user.
 *
 * - summarizeText - A function that summarizes text.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeTextInputSchema = z.object({
  text: z.string().describe('The text to summarize.'),
  temperature: z.number().min(0).max(1).optional().default(0.7).describe('Controls randomness. 0.0 is deterministic, 1.0 is more creative/abstract for summarization.'),
  maxTokens: z.number().int().min(1).optional().default(150).describe('Maximum number of tokens (roughly, words) in the generated summary.'),
  topP: z.number().min(0).max(1).optional().default(0.9).describe('Controls diversity via nucleus sampling for the summary. (e.g., 0.9)'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('The summarized text.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const summarizeTextPrompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {
    schema: z.object({ // This schema is only for what's directly used in the handlebars template
      text: z.string().describe('The text to summarize.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('The summarized text.'),
    }),
  },
  prompt: `Summarize the following text concisely:\n\n{{{text}}}`,
});

const summarizeTextFlow = ai.defineFlow<
  typeof SummarizeTextInputSchema,
  typeof SummarizeTextOutputSchema
>({
  name: 'summarizeTextFlow',
  inputSchema: SummarizeTextInputSchema,
  outputSchema: SummarizeTextOutputSchema,
},
async input => { // input type is z.infer<typeof SummarizeTextInputSchema>
  const {output} = await summarizeTextPrompt(
    { text: input.text }, // Pass only the text to the handlebars template
    { 
      temperature: input.temperature,
      maxOutputTokens: input.maxTokens,
      topP: input.topP,
    }
  );
  return output!;
});
