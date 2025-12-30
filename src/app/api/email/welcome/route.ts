import { NextResponse } from "next/server";
import { z } from "zod";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendWelcomeEmail } from "@/lib/email";

const bodySchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().or(z.literal("")),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (parsed.data.uid !== decoded.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sent = await sendWelcomeEmail(parsed.data.email, parsed.data.name);

    if (!sent) {
      return NextResponse.json(
        { error: "Unable to send welcome email" },
        { status: 500 },
      );
    }

    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .set({ welcomeEmailSent: true }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to process welcome email request", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

