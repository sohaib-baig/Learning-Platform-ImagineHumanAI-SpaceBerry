import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { HostGuardError, requireEnabledHost } from "@/lib/server/hostGuard";
import type {
  BillingAnalyticsDoc,
  BillingAnalyticsResponse,
} from "@/types/analytics";

interface RouteParams {
  clubId: string;
}

function resolveMonthKey(value?: string | null): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function serializeAnalyticsDoc(
  doc: BillingAnalyticsDoc
): BillingAnalyticsResponse {
  return {
    newSubscribers: doc.newSubscribers ?? 0,
    activeSubscribers: doc.activeSubscribers ?? 0,
    trialConversions: doc.trialConversions ?? 0,
    trialStarts: doc.trialStarts ?? 0,
    cancellations: doc.cancellations ?? 0,
    totalRevenue: doc.totalRevenue ?? 0,
    currency: doc.currency ?? "AUD",
    updatedAt: doc.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { clubId } = params;
    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 }
      );
    }

    await requireEnabledHost(request, clubId);

    const searchParams = request.nextUrl.searchParams;
    const requestedMonth = searchParams.get("month");
    const monthKey = resolveMonthKey(requestedMonth);
    console.log(`[Billing] Analytics monthKey=${monthKey}`, { clubId });

    // TODO: support historical chart aggregation when hosts request multi-month trends.

    const docRef = adminDb.doc(
      `clubs/${clubId}/analytics_billing/${monthKey}`
    );
    const docSnap = await docRef.get();

    let analytics: BillingAnalyticsResponse | null = null;
    if (docSnap.exists) {
      analytics = serializeAnalyticsDoc(docSnap.data() as BillingAnalyticsDoc);
    } else {
      const clubSnap = await adminDb.doc(`clubs/${clubId}`).get();
      const fallbackCurrency = String(
        clubSnap.data()?.info?.currency || "AUD"
      ).toUpperCase();
      analytics = {
        newSubscribers: 0,
        activeSubscribers: 0,
        trialConversions: 0,
        trialStarts: 0,
        cancellations: 0,
        totalRevenue: 0,
        currency: fallbackCurrency,
        updatedAt: null,
      };
    }

    return NextResponse.json({
      analytics,
      month: monthKey,
    });
  } catch (error) {
    if (error instanceof HostGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("[Billing] Analytics route error", error);
    return NextResponse.json(
      { error: "Failed to load billing analytics" },
      { status: 500 }
    );
  }
}
