import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { saveClubDraft } from "@/lib/db/onboarding";

const bodySchema = z.object({
  name: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  autoGenerateName: z.boolean().optional(),
  step: z.string().optional(),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function PATCH(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const onboarding = await saveClubDraft(decoded.uid, parsed.data);

    return NextResponse.json({ onboarding });
  } catch (error) {
    console.error("[Onboarding host draft] failed to save", error);
    return NextResponse.json(
      { error: "Unable to save club draft" },
      { status: 500 }
    );
  }
}
