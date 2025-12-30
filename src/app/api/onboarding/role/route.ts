import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { setOnboardingRole } from "@/lib/db/onboarding";
import type { OnboardingRole } from "@/types/onboarding";

const bodySchema = z.object({
  role: z.enum(["host", "member"]),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

function nextRouteForRole(role: OnboardingRole): string {
  return role === "host"
    ? "/onboarding/host/club-name"
    : "/onboarding/member/benefits";
}

export async function POST(request: Request) {
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

    const onboarding = await setOnboardingRole(
      decoded.uid,
      parsed.data.role as OnboardingRole
    );

    return NextResponse.json({
      onboarding,
      nextRoute: nextRouteForRole(parsed.data.role),
    });
  } catch (error) {
    console.error("[Onboarding role] failed to update role", error);
    return NextResponse.json(
      { error: "Unable to set onboarding role" },
      { status: 500 }
    );
  }
}

