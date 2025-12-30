import { z } from "zod";

/**
 * Environment variables schema validation
 */
const envSchema = z.object({
  // Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Amplitude (optional)
  NEXT_PUBLIC_AMPLITUDE_API_KEY: z.string().default(""),

  // Mux (optional)
  NEXT_PUBLIC_MUX_ENV_KEY: z.string().default(""),

  // Optional: Set to true to enable seeding test data
  NEXT_PUBLIC_ENABLE_SEED_DATA: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

/**
 * Parse environment variables or throw if validation fails
 */
function getEnvVariables() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_AMPLITUDE_API_KEY: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY,
      NEXT_PUBLIC_MUX_ENV_KEY: process.env.NEXT_PUBLIC_MUX_ENV_KEY,
      NEXT_PUBLIC_ENABLE_SEED_DATA: process.env.NEXT_PUBLIC_ENABLE_SEED_DATA,
    });
  } catch (error) {
    console.error("❌ Invalid environment variables:", error);
    throw new Error("Invalid environment variables");
  }
}

export const env = getEnvVariables();

/**
 * Convenience booleans to check if optional services are configured
 */
export const HAS_AMPLITUDE = env.NEXT_PUBLIC_AMPLITUDE_API_KEY.length > 0;
export const HAS_MUX_ENV = env.NEXT_PUBLIC_MUX_ENV_KEY.length > 0;
