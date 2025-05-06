
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!googleApiKey) {
  console.error(
    'ERROR: GOOGLE_GENAI_API_KEY is not set in the environment variables. AI features will not work.'
  );
  // For a production environment, you might want to throw an error to prevent startup
  // or to make the issue more immediately obvious in logs.
  // throw new Error("Configuration error: GOOGLE_GENAI_API_KEY is not set.");
}

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: googleApiKey, // Use the validated or potentially undefined key
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
