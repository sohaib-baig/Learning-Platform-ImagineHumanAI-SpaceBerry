"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeMembershipAudit = writeMembershipAudit;
const firestore_1 = require("firebase-admin/firestore");
async function writeMembershipAudit(db, entry) {
    if (!entry.clubId || !entry.userId) {
        console.warn("[Billing] Audit skip missing identifiers", entry);
        return;
    }
    const logId = `${Date.now()}-${entry.userId}`;
    // Do not write to user-scoped audit collections
    await db
        .doc(`clubs/${entry.clubId}/auditLogs/${logId}`)
        .set({
        userId: entry.userId,
        oldStatus: entry.oldStatus ?? null,
        newStatus: entry.newStatus,
        changedBy: entry.changedBy,
        reason: entry.reason,
        reason_detail: entry.reason_detail ?? null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
