import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit as limitConstraint,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type CollectionReference,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Post, Comment } from "@/types/community";

const MIN_PAGE_LIMIT = 1;
const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 20;
const INITIAL_COMMENTS_COUNT = 0;

export const MAX_POST_LENGTH = 800;
export const MAX_COMMENT_LENGTH = 400;

type AuditAction = "delete" | "hide" | "edit";
type AuditTargetType = "post" | "comment";
type VisibilityAction = Extract<AuditAction, "delete" | "hide">;

interface LogAuditActionParams {
  clubId: string;
  targetId: string;
  targetType: AuditTargetType;
  performedBy: string;
  action: AuditAction;
  reason?: string;
}

interface AuditLogPayload {
  action: AuditAction;
  targetId: string;
  targetType: AuditTargetType;
  performedBy: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  reason?: string;
}

type GenericSnapshot = QueryDocumentSnapshot<DocumentData>;

export interface PaginatedPostsResult {
  posts: Post[];
  lastVisible: GenericSnapshot | null;
}

export interface PaginatedCommentsResult {
  comments: Comment[];
  lastVisible: GenericSnapshot | null;
}

const trimOrThrow = (value: string, field: string): string => {
  if (!value || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
};

const sanitizeContentOrThrow = (
  value: string,
  maxLength: number,
  field: string = "content"
): string => {
  const trimmed = trimOrThrow(value, field);

  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
};

const sanitizeLimit = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw new Error("limit must be a finite number");
  }

  if (value < MIN_PAGE_LIMIT) {
    return MIN_PAGE_LIMIT;
  }

  if (value > MAX_PAGE_LIMIT) {
    return MAX_PAGE_LIMIT;
  }

  return Math.floor(value);
};

const postsCollection = (clubId: string): CollectionReference<Post> =>
  collection(db, "clubs", clubId, "posts") as CollectionReference<Post>;

const commentsCollection = (
  clubId: string,
  postId: string
): CollectionReference<Comment> =>
  collection(
    db,
    "clubs",
    clubId,
    "posts",
    postId,
    "comments"
  ) as CollectionReference<Comment>;

const auditLogsCollection = (
  clubId: string
): CollectionReference<DocumentData> =>
  collection(db, "clubs", clubId, "auditLogs");

const buildPaginatedQuery = <T>(
  baseQuery: Query<T>,
  pageLimit: number,
  startAfterDoc?: GenericSnapshot
) => {
  const constraints: QueryConstraint[] = [
    orderBy("createdAt", "desc"),
    limitConstraint(pageLimit),
  ];

  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  return query(baseQuery, ...constraints);
};

/**
 * Create a community post for the given club.
 *
 * @param clubId - Firestore Club document ID
 * @param post - Post payload without Firestore-managed fields
 * @returns Newly created post ID
 *
 * @example
 * ```ts
 * const postId = await createPost("club123", {
 *   authorId: uid,
 *   content: "What would you do differently this week?",
 *   intentTag: "open_for_discussion",
 *   commentsCount: 0,
 * });
 * ```
 */
export async function createPost(
  clubId: string,
  post: Omit<Post, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  trimOrThrow(post.authorId, "authorId");
  trimOrThrow(post.content, "content");

  const payload: Omit<Post, "id"> = {
    ...post,
    commentsCount: post.commentsCount ?? INITIAL_COMMENTS_COUNT,
    createdAt: serverTimestamp() as unknown as Post["createdAt"],
    updatedAt: serverTimestamp() as unknown as Post["updatedAt"],
    hidden: false,
  };

  try {
    const docRef = await addDoc(postsCollection(normalizedClubId), payload);
    console.log("[createPost] - Post successfully created", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[createPost] - Failed to create post", {
      clubId: normalizedClubId,
      authorId: post.authorId,
      error,
    });
    throw error;
  }
}

/**
 * Fetch paginated posts ordered by latest creation date.
 *
 * @param clubId - Firestore Club document ID
 * @param limit - Number of documents to fetch
 * @param startAfterDoc - Optional last snapshot from previous page
 * @returns Array of posts ordered by `createdAt` desc
 *
 * @example
 * ```ts
 * const firstPage = await fetchPostsPaginated("club123", 10);
 * // When paging, pass the last QueryDocumentSnapshot you kept from a previous query.
 * const nextPage = await fetchPostsPaginated("club123", 10, lastVisibleDoc);
 * ```
 */
export async function fetchPostsPaginated(
  clubId: string,
  limit: number,
  startAfterDoc?: GenericSnapshot
): Promise<PaginatedPostsResult> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const pageLimit = sanitizeLimit(limit || DEFAULT_PAGE_LIMIT);

  try {
    const visiblePostsQuery = query(
      postsCollection(normalizedClubId),
      where("hidden", "==", false)
    );

    const querySnapshot = await getDocs(
      buildPaginatedQuery(visiblePostsQuery, pageLimit, startAfterDoc)
    );

    const docs = querySnapshot.docs;
    const postsWithMeta = docs.map((doc) => {
      const base = doc.data() as Omit<Post, "id">;
      const hasStoredCount = typeof base.commentsCount === "number";
      return {
        post: {
          id: doc.id,
          ...base,
          commentsCount: hasStoredCount
            ? (base.commentsCount as number)
            : INITIAL_COMMENTS_COUNT,
        } as Post,
        needsCountFetch: !hasStoredCount,
      };
    });

    const posts = postsWithMeta.some((entry) => entry.needsCountFetch)
      ? await Promise.all(
          postsWithMeta.map(async (entry) => {
            if (!entry.needsCountFetch) {
              return entry.post;
            }

            try {
              const countSnapshot = await getCountFromServer(
                commentsCollection(normalizedClubId, entry.post.id)
              );
              const countValue = countSnapshot.data().count;
              if (typeof countValue === "number") {
                return { ...entry.post, commentsCount: countValue };
              }
            } catch (countError) {
              console.error(
                "[fetchPostsPaginated] - Failed to fetch comments count",
                {
                  clubId: normalizedClubId,
                  postId: entry.post.id,
                  error: countError,
                }
              );
            }

            return entry.post;
          })
        )
      : postsWithMeta.map((entry) => entry.post);

    return {
      posts,
      lastVisible: docs.length > 0 ? docs[docs.length - 1] : null,
    };
  } catch (error) {
    console.error("[fetchPostsPaginated] - Failed to fetch posts", {
      clubId: normalizedClubId,
      error,
    });
    throw error;
  }
}

/**
 * Create a comment under a specific post.
 *
 * @param clubId - Firestore Club document ID
 * @param postId - Post document ID
 * @param comment - Comment payload without Firestore-managed fields
 * @returns Newly created comment ID
 *
 * @example
 * ```ts
 * const commentId = await createComment("club123", "post456", {
 *   authorId: uid,
 *   content: "Love this question!",
 * });
 * ```
 */
export async function createComment(
  clubId: string,
  postId: string,
  comment: Omit<Comment, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedPostId = trimOrThrow(postId, "postId");
  trimOrThrow(comment.authorId, "authorId");
  trimOrThrow(comment.content, "content");

  const payload: Omit<Comment, "id"> = {
    ...comment,
    flagged: comment.flagged ?? false,
    createdAt: serverTimestamp() as unknown as Comment["createdAt"],
    updatedAt: serverTimestamp() as unknown as Comment["updatedAt"],
    hidden: false,
  };

  try {
    const docRef = await addDoc(
      commentsCollection(normalizedClubId, normalizedPostId),
      payload
    );
    console.log("[createComment] - Comment successfully created", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[createComment] - Failed to create comment", {
      clubId: normalizedClubId,
      postId: normalizedPostId,
      authorId: comment.authorId,
      error,
    });
    throw error;
  }
}

/**
 * Fetch paginated comments for a post ordered by latest creation date.
 *
 * @param clubId - Firestore Club document ID
 * @param postId - Post document ID
 * @param limit - Number of documents to fetch
 * @param startAfterDoc - Optional last snapshot from previous page
 * @returns Array of comments ordered by `createdAt` desc
 *
 * @example
 * ```ts
 * const comments = await fetchCommentsPaginated("club123", "post456", 10);
 * ```
 */
export async function fetchCommentsPaginated(
  clubId: string,
  postId: string,
  limit: number,
  startAfterDoc?: GenericSnapshot
): Promise<PaginatedCommentsResult> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedPostId = trimOrThrow(postId, "postId");
  const pageLimit = sanitizeLimit(limit || DEFAULT_PAGE_LIMIT);

  try {
    const visibleCommentsQuery = query(
      commentsCollection(normalizedClubId, normalizedPostId),
      where("hidden", "==", false)
    );

    const querySnapshot = await getDocs(
      buildPaginatedQuery(visibleCommentsQuery, pageLimit, startAfterDoc)
    );

    const docs = querySnapshot.docs;
    const comments = docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Comment, "id">),
    }));

    return {
      comments,
      lastVisible: docs.length > 0 ? docs[docs.length - 1] : null,
    };
  } catch (error) {
    console.error("[fetchCommentsPaginated] - Failed to fetch comments", {
      clubId: normalizedClubId,
      postId: normalizedPostId,
      error,
    });
    throw error;
  }
}

async function logAuditAction({
  clubId,
  targetId,
  targetType,
  performedBy,
  action,
  reason,
}: LogAuditActionParams): Promise<void> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedTargetId = trimOrThrow(targetId, "targetId");
  const normalizedActorId = trimOrThrow(performedBy, "actorId");

  const payload: AuditLogPayload = {
    action,
    targetId: normalizedTargetId,
    targetType,
    performedBy: normalizedActorId,
    createdAt: serverTimestamp(),
  };

  const trimmedReason = reason?.trim();
  if (trimmedReason) {
    payload.reason = trimmedReason;
  }

  try {
    await addDoc(auditLogsCollection(normalizedClubId), payload);
  } catch (error) {
    console.error("[auditLog] - Failed to record action", {
      clubId: normalizedClubId,
      targetId: normalizedTargetId,
      action,
      targetType,
      error,
    });
    throw error;
  }
}

export interface UpdatePostContentParams {
  clubId: string;
  postId: string;
  actorId: string;
  content: string;
  intentTag?: Post["intentTag"];
}

export async function updatePostContent({
  clubId,
  postId,
  actorId,
  content,
  intentTag,
}: UpdatePostContentParams): Promise<void> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedPostId = trimOrThrow(postId, "postId");
  const normalizedActorId = trimOrThrow(actorId, "actorId");
  const sanitizedContent = sanitizeContentOrThrow(
    content,
    MAX_POST_LENGTH,
    "content"
  );

  const postRef = doc(db, "clubs", normalizedClubId, "posts", normalizedPostId);
  const updates: Partial<Post> = {
    content: sanitizedContent,
    updatedAt: serverTimestamp() as unknown as Post["updatedAt"],
  };

  if (intentTag) {
    updates.intentTag = intentTag;
  }

  try {
    await updateDoc(postRef, updates);
    console.log(`[editPost] - Post updated ${normalizedPostId}`);
    await logAuditAction({
      clubId: normalizedClubId,
      targetId: normalizedPostId,
      targetType: "post",
      performedBy: normalizedActorId,
      action: "edit",
    });
  } catch (error) {
    console.error("[editPost] - Failed to update post", {
      clubId: normalizedClubId,
      postId: normalizedPostId,
      actorId: normalizedActorId,
      error,
    });
    throw error;
  }
}

export interface SoftDeletePostParams {
  clubId: string;
  postId: string;
  actorId: string;
  reason?: string;
  mode?: VisibilityAction;
}

export async function softDeletePost({
  clubId,
  postId,
  actorId,
  reason,
  mode = "delete",
}: SoftDeletePostParams): Promise<void> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedPostId = trimOrThrow(postId, "postId");
  const normalizedActorId = trimOrThrow(actorId, "actorId");
  const postRef = doc(db, "clubs", normalizedClubId, "posts", normalizedPostId);

  const logLabel = mode === "hide" ? "[hidePost]" : "[deletePost]";

  try {
    await updateDoc(postRef, {
      hidden: true,
      updatedAt: serverTimestamp() as unknown as Post["updatedAt"],
    });
    console.log(
      `${logLabel} - Post ${mode === "hide" ? "hidden" : "deleted"} ${normalizedPostId}`
    );
    await logAuditAction({
      clubId: normalizedClubId,
      targetId: normalizedPostId,
      targetType: "post",
      performedBy: normalizedActorId,
      action: mode,
      reason,
    });
  } catch (error) {
    console.error(`${logLabel} - Failed to update post visibility`, {
      clubId: normalizedClubId,
      postId: normalizedPostId,
      actorId: normalizedActorId,
      action: mode,
      error,
    });
    throw error;
  }
}

export interface UpdateCommentParams {
  clubId: string;
  postId: string;
  commentId: string;
  actorId: string;
  content: string;
}

export async function updateComment({
  clubId,
  postId,
  commentId,
  actorId,
  content,
}: UpdateCommentParams): Promise<void> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedPostId = trimOrThrow(postId, "postId");
  const normalizedCommentId = trimOrThrow(commentId, "commentId");
  const normalizedActorId = trimOrThrow(actorId, "actorId");
  const sanitizedContent = sanitizeContentOrThrow(
    content,
    MAX_COMMENT_LENGTH,
    "content"
  );

  const commentRef = doc(
    db,
    "clubs",
    normalizedClubId,
    "posts",
    normalizedPostId,
    "comments",
    normalizedCommentId
  );

  try {
    await updateDoc(commentRef, {
      content: sanitizedContent,
      updatedAt: serverTimestamp() as unknown as Comment["updatedAt"],
    });
    console.log(`[editComment] - Comment updated ${normalizedCommentId}`);
    await logAuditAction({
      clubId: normalizedClubId,
      targetId: normalizedCommentId,
      targetType: "comment",
      performedBy: normalizedActorId,
      action: "edit",
    });
  } catch (error) {
    console.error("[editComment] - Failed to update comment", {
      clubId: normalizedClubId,
      postId: normalizedPostId,
      commentId: normalizedCommentId,
      actorId: normalizedActorId,
      error,
    });
    throw error;
  }
}

export interface SoftDeleteCommentParams {
  clubId: string;
  postId: string;
  commentId: string;
  actorId: string;
  reason?: string;
  mode?: VisibilityAction;
}

export async function softDeleteComment({
  clubId,
  postId,
  commentId,
  actorId,
  reason,
  mode = "delete",
}: SoftDeleteCommentParams): Promise<void> {
  const normalizedClubId = trimOrThrow(clubId, "clubId");
  const normalizedPostId = trimOrThrow(postId, "postId");
  const normalizedCommentId = trimOrThrow(commentId, "commentId");
  const normalizedActorId = trimOrThrow(actorId, "actorId");

  const commentRef = doc(
    db,
    "clubs",
    normalizedClubId,
    "posts",
    normalizedPostId,
    "comments",
    normalizedCommentId
  );

  const logLabel = mode === "hide" ? "[hideComment]" : "[deleteComment]";
  const verb = mode === "hide" ? "hidden" : "deleted";

  try {
    await updateDoc(commentRef, {
      hidden: true,
      updatedAt: serverTimestamp() as unknown as Comment["updatedAt"],
    });
    console.log(`${logLabel} - Comment ${verb} ${normalizedCommentId}`);
    await logAuditAction({
      clubId: normalizedClubId,
      targetId: normalizedCommentId,
      targetType: "comment",
      performedBy: normalizedActorId,
      action: mode,
      reason,
    });
  } catch (error) {
    console.error(`${logLabel} - Failed to update comment visibility`, {
      clubId: normalizedClubId,
      postId: normalizedPostId,
      commentId: normalizedCommentId,
      actorId: normalizedActorId,
      action: mode,
      error,
    });
    throw error;
  }
}
