'use server';
/**
 * @fileOverview A Genkit flow for confirming emergency corridor activation.
 *
 * - emergencyCorridorConfirmation - A function that handles the confirmation of emergency corridor activation.
 * - EmergencyCorridorConfirmationInput - The input type for the emergencyCorridorConfirmation function.
 * - EmergencyCorridorConfirmationOutput - The return type for the emergencyCorridorConfirmation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmergencyCorridorConfirmationInputSchema = z.object({
  emergencyModeActive: z
    .boolean()
    .describe('Indicates if emergency mode is active.'),
  currentLocation: z
    .string()
    .describe(
      'The current location of the emergency vehicle, e.g., "123 Main St".'
    ),
  destination: z
    .string()
    .describe('The destination of the emergency vehicle, e.g., "City Hospital".'),
  routeId: z
    .string()
    .describe('A unique identifier for the active emergency route.'),
});
export type EmergencyCorridorConfirmationInput = z.infer<
  typeof EmergencyCorridorConfirmationInputSchema
>;

const EmergencyCorridorConfirmationOutputSchema = z.object({
  confirmationMessage: z
    .string()
    .describe(
      'A clear confirmation message that a green corridor has been activated, explaining the expected impact on traffic signals ahead.'
    ),
});
export type EmergencyCorridorConfirmationOutput = z.infer<
  typeof EmergencyCorridorConfirmationOutputSchema
>;

export async function emergencyCorridorConfirmation(
  input: EmergencyCorridorConfirmationInput
): Promise<EmergencyCorridorConfirmationOutput> {
  return emergencyCorridorConfirmationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'emergencyCorridorConfirmationPrompt',
  input: {schema: EmergencyCorridorConfirmationInputSchema},
  output: {schema: EmergencyCorridorConfirmationOutputSchema},
  prompt: `You are an AI assistant for the SmartFlow emergency traffic management system.
Your task is to generate a concise, clear, and reassuring confirmation message for an emergency vehicle driver upon activation of 'Emergency Mode' and a 'green corridor'.

The message should:
1. Confirm that a green corridor has been activated.
2. Explain the expected impact on traffic signals ahead along the route.
3. Be professional and supportive.

Current Location: {{{currentLocation}}}
Destination: {{{destination}}}
Route ID: {{{routeId}}}

Example of expected output:
"Emergency green corridor activated for your route to City Hospital! All traffic signals ahead on Route ID 12345 will be dynamically controlled to green as you approach, ensuring a clear and uninterrupted path. Drive safely!"
`,
});

const emergencyCorridorConfirmationFlow = ai.defineFlow(
  {
    name: 'emergencyCorridorConfirmationFlow',
    inputSchema: EmergencyCorridorConfirmationInputSchema,
    outputSchema: EmergencyCorridorConfirmationOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) throw new Error('No output from AI prompt');
      return output;
    } catch (error) {
      return {
        confirmationMessage: `Emergency green corridor activated for your route to ${input.destination}! All traffic signals ahead on Route ID ${input.routeId} will be dynamically controlled to green as you approach, ensuring a clear and uninterrupted path. Drive safely!`
      };
    }
  }
);
