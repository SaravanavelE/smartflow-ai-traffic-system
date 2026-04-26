'use server';
/**
 * @fileOverview This file implements a Genkit flow for traffic optimization.
 * It analyzes real-time traffic conditions and a given route to provide
 * an optimized route, congestion level, and speed recommendations for
 * efficient driving.
 *
 * - trafficOptimizationInsights - A function that orchestrates the traffic optimization process.
 * - TrafficOptimizationInput - The input type for the trafficOptimizationInsights function.
 * - TrafficOptimizationOutput - The return type for the trafficOptimizationInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const TrafficOptimizationInputSchema = z.object({
  currentLocation: z.object({
    latitude: z.number().describe('The current latitude of the vehicle.'),
    longitude: z.number().describe('The current longitude of the vehicle.'),
  }).describe('The current geographical coordinates of the vehicle.'),
  currentRoutePolyline: z.string().describe('The current planned route as an encoded polyline string.'),
  destinationLocation: z.object({
    latitude: z.number().describe('The latitude of the final destination.'),
    longitude: z.number().describe('The longitude of the final destination.'),
  }).describe('The geographical coordinates of the final destination.'),
  simulatedTrafficConditions: z.string().optional().describe('Simulated real-time traffic conditions for the route (e.g., "Heavy traffic near X, moderate near Y").'),
  simulatedSignalTiming: z.string().optional().describe('Simulated upcoming traffic signal timings (e.g., "Next signal at 100m, currently red, 30s remaining").'),
});
export type TrafficOptimizationInput = z.infer<typeof TrafficOptimizationInputSchema>;

// Output Schema
const TrafficOptimizationOutputSchema = z.object({
  congestionLevel: z.enum(['Low', 'Medium', 'High', 'Severe']).describe('The current level of traffic congestion on the route.'),
  optimizedRoutePolyline: z.string().describe('An optimized route as an encoded polyline string. If no better route is found, return the current route.'),
  suggestedSpeedInstruction: z.string().describe('A precise speed recommendation, e.g., "Drive at 42 km/h to catch green signal", based on traffic conditions and signal timing.'),
});
export type TrafficOptimizationOutput = z.infer<typeof TrafficOptimizationOutputSchema>;

// Wrapper function
export async function trafficOptimizationInsights(input: TrafficOptimizationInput): Promise<TrafficOptimizationOutput> {
  return trafficOptimizationFlow(input);
}

// Prompt definition
const trafficOptimizationPrompt = ai.definePrompt({
  name: 'trafficOptimizationPrompt',
  input: { schema: TrafficOptimizationInputSchema },
  output: { schema: TrafficOptimizationOutputSchema },
  prompt: `You are an AI traffic management system, SmartFlow, designed to optimize driving efficiency.
Your task is to analyze the provided current location, current route, destination, and simulated real-time traffic and signal timing data.
Based on this information, you must provide:
1.  The overall congestion level for the route.
2.  An optimized route polyline string. If the current route is already optimal, return the provided currentRoutePolyline.
3.  A precise speed recommendation to minimize travel time, specifically aiming to synchronize with upcoming traffic signals (e.g., "Drive at 42 km/h to catch green signal").

Current Location: Latitude {{{currentLocation.latitude}}}, Longitude {{{currentLocation.longitude}}}
Destination: Latitude {{{destinationLocation.latitude}}}, Longitude {{{destinationLocation.longitude}}}
Current Route Polyline: {{{currentRoutePolyline}}}
Simulated Traffic Conditions: {{{simulatedTrafficConditions}}}
Simulated Signal Timing: {{{simulatedSignalTiming}}}

Analyze the data and provide the output in JSON format according to the schema.
Ensure the 'optimizedRoutePolyline' is a valid encoded polyline string.`,
});

// Flow definition
const trafficOptimizationFlow = ai.defineFlow(
  {
    name: 'trafficOptimizationFlow',
    inputSchema: TrafficOptimizationInputSchema,
    outputSchema: TrafficOptimizationOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await trafficOptimizationPrompt(input);
      if (!output) throw new Error("No output from prompt");
      return output;
    } catch (error) {
      return {
        congestionLevel: 'Medium',
        optimizedRoutePolyline: input.currentRoutePolyline,
        suggestedSpeedInstruction: 'Maintain 45 km/h for optimal signal synchronization.'
      };
    }
  }
);
