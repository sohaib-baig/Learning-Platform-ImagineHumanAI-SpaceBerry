import { z } from "zod";
import { isValidYouTubeUrl } from "@/lib/youtube";

const contentBlockSchema = z.object({
  type: z.string().min(1),
  value: z.string(),
});

const baseLessonSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    durationMinutes: z.number().int().min(1).max(600).optional(),
    videoUrl: z.string().max(500).optional(),
    contentType: z.enum(["video", "article", "exercise"]).optional(),
    contentBlocks: z.array(contentBlockSchema).optional(),
    content: z.string().max(20000).optional(),
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const type = value.contentType ?? "article";
    if (type === "video") {
      if (!value.videoUrl || !isValidYouTubeUrl(value.videoUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videoUrl"],
          message: "Video lessons require a valid private YouTube URL.",
        });
      }
    } else if (value.videoUrl && !isValidYouTubeUrl(value.videoUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoUrl"],
        message: "Video URL must be a valid YouTube link.",
      });
    }
  });

export const lessonCreateSchema = baseLessonSchema;

export const lessonUpdateSchema = baseLessonSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided."
  );

