"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPostsPaginated } from "@/lib/firestore/community";
import type { Post } from "@/types/community";

const DEFAULT_ERROR_MESSAGE =
  "We couldn't load posts for this club. Please try again.";

export const POSTS_PAGE_SIZE = 20;

export interface UsePaginatedPostsOptions {
  clubId: string | null | undefined;
  pageSize?: number;
}

export interface UsePaginatedPostsReturn {
  posts: Post[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  prependPost: (post: Post) => void;
  updatePostInState: (post: Post) => void;
  removePostById: (postId: string) => void;
}

const sanitizeClubId = (clubId?: string | null): string | null => {
  const trimmed = clubId?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Encapsulates Firestore pagination logic for club community posts.
 */
export function usePaginatedPosts({
  clubId,
  pageSize = POSTS_PAGE_SIZE,
}: UsePaginatedPostsOptions): UsePaginatedPostsReturn {
  const normalizedClubId = useMemo(() => sanitizeClubId(clubId), [clubId]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const lastVisibleRef =
    useRef<Awaited<ReturnType<typeof fetchPostsPaginated>>["lastVisible"]>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialPosts = async () => {
      setIsInitialLoading(true);
      setError(null);
      setPosts([]);
      setHasMore(false);
      lastVisibleRef.current = null;

      if (!normalizedClubId) {
        setIsInitialLoading(false);
        setError("Missing club context.");
        return;
      }

      try {
        const { posts: fetchedPosts, lastVisible } = await fetchPostsPaginated(
          normalizedClubId,
          pageSize
        );

        if (!isMounted) {
          return;
        }

        setPosts(fetchedPosts);
        lastVisibleRef.current = lastVisible;
        setHasMore(fetchedPosts.length === pageSize && Boolean(lastVisible));
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

    void loadInitialPosts();

    return () => {
      isMounted = false;
    };
  }, [normalizedClubId, pageSize]);

  const loadMore = useCallback(async () => {
    if (
      !normalizedClubId ||
      isLoadingMore ||
      !hasMore ||
      !lastVisibleRef.current
    ) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const { posts: fetchedPosts, lastVisible } = await fetchPostsPaginated(
        normalizedClubId,
        pageSize,
        lastVisibleRef.current
      );

      setPosts((previous) => {
        if (fetchedPosts.length === 0) {
          return previous;
        }

        const seenIds = new Set(previous.map((post) => post.id));
        const deduped = [...previous];

        fetchedPosts.forEach((post) => {
          if (!seenIds.has(post.id)) {
            deduped.push(post);
          }
        });

        return deduped;
      });

      lastVisibleRef.current = lastVisible;
      setHasMore(fetchedPosts.length === pageSize && Boolean(lastVisible));
    } catch (err) {
      setError(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoadingMore(false);
    }
  }, [normalizedClubId, pageSize, isLoadingMore, hasMore]);

  const prependPost = useCallback((post: Post) => {
    setPosts((previous) => {
      const filtered = previous.filter((existing) => existing.id !== post.id);
      return [post, ...filtered];
    });
  }, []);

  const updatePostInState = useCallback((nextPost: Post) => {
    setPosts((previous) => {
      let replaced = false;
      const updated = previous.map((existing) => {
        if (existing.id === nextPost.id) {
          replaced = true;
          return nextPost;
        }
        return existing;
      });

      return replaced ? updated : previous;
    });
  }, []);

  const removePostById = useCallback((postId: string) => {
    setPosts((previous) => {
      const filtered = previous.filter((post) => post.id !== postId);
      return filtered.length === previous.length ? previous : filtered;
    });
  }, []);

  return {
    posts,
    isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    prependPost,
    updatePostInState,
    removePostById,
  };
}


