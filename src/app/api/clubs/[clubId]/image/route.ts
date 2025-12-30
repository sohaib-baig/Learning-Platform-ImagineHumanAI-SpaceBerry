import { NextResponse, type NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebase-admin";
import { requireEnabledHost, HostGuardError } from "@/lib/server/hostGuard";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB limit

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

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  const { clubId } = params;
  if (!clubId) {
    return NextResponse.json({ error: "Club ID is required" }, { status: 400 });
  }

  const authHeaderToken = extractToken(request);
  if (!authHeaderToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify auth and host permissions
    const decoded = await adminAuth.verifyIdToken(authHeaderToken);
    await requireEnabledHost(request, clubId);

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

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller" },
        { status: 400 }
      );
    }

    const bucketName = getBucketName();
    const extension = file.type.split("/")[1] || "jpg";
    const filePath = `clubs/${clubId}/profile.${extension}`;
    const downloadToken = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());

    await adminBucket.file(filePath).save(buffer, {
      resumable: false,
      contentType: file.type || "image/jpeg",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        uploadedBy: decoded.uid,
        clubId,
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${downloadToken}`;

    const clubRef = adminDb.collection("clubs").doc(clubId);
    await clubRef.update({
      "info.profileImageUrl": url,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("[Club Image Upload] Failed to upload club image", error);
    return NextResponse.json(
        { error: "Unable to upload club image" },
        { status: 500 }
      );
  }
}
