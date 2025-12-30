import { z } from "zod";

const baseJourneySchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(5000).optional(),
  summary: z.string().max(500).optional(),
  layer: z.string().max(120).optional(),
  emotionShift: z.string().max(120).optional(),
  isPublished: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  estimatedMinutes: z.number().int().min(1).max(1000).optional(),
  order: z.number().int().min(0).optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const journeyCreateSchema = baseJourneySchema;

export const journeyUpdateSchema = baseJourneySchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided."
  );
