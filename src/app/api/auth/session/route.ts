import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const SESSION_COOKIE_NAME = "firebaseSession";
const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const idToken = body?.idToken as string | undefined;

    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // Verify the ID token and mint a session cookie (HTTP-only).
    await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS,
    });

    const response = NextResponse.json({ status: "ok" });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FIVE_DAYS / 1000,
    });

    return response;
  } catch (error) {
    console.error("Failed to create session cookie", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ status: "cleared" });
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, false);
      const uid = decoded.uid || decoded.sub;
      if (uid) {
        await adminAuth.revokeRefreshTokens(uid);
      }
    } catch (error) {
      // If verification fails, still proceed to clear local cookies.
      console.error("Failed to revoke session cookie on logout", error);
    }
  }

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
