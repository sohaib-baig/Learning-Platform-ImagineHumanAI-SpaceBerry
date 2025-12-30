"use server";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";

const waitlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Your name is required." })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(120, { message: "Name must be 120 characters or fewer." }),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required." })
    .email({ message: "Please enter a valid email address." })
    .max(320, { message: "Email must be 320 characters or fewer." }),
});

export type WaitlistFormState = {
  success?: boolean;
  errors?: {
    name?: string[];
    email?: string[];
    form?: string[];
  };
};

export async function joinWaitlist(
  _prevState: WaitlistFormState,
  formData: FormData
): Promise<WaitlistFormState> {
  const parsed = waitlistSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();

    return {
      success: false,
      errors: {
        name: fieldErrors.name,
        email: fieldErrors.email,
        form: formErrors.length ? formErrors : undefined,
      },
    };
  }

  const { name, email } = parsed.data;
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const normalizedEmail = trimmedEmail.toLowerCase();

  try {
    const waitlistCollection = adminDb.collection("waitlist");
    const waitlistDocRef = waitlistCollection.doc(normalizedEmail);
    const docSnapshot = await waitlistDocRef.get();

    if (docSnapshot.exists) {
      await waitlistDocRef.update({
        name: trimmedName,
        email: trimmedEmail,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await waitlistDocRef.set({
        name: trimmedName,
        email: trimmedEmail,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to join waitlist:", error);

    return {
      success: false,
      errors: {
        form: ["We couldn't save your details. Please try again."],
      },
    };
  }
}

