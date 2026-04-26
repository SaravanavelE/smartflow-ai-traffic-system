'use server';
/**
 * @fileOverview This file implements a Genkit flow for predicting traffic congestion along a user's route.
 *
 * - predictCongestion - A function that handles the predictive congestion alerting process.
 * - PredictiveCongestionInput - The input type for the predictCongestion function.
 * - PredictiveCongestionOutput - The return type for the predictCongestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const PredictiveCongestionInputSchema = z.object({
  currentLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .describe('The current geographic coordinates of the user.'),
  destinationLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .describe("The geographic coordinates of the user's destination."),
  routePolyline: z
    .string()
    .describe('An encoded polyline string representing the planned route.'),
  currentTime: z
    .string()
    .describe(
      'The current time, in a readable format (e.g., "YYYY-MM-DD HH:MM:SS").'
    ),
});
export type PredictiveCongestionInput = z.infer<
  typeof PredictiveCongestionInputSchema
>;

// Output Schema
const CongestionAlertSchema = z.object({
  locationDescription: z
    .string()
    .describe('A descriptive name or segment of the route where congestion is predicted.'),
  congestionLevel: z
    .enum(['low', 'medium', 'high', 'severe'])
    .describe('The predicted level of traffic congestion.'),
  predictedCause: z
    .string()
    .describe(
      'A brief explanation of the predicted cause of the congestion (e.g., "school dismissal", "accident", "construction").'
    ),
  etaImpact: z
    .string()
    .describe(
      'The estimated impact on ETA due to this congestion (e.g., "adds 15 minutes to ETA").'
    ),
});

const PredictiveCongestionOutputSchema = z.object({
  alerts: z
    .array(CongestionAlertSchema)
    .describe('A list of predicted congestion alerts along the route.'),
  overallRouteCongestion: z
    .enum(['low', 'medium', 'high', 'severe'])
    .describe('The overall predicted congestion level for the entire route.'),
  overallEtaImpact: z
    .string()
    .describe('The overall estimated impact on ETA for the entire route due to all predicted congestion.'),
});
export type PredictiveCongestionOutput = z.infer<
  typeof PredictiveCongestionOutputSchema
>;

export async function predictCongestion(
  input: PredictiveCongestionInput
): Promise<PredictiveCongestionOutput> {
  return predictiveCongestionFlow(input);
}

const predictiveCongestionPrompt = ai.definePrompt({
  name: 'predictiveCongestionPrompt',
  input: {schema: PredictiveCongestionInputSchema},
  output: {schema: PredictiveCongestionOutputSchema},
  prompt: `You are an AI traffic prediction system. Your goal is to analyze a given route and predict potential traffic congestion, along with the likely causes and their impact on estimated travel time.\n\nBased on the following route details, provide a list of congestion alerts. If no significant congestion is predicted, return an empty array for 'alerts' and 'low' for 'overallRouteCongestion' with 'no significant impact' for 'overallEtaImpact'.\n\nCurrent Location: Latitude {{{currentLocation.latitude}}}, Longitude {{{currentLocation.longitude}}}\nDestination: Latitude {{{destinationLocation.latitude}}}, Longitude {{{destinationLocation.longitude}}}\nRoute Polyline (encoded): {{{routePolyline}}}\nCurrent Time: {{{currentTime}}}\n\nConsider historical traffic patterns, known events (like school timings, major events), and general road conditions when making predictions.\nFocus on providing actionable insights that help the driver make informed decisions.\n`,
});

const predictiveCongestionFlow = ai.defineFlow(
  {
    name: 'predictiveCongestionFlow',
    inputSchema: PredictiveCongestionInputSchema,
    outputSchema: PredictiveCongestionOutputSchema,
  },
  async input => {
    try {
      const {output} = await predictiveCongestionPrompt(input);
      if (!output) throw new Error('Failed to get output from predictiveCongestionPrompt');
      return output;
    } catch (error) {
      return {
        alerts: [],
        overallRouteCongestion: 'low',
        overallEtaImpact: 'no significant impact'
      };
    }
  }
);
