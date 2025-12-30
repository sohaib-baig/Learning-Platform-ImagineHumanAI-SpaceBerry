import type { firestore } from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type MembershipAuditReason =
  | "free_join"
  | "free_to_paid"
  | "trial_end"
  | "payment_failed"
  | "payment_required"
  | "subscription_canceled";

export interface MembershipAuditEntry {
  clubId: string;
  userId: string;
  oldStatus?: string | null;
  newStatus: string;
  changedBy: "system" | "host";
  reason: MembershipAuditReason;
  reason_detail?: string | null;
}

export async function writeMembershipAudit(
  db: firestore.Firestore,
  entry: MembershipAuditEntry
): Promise<void> {
  if (!entry.clubId || !entry.userId) {
    console.warn("[Billing] Audit skip missing identifiers", entry);
    return;
  }

  const logId = `${Date.now()}-${entry.userId}`;
  // Do not write to user-scoped audit collections
  await db
    .doc(`clubs/${entry.clubId}/auditLogs/${logId}`)
    .set(
      {
        userId: entry.userId,
        oldStatus: entry.oldStatus ?? null,
        newStatus: entry.newStatus,
        changedBy: entry.changedBy,
        reason: entry.reason,
        reason_detail: entry.reason_detail ?? null,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

