import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { markOnboardingComplete } from "@/lib/db/onboarding";

const bodySchema = z.object({
  flow: z.enum(["host", "member"]),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const onboarding = await markOnboardingComplete(
      decoded.uid,
      parsed.data.flow
    );

    return NextResponse.json({ onboarding });
  } catch (error) {
    console.error("[Onboarding complete] failed", error);
    return NextResponse.json(
      { error: "Unable to update onboarding" },
      { status: 500 }
    );
  }
}

