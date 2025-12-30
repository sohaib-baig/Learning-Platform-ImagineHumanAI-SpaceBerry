import { z } from "zod";
import { isValidYouTubeUrl } from "../youtube";

const benefitSchema = z
  .string()
  .trim()
  .min(1, "Benefit cannot be empty")
  .max(160, "Benefit must be under 160 characters");

const recommendedClubIdSchema = z
  .string()
  .trim()
  .min(1, "Club id cannot be empty")
  .max(128, "Club id is unexpectedly long");
const profileImageSchema = z
  .string()
  .url("Profile image must be a valid URL")
  .max(2048, "Profile image URL is too long");

/**
 * Payload used to update top-level club information (host-controlled).
 */
export const clubInfoUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be under 120 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be under 1,000 characters"),
  mission: z
    .string()
    .trim()
    .max(1500, "Mission must be under 1,500 characters"),
  vision: z
    .string()
    .trim()
    .max(1500, "Vision must be under 1,500 characters"),
  benefits: z
    .array(benefitSchema)
    .max(10, "A maximum of 10 benefits is supported"),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(100000, "Price looks unreasonably high"),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code"),
  recommendedClubs: z
    .array(recommendedClubIdSchema)
    .max(10, "A maximum of 10 recommended clubs is supported"),
  profileImageUrl: profileImageSchema.optional(),
  videoUrl: z.string().trim().max(500, "Video URL looks too long").optional(),
}).superRefine((value, ctx) => {
  const trimmedVideoUrl = value.videoUrl?.trim() ?? "";
  if (trimmedVideoUrl && !isValidYouTubeUrl(trimmedVideoUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["videoUrl"],
      message: "Video URL must be a valid YouTube link.",
    });
  }
});

export type ClubInfoUpdateInput = z.infer<typeof clubInfoUpdateSchema>;
