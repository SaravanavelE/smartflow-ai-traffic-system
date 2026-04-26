import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Genkit reads GOOGLE_GENAI_API_KEY automatically.
// We also support GEMINI_API_KEY as an alias (common naming).
if (!process.env.GOOGLE_GENAI_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_GENAI_API_KEY = process.env.GEMINI_API_KEY;
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash', // stable, fast, generous free tier
});
