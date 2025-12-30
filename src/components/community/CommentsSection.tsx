"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Timestamp } from "firebase/firestore";
import { CommentItem } from "@/components/community/CommentItem";
import { usePaginatedComments } from "@/hooks/usePaginatedComments";
import { createComment, MAX_COMMENT_LENGTH } from "@/lib/firestore/community";
import type { Comment } from "@/types/community";

const COMPOSER_ERROR_FALLBACK =
  "We couldn't add your comment. Please try again.";

export interface CommentsSectionProps {
  clubId: string;
  postId: string;
  currentUserId: string;
  initialCommentsCount?: number;
  isExpanded: boolean;
  onCountChange?: (count: number) => void;
  canHostManage?: boolean;
}

const buildOptimisticComment = (content: string, authorId: string): Comment => {
  const timestamp = Timestamp.fromDate(new Date());
  return {
    id: `temp-${timestamp.toMillis()}`,
    authorId,
    content,
    updatedAt: timestamp,
    createdAt: timestamp,
    hidden: false,
  };
};

const LoadingState = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`comment-skeleton-${index}`}
        className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-3"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-5/6 rounded bg-white/10" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Lazy-loaded comments list with inline composer for a specific post.
 */
export function CommentsSection({
  clubId,
  postId,
  currentUserId,
  initialCommentsCount = 0,
  isExpanded,
  onCountChange,
  canHostManage = false,
}: CommentsSectionProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const {
    comments,
    isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    prependComment,
    removeCommentById,
    updateCommentInState,
  } = usePaginatedComments({
    clubId,
    postId,
    enabled: isExpanded,
    refreshToken,
  });

  const lastLoggedCount = useRef(0);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }
    if (!isInitialLoading && comments.length !== lastLoggedCount.current) {
      console.log("[CommentsSection] - Loaded", comments.length, "comments");
      lastLoggedCount.current = comments.length;
    }
  }, [comments.length, isExpanded, isInitialLoading]);

  useEffect(() => {
    if (error) {
      console.error("[CommentsSection] - Error fetching comments", error);
    }
  }, [error]);

  const displayedCount = useMemo(() => {
    if (comments.length > 0) {
      return comments.length;
    }
    return initialCommentsCount;
  }, [comments.length, initialCommentsCount]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(displayedCount);
    }
  }, [displayedCount, onCountChange]);

  const charactersRemaining = Math.max(0, MAX_COMMENT_LENGTH - content.length);
  const isSubmitDisabled =
    !content.trim() ||
    content.length > MAX_COMMENT_LENGTH ||
    isSubmitting ||
    !isExpanded;

  const handleContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      if (nextValue.length <= MAX_COMMENT_LENGTH) {
        setContent(nextValue);
        return;
      }
      setContent(nextValue.slice(0, MAX_COMMENT_LENGTH));
    },
    []
  );

  const handleRetry = useCallback(() => {
    setRefreshToken((previous) => previous + 1);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmitDisabled) {
        return;
      }

      const trimmed = content.trim();
      if (!trimmed) {
        setComposerError("Comment cannot be empty.");
        return;
      }

      const optimisticComment = buildOptimisticComment(trimmed, currentUserId);
      prependComment(optimisticComment);
      setContent("");
      setComposerError(null);
      setIsSubmitting(true);

      try {
        const commentId = await createComment(clubId, postId, {
          authorId: currentUserId,
          content: trimmed,
        });

        console.log("[createComment] - Comment added successfully");
        removeCommentById(optimisticComment.id);
        prependComment({
          ...optimisticComment,
          id: commentId,
        });
      } catch (err) {
        console.error("[createComment] - Error adding comment", err);
        removeCommentById(optimisticComment.id);
        setComposerError(
          err instanceof Error ? err.message : COMPOSER_ERROR_FALLBACK
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      clubId,
      content,
      currentUserId,
      isSubmitDisabled,
      postId,
      prependComment,
      removeCommentById,
    ]
  );

  const renderComments = () => {
    if (isInitialLoading) {
      return <LoadingState />;
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <p>Something went wrong loading comments.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 text-sm font-medium text-red-200 underline"
          >
            Retry
          </button>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-sm text-zinc-400">
          No comments yet — be the first to share.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            clubId={clubId}
            postId={postId}
            comment={comment}
            currentUserId={currentUserId}
            canHostManage={canHostManage}
            onCommentUpdated={updateCommentInState}
            onCommentRemoved={removeCommentById}
          />
        ))}
      </div>
    );
  };

  return (
    <section
      aria-hidden={!isExpanded}
      className={`mt-4 space-y-4 ${isExpanded ? "" : "hidden"}`}
    >
      <header className="flex items-center justify-between text-sm text-zinc-500">
        <span className="font-semibold text-white">
          {displayedCount} {displayedCount === 1 ? "Comment" : "Comments"}
        </span>
      </header>

      {renderComments()}

      {!error && !isInitialLoading && hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoadingMore}
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-2 rounded-2xl border border-white/10 bg-[#1b1f24] p-4 shadow-lg"
      >
        <label className="block text-sm font-medium text-white">
          Share your thoughts
        </label>
        <textarea
          value={content}
          onChange={handleContentChange}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="Type your comment..."
          className="min-h-[90px] w-full resize-y rounded-xl border border-white/10 bg-[#14161a] p-3 text-sm text-zinc-100 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20"
          disabled={!isExpanded || isSubmitting}
        />
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{charactersRemaining} characters left</span>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            {isSubmitting ? "Posting…" : "Post comment"}
          </button>
        </div>
        {composerError && (
          <p className="text-sm text-red-600">{composerError}</p>
        )}
      </form>
    </section>
  );
}
