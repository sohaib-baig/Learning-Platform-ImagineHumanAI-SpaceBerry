import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { HostGuardError, requireEnabledHost } from "@/lib/server/hostGuard";
import { downloadUpdateSchema } from "@/lib/validation/downloadSchemas";
import { snapshotToClubDownload } from "../helpers";

type RouteParams = {
  clubId: string;
  downloadId: string;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  const { clubId, downloadId } = params;

  if (!downloadId) {
    return NextResponse.json(
      { error: "Download ID is required." },
      { status: 400 }
    );
  }

  try {
    const payload = await request.json();
    const data = downloadUpdateSchema.parse(payload);

    await requireEnabledHost(request, clubId);

    const downloadRef = adminDb
      .collection("clubs")
      .doc(clubId)
      .collection("downloads")
      .doc(downloadId);

    const existingSnapshot = await downloadRef.get();
    if (!existingSnapshot.exists) {
      return NextResponse.json(
        { error: "Download not found." },
        { status: 404 }
      );
    }

    const existingData = existingSnapshot.data() ?? {};

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if ("title" in data) {
      updateData.title = data.title?.trim() ?? "";
    }

    if ("description" in data) {
      updateData.description = data.description?.trim() ?? "";
    }

    if ("url" in data) {
      updateData.url = data.url?.trim() ?? "";
    }

    const existingPrice =
      typeof existingData.price === "number" &&
      !Number.isNaN(existingData.price)
        ? existingData.price
        : 0;
    const existingCurrency =
      typeof existingData.currency === "string" &&
      existingData.currency.trim().length > 0
        ? existingData.currency.toUpperCase()
        : "AUD";
    const existingIsFree =
      typeof existingData.isFree === "boolean"
        ? existingData.isFree
        : !(existingPrice > 0);

    let nextPrice = existingPrice;
    let priceChanged = false;

    if ("price" in data && data.price !== undefined) {
      nextPrice = data.price;
      priceChanged = true;
    }

    let nextCurrency = existingCurrency;
    let currencyChanged = false;

    if ("currency" in data && data.currency !== undefined) {
      nextCurrency = data.currency.toUpperCase();
      currencyChanged = true;
    }

    let nextIsFree = existingIsFree;
    let isFreeChanged = false;

    if ("isFree" in data && data.isFree !== undefined) {
      nextIsFree = data.isFree;
      isFreeChanged = true;
    }

    const toggledToPaid = existingIsFree && !nextIsFree;

    if (priceChanged) {
      if (
        typeof nextPrice !== "number" ||
        Number.isNaN(nextPrice) ||
        !Number.isFinite(nextPrice)
      ) {
        return NextResponse.json(
          { error: "Price must be a valid number." },
          { status: 400 }
        );
      }
    }

    if (toggledToPaid && !priceChanged) {
      return NextResponse.json(
        {
          error: "Provide a price before marking this download as paid.",
        },
        { status: 400 }
      );
    }

    if (nextIsFree && nextPrice !== 0) {
      nextPrice = 0;
      priceChanged = true;
    }

    if (!nextIsFree) {
      const effectivePrice = priceChanged ? nextPrice : existingPrice;

      if (
        typeof effectivePrice !== "number" ||
        Number.isNaN(effectivePrice) ||
        effectivePrice <= 0
      ) {
        return NextResponse.json(
          {
            error: "Paid downloads must have a price greater than zero.",
          },
          { status: 400 }
        );
      }
    }

    if (priceChanged) {
      updateData.price = nextPrice;
    }

    if (currencyChanged || (priceChanged && !currencyChanged)) {
      updateData.currency = nextCurrency;
    }

    if (isFreeChanged || priceChanged) {
      updateData.isFree = nextIsFree;
    }

    if (Object.keys(updateData).length <= 1) {
      // Only updatedAt would be present.
      return NextResponse.json(
        { error: "No updates were provided." },
        { status: 400 }
      );
    }

    await downloadRef.set(updateData, { merge: true });

    const refreshedSnapshot = await downloadRef.get();
    const nowIso = new Date().toISOString();
    const download = snapshotToClubDownload(refreshedSnapshot, nowIso);

    return NextResponse.json({ download });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[Club Downloads API] Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update download" },
      { status: 500 }
    );
  }
}
