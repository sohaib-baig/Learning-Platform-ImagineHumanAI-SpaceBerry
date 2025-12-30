"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCommentsPaginated } from "@/lib/firestore/community";
import type { Comment } from "@/types/community";

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load comments for this post. Please try again.";

export const COMMENTS_PAGE_SIZE = 10;

export interface UsePaginatedCommentsOptions {
  clubId: string | null | undefined;
  postId: string | null | undefined;
  pageSize?: number;
  enabled?: boolean;
  refreshToken?: number;
}

export interface UsePaginatedCommentsReturn {
  comments: Comment[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  prependComment: (comment: Comment) => void;
  removeCommentById: (id: string) => void;
  updateCommentInState: (comment: Comment) => void;
}

const sanitizeIdentifier = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Encapsulates Firestore pagination logic for post comments.
 */
export function usePaginatedComments({
  clubId,
  postId,
  pageSize = COMMENTS_PAGE_SIZE,
  enabled = true,
  refreshToken = 0,
}: UsePaginatedCommentsOptions): UsePaginatedCommentsReturn {
  const normalizedClubId = useMemo(() => sanitizeIdentifier(clubId), [clubId]);
  const normalizedPostId = useMemo(() => sanitizeIdentifier(postId), [postId]);
  const contextKey = useMemo(() => {
    if (!normalizedClubId || !normalizedPostId) {
      return null;
    }
    return `${normalizedClubId}:${normalizedPostId}`;
  }, [normalizedClubId, normalizedPostId]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const lastVisibleRef =
    useRef<Awaited<ReturnType<typeof fetchCommentsPaginated>>["lastVisible"]>(
      null
    );
  const lastContextKeyRef = useRef<string | null>(null);
  const lastRefreshTokenRef = useRef(refreshToken);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const contextChanged = contextKey !== lastContextKeyRef.current;
    const refreshChanged = refreshToken !== lastRefreshTokenRef.current;
    const shouldReset = contextChanged || refreshChanged;

    if (shouldReset) {
      lastContextKeyRef.current = contextKey;
      lastRefreshTokenRef.current = refreshToken;
      hasLoadedRef.current = false;
      lastVisibleRef.current = null;
      setComments([]);
      setHasMore(false);
    }

    const loadInitialComments = async () => {
      if (!enabled) {
        return;
      }

      if (!contextKey || !normalizedClubId || !normalizedPostId) {
        if (isMounted) {
          setError("Missing club or post context.");
          setComments([]);
          setHasMore(false);
          setIsInitialLoading(false);
        }
        return;
      }

      if (!shouldReset && hasLoadedRef.current) {
        return;
      }

      setIsInitialLoading(true);
      setError(null);

      try {
        const { comments: fetchedComments, lastVisible } =
          await fetchCommentsPaginated(
            normalizedClubId,
            normalizedPostId,
            pageSize
          );

        if (!isMounted) {
          return;
        }

        setComments(fetchedComments);
        lastVisibleRef.current = lastVisible;
        setHasMore(fetchedComments.length === pageSize && Boolean(lastVisible));
        hasLoadedRef.current = true;
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE
          );
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void loadInitialComments();

    return () => {
      isMounted = false;
    };
  }, [enabled, contextKey, normalizedClubId, normalizedPostId, pageSize, refreshToken]);

  const loadMore = useCallback(async () => {
    if (
      !enabled ||
      !normalizedClubId ||
      !normalizedPostId ||
      isLoadingMore ||
      !hasMore ||
      !lastVisibleRef.current
    ) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const { comments: fetchedComments, lastVisible } =
        await fetchCommentsPaginated(
          normalizedClubId,
          normalizedPostId,
          pageSize,
          lastVisibleRef.current
        );

      setComments((previous) => {
        if (fetchedComments.length === 0) {
          return previous;
        }

        const seenIds = new Set(previous.map((comment) => comment.id));
        const deduped = [...previous];

        fetchedComments.forEach((comment) => {
          if (!seenIds.has(comment.id)) {
            deduped.push(comment);
          }
        });

        return deduped;
      });

      lastVisibleRef.current = lastVisible;
      setHasMore(fetchedComments.length === pageSize && Boolean(lastVisible));
    } catch (err) {
      setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    enabled,
    normalizedClubId,
    normalizedPostId,
    pageSize,
    isLoadingMore,
    hasMore,
  ]);

  const prependComment = useCallback((comment: Comment) => {
    setComments((previous) => {
      const filtered = previous.filter((existing) => existing.id !== comment.id);
      return [comment, ...filtered];
    });
  }, []);

  const removeCommentById = useCallback((id: string) => {
    setComments((previous) => previous.filter((comment) => comment.id !== id));
  }, []);

  const updateCommentInState = useCallback((nextComment: Comment) => {
    setComments((previous) => {
      let replaced = false;
      const updated = previous.map((existing) => {
        if (existing.id === nextComment.id) {
          replaced = true;
          return nextComment;
        }
        return existing;
      });

      return replaced ? updated : previous;
    });
  }, []);

  return {
    comments,
    isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    prependComment,
    removeCommentById,
    updateCommentInState,
  };
}


