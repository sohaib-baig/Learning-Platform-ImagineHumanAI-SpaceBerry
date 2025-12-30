import { Timestamp } from "firebase/firestore";

/**
 * Intent tags help provide lightweight context for community posts.
 * The union is intentionally narrow so hosts can reason about each post's intent.
 */
export type IntentTag =
  | "open_for_discussion"
  | "prefer_host_input"
  | "any_recommendations"
  | "reflecting"
  | "celebration"
  | "seeking_help";

/**
 * Core post model inside `clubs/{clubId}/posts/{postId}`.
 * Minimal fields keep it easy to extend later (attachments, visibility, etc.).
 */
export interface Post {
  id: string;
  authorId: string;
  content: string;
  intentTag: IntentTag;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  commentsCount: number;
  flagged?: boolean;
  hidden?: boolean;
}

/**
 * Comment model scoped to `clubs/{clubId}/posts/{postId}/comments/{commentId}`.
 */
export interface Comment {
  id: string;
  authorId: string;
  content: string;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  flagged?: boolean;
  hidden?: boolean;
}

