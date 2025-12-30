import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FIREBASE_REGION } from "../../shared/firebaseRegion";
import { logMembershipAudit } from "./auditLogger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface JoinFreeClubRequest {
  clubId?: string;
}

export const joinFreeClub = functions
  .region(FIREBASE_REGION)
  .https.onCall(async (data: JoinFreeClubRequest, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required."
      );
    }

    const clubIdRaw = typeof data?.clubId === "string" ? data.clubId : "";
    const clubId = clubIdRaw.trim();
    if (!clubId || clubId.includes("/") || clubId.includes("..")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid clubId is required."
      );
    }

    const clubRef = db.doc(`clubs/${clubId}`);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Club not found.");
    }

    const clubData = clubSnap.data() || {};
    const price = Number(clubData.info?.price ?? 0);

    if (!Number.isFinite(price)) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Club pricing is misconfigured."
      );
    }

    if (price > 0) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Club is not free to join."
      );
    }

    const userRef = db.doc(`users/${uid}`);

    try {
      let previousStatus: string | null = null;
      await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const userData = userSnap.data() || {};
        type MembershipRecord = {
          status?: string;
        };

        const clubMemberships = (userData?.clubMemberships ?? {}) as Record<
          string,
          MembershipRecord
        >;
        const existingMembership = clubMemberships[clubId];
        const alreadyActive = existingMembership?.status === "active";

        const membershipPayload = {
          status: "active",
          isTrialing: false,
          lastPaymentType: "free",
          stripeSubscriptionId: null,
          trialEndsAt: null,
          lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
          consecutiveFailedPayments: 0,
        };

        previousStatus = existingMembership?.status ?? null;

        tx.set(
          userRef,
          {
            clubsJoined: admin.firestore.FieldValue.arrayUnion(clubId),
            clubMemberships: {
              [clubId]: membershipPayload,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        if (!alreadyActive) {
          tx.update(clubRef, {
            membersCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      await logMembershipAudit({
        clubId,
        userId: uid,
        oldStatus: previousStatus,
        newStatus: "active",
        changedBy: "system",
        reason: "free_join",
      });
    } catch (error) {
      functions.logger.error("joinFreeClub transaction failed", {
        clubId,
        uid,
        error,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Unable to join club. Please try again."
      );
    }

    return { success: true };
  });
