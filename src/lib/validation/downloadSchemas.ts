import { z } from "zod";

const MAX_PRICE = 100_000;

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code.")
  .transform((value) => value.toUpperCase());

function ensureMonetaryConsistency(
  data: {
    price?: number;
    currency?: string;
    isFree?: boolean;
  },
  ctx: z.RefinementCtx,
  options: { requirePriceWhenPaid: boolean }
) {
  const resolvedIsFree =
    data.isFree ??
    (data.price === undefined || (typeof data.price === "number" && data.price === 0));

  if (options.requirePriceWhenPaid && !resolvedIsFree && data.price === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price"],
      message: "Price is required when the download is not marked as free.",
    });
  }

  if (data.price !== undefined && data.currency === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currency"],
      message: "Currency is required when a price is provided.",
    });
  }

  if (resolvedIsFree && data.price !== undefined && data.price > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price"],
      message: "Price must be zero when the download is marked as free.",
    });
  }
}

const downloadBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(160, "Title must be 160 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer.")
    .optional(),
  url: z.string().trim().url("Please provide a valid URL."),
  price: z
    .number()
    .min(0, "Price cannot be negative.")
    .max(MAX_PRICE, `Price must be less than ${MAX_PRICE}.`)
    .optional(),
  currency: currencySchema.optional(),
  isFree: z.boolean().optional(),
});

export const downloadCreateSchema = downloadBaseSchema.superRefine((data, ctx) => {
  ensureMonetaryConsistency(data, ctx, { requirePriceWhenPaid: true });
});

export const downloadUpdateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(160, "Title must be 160 characters or fewer.")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be 2000 characters or fewer.")
      .optional(),
    url: z.string().trim().url("Please provide a valid URL.").optional(),
    price: z
      .number()
      .min(0, "Price cannot be negative.")
      .max(MAX_PRICE, `Price must be less than ${MAX_PRICE}.`)
      .optional(),
    currency: currencySchema.optional(),
    isFree: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided.",
      });
      return;
    }

    ensureMonetaryConsistency(data, ctx, { requirePriceWhenPaid: false });
  });

