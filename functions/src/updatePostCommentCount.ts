import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FIREBASE_REGION } from "../../shared/firebaseRegion";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const isVisible = (comment?: { hidden?: boolean } | null) =>
  comment ? comment.hidden !== true : false;

/**
 * Keeps `commentsCount` on a post in sync when comments are created/updated/deleted.
 * Uses transactional increments to avoid counting the entire subcollection.
 */
export const onCommentWrite = functions
  .region(FIREBASE_REGION)
  .firestore.document("clubs/{clubId}/posts/{postId}/comments/{commentId}")
  .onWrite(async (change, context) => {
    const { clubId, postId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let delta = 0;

    // Created
    if (!before && after) {
      delta = isVisible(after) ? 1 : 0;
    }

    // Deleted
    if (before && !after) {
      delta = isVisible(before) ? -1 : 0;
    }

    // Updated (visibility change)
    if (before && after) {
      const wasVisible = isVisible(before);
      const isNowVisible = isVisible(after);

      if (wasVisible && !isNowVisible) {
        delta = -1;
      } else if (!wasVisible && isNowVisible) {
        delta = 1;
      }
    }

    if (delta === 0) {
      return;
    }

    const postRef = db.doc(`clubs/${clubId}/posts/${postId}`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists) {
        functions.logger.warn("[onCommentWrite] Post missing for comment", {
          clubId,
          postId,
        });
        return;
      }

      const current = Number(snap.data()?.commentsCount ?? 0);
      const nextCount = Math.max(0, current + delta);

      tx.update(postRef, {
        commentsCount: nextCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  });
