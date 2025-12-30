"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePaymentForFreeMembers = enforcePaymentForFreeMembers;
const firestore_1 = require("firebase-admin/firestore");
const DEFAULT_BATCH_LIMIT = 500;
const DEFAULT_TIMEOUT_MS = 150000;
const TIMEOUT_BUFFER_MS = 5000;
async function enforcePaymentForFreeMembers({ clubId: rawClubId, hostUid, db, logger = console, membershipBatchLimit = DEFAULT_BATCH_LIMIT, timeoutMs = DEFAULT_TIMEOUT_MS, auditLogger, }) {
    const clubId = rawClubId.trim();
    if (!clubId || clubId.includes("/") || clubId.includes("..")) {
        throw new Error("A valid clubId is required.");
    }
    const clubRef = db.collection("clubs").doc(clubId);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) {
        throw new Error("Club not found.");
    }
    const clubData = clubSnap.data() || {};
    const alreadyLocked = clubData.pricingLocked === true;
    if (clubData.hostId !== hostUid) {
        throw new Error("Only the club host can change pricing state.");
    }
    const membershipFieldPath = new firestore_1.FieldPath("clubMemberships", clubId, "lastPaymentType");
    let lastDoc = null;
    let processedMembers = 0;
    let batchesProcessed = 0;
    const startTime = Date.now();
    while (true) {
        let query = db
            .collection("users")
            .where(membershipFieldPath, "==", "free")
            .orderBy(firestore_1.FieldPath.documentId())
            .limit(membershipBatchLimit);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snap = await query.get();
        if (snap.empty) {
            break;
        }
        const batch = db.batch();
        const batchAuditEntries = [];
        snap.docs.forEach((docSnap) => {
            const userRef = docSnap.ref;
            const userData = docSnap.data() || {};
            const existingMembership = userData.clubMemberships?.[clubId]?.status ?? null;
            batchAuditEntries.push({
                clubId,
                userId: docSnap.id,
                oldStatus: existingMembership,
                newStatus: "payment_required",
                changedBy: "host",
                reason: "payment_required",
            });
            batch.set(userRef, {
                clubMemberships: {
                    [clubId]: {
                        status: "payment_required",
                        isTrialing: false,
                        trialEndsAt: null,
                        stripeSubscriptionId: null,
                        lastPaymentType: "free_expired",
                        lastPaymentAt: firestore_1.FieldValue.serverTimestamp(),
                        consecutiveFailedPayments: 0,
                    },
                },
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        // Safety validation before commit
        const hasDotKey = snap.docs.some(() => Object.keys({
            clubMemberships: { [clubId]: { status: "payment_required" } },
        }).some((k) => k.includes(".")));
        if (hasDotKey) {
            logger.error?.("[RequirePayment] Aborted commit due to dotted field key", {
                clubId,
                batch: batchesProcessed + 1,
            });
            throw new Error(`[RequirePayment] Invalid dotted key in user ${snap.docs[0].id}`);
        }
        await batch.commit();
        if (auditLogger) {
            await Promise.all(batchAuditEntries.map((entry) => auditLogger(entry)));
        }
        processedMembers += snap.size;
        batchesProcessed += 1;
        lastDoc = snap.docs[snap.docs.length - 1];
        logger.info?.("[RequirePayment] BatchProcessed", {
            clubId,
            batch: batchesProcessed,
            processedInBatch: snap.size,
            totalProcessed: processedMembers,
        });
        const elapsed = Date.now() - startTime;
        if (elapsed > timeoutMs - TIMEOUT_BUFFER_MS) {
            logger.warn?.("[RequirePayment] Partial", {
                clubId,
                processedMembers,
                batchesProcessed,
                elapsedMs: elapsed,
            });
            return {
                updatedMembers: processedMembers,
                batchesProcessed,
                partial: true,
            };
        }
    }
    const clubUpdatePayload = {
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        "info.priceChangedAt": firestore_1.FieldValue.serverTimestamp(),
    };
    if (!alreadyLocked) {
        clubUpdatePayload.pricingLocked = true;
    }
    await clubRef.set(clubUpdatePayload, { merge: true });
    logger.info?.("[RequirePayment] Completed", {
        clubId,
        updatedMembers: processedMembers,
        batchesProcessed,
        partial: false,
    });
    return {
        updatedMembers: processedMembers,
        batchesProcessed,
        partial: false,
    };
}
