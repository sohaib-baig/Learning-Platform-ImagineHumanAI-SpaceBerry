// ⚠️ SECURITY: Host-only callable. Never expose directly to client SDKs.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FIREBASE_REGION } from "../../shared/firebaseRegion";
import {
  enforcePaymentForFreeMembers,
  type RequirePaymentResult,
} from "../../shared/requirePaymentForFreeMembers";
import { logMembershipAudit } from "./auditLogger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface RequirePaymentRequest {
  clubId?: string;
}

export const requirePaymentForFreeMembers = functions
  .region(FIREBASE_REGION)
  .https.onCall(async (data: RequirePaymentRequest, context): Promise<RequirePaymentResult> => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required to update memberships."
      );
    }

    const rawClubId = typeof data?.clubId === "string" ? data.clubId : "";
    const clubId = rawClubId.trim();

    if (!clubId || clubId.includes("/") || clubId.includes("..")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid clubId is required."
      );
    }

    try {
      return await enforcePaymentForFreeMembers({
        clubId,
        hostUid: uid,
        db,
        logger: functions.logger,
        auditLogger: logMembershipAudit,
      });
    } catch (error) {
      functions.logger.error("[RequirePayment] Failure", {
        clubId,
        uid,
        error,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to require payment for members."
      );
    }
  });

