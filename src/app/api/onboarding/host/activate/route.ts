import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { createOrReusePlaygroundClub } from "@/lib/db/onboarding";

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
    const result = await createOrReusePlaygroundClub(decoded.uid);

    return NextResponse.json({
      clubId: result.clubId,
      slug: result.slug,
    });
  } catch (error) {
    console.error("[Onboarding host activate] failed", error);
    return NextResponse.json(
      { error: "Unable to activate your club" },
      { status: 500 }
    );
  }
}

