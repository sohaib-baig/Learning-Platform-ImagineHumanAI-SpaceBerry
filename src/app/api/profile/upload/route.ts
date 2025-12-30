import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebase-admin";

function getBucketName() {
  const name =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    adminBucket.name;
  if (!name) {
    throw new Error(
      "Storage bucket is not configured. Set FIREBASE_STORAGE_BUCKET to an existing bucket."
    );
  }
  return name;
}

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed" },
        { status: 400 }
      );
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5MB limit
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller" },
        { status: 400 }
      );
    }

    const bucketName = getBucketName();
    const filePath = `users/${decoded.uid}/profile.jpg`;
    const downloadToken = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    await adminBucket.file(filePath).save(buffer, {
      resumable: false,
      contentType: file.type || "image/jpeg",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        uploadedBy: decoded.uid,
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${downloadToken}`;

    await adminDb
      .collection("users")
      .doc(decoded.uid)
      .set(
        {
          photoURL: url,
          photoUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Profile Upload] Failed to upload profile image", error);
    return NextResponse.json(
      { error: "Unable to upload profile image" },
      { status: 500 }
    );
  }
}
