'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating slide content based on a user prompt.
 *
 * - generateSlideContent - An async function that takes user input and returns generated slide content.
 * - GenerateSlideContentInput - The input type for the generateSlideContent function.
 * - GenerateSlideContentOutput - The return type for the generateSlideContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSlideContentInputSchema = z.object({
  username: z.string().describe('The name of the user.'),
  institution: z.string().describe('The institution the user is affiliated with.'),
  presentationDate: z.string().describe('The date of the presentation.'),
  topic: z.string().describe('The topic of the presentation.'),
  slideCount: z.number().int().min(1).describe('The desired number of slides for the presentation.'),
});

export type GenerateSlideContentInput = z.infer<typeof GenerateSlideContentInputSchema>;

const GenerateSlideContentOutputSchema = z.object({
  titleSlide: z.object({
    title: z.string().describe('The title of the presentation.'),
    subtitle: z.string().describe('The subtitle of the presentation.'),
  }).describe('The content for the title slide.'),
  bodySlides: z.array(z.object({
    heading: z.string().describe('The heading of the slide.'),
    content: z.string().describe('The main content of the slide.'),
  })).describe('The content for the body slides.'),
});

export type GenerateSlideContentOutput = z.infer<typeof GenerateSlideContentOutputSchema>;

export async function generateSlideContent(input: GenerateSlideContentInput): Promise<GenerateSlideContentOutput> {
  return generateSlideContentFlow(input);
}

const generateSlideContentPrompt = ai.definePrompt({
  name: 'generateSlideContentPrompt',
  input: {schema: GenerateSlideContentInputSchema},
  output: {schema: GenerateSlideContentOutputSchema},
  prompt: `You are an AI assistant designed to generate slide content for presentations.

  The user is named {{username}} and is affiliated with {{institution}}.
  The presentation date is {{presentationDate}} and the topic is {{topic}}.
  The user wants {{slideCount}} slides for the presentation.

  Generate content for the title slide (title and subtitle) and the body slides (heading and content).
  Ensure the content is informative and engaging.

  Output the slide content as a JSON object that conforms to the following schema:
  ${JSON.stringify(GenerateSlideContentOutputSchema)}

  Make sure the JSON is valid and parsable.
  `,
});

const generateSlideContentFlow = ai.defineFlow(
  {
    name: 'generateSlideContentFlow',
    inputSchema: GenerateSlideContentInputSchema,
    outputSchema: GenerateSlideContentOutputSchema,
  },
  async input => {
    const {output} = await generateSlideContentPrompt(input);
    return output!;
  }
);
