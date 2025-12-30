"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { PostComposer } from "@/components/community/PostComposer";
import { PostCard, PostCardSkeleton } from "@/components/community/PostCard";
import { POSTS_PAGE_SIZE, usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import type { IntentTag, Post } from "@/types/community";
import { useClub } from "@/context/ClubContext";
import {
  INTENT_TAG_META,
  INTENT_TAG_ORDER,
} from "@/components/community/intentTagMeta";

export interface CommunityFeedProps {
  clubId: string;
  currentUserId: string;
  className?: string;
}

export interface ComposerPostPayload {
  postId: string;
  content: string;
  intentTag: IntentTag;
  authorId: string;
}

const buildOptimisticPost = (payload: ComposerPostPayload): Post => {
  const timestamp = Timestamp.fromDate(new Date());
  return {
    id: payload.postId,
    authorId: payload.authorId,
    content: payload.content,
    intentTag: payload.intentTag,
    createdAt: timestamp,
    updatedAt: timestamp,
    commentsCount: 0,
    hidden: false,
  };
};

const normalizeClubId = (clubId: string) => clubId?.trim();

/**
 * Community feed component with Firestore-backed pagination.
 */
export function CommunityFeed({
  clubId,
  currentUserId,
  className = "",
}: CommunityFeedProps) {
  const normalizedClubId = useMemo(() => normalizeClubId(clubId), [clubId]);
  const { canHostManage } = useClub();
  const [selectedIntent, setSelectedIntent] = useState<IntentTag | null>(null);
  const {
    posts,
    isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    prependPost,
    updatePostInState,
    removePostById,
  } = usePaginatedPosts({
    clubId: normalizedClubId,
    pageSize: POSTS_PAGE_SIZE,
  });

  const lastLoggedCount = useRef(0);

  useEffect(() => {
    if (!isInitialLoading && posts.length !== lastLoggedCount.current) {
      console.log("[CommunityFeed] - Loaded", posts.length, "posts");
      lastLoggedCount.current = posts.length;
    }
  }, [posts.length, isInitialLoading]);

  useEffect(() => {
    if (error) {
      console.error("[CommunityFeed] - Error fetching posts", error);
    }
  }, [error]);

  const handlePostCreated = useCallback(
    (payload: ComposerPostPayload) => {
      if (!payload?.postId) {
        return;
      }

      prependPost(buildOptimisticPost(payload));
    },
    [prependPost]
  );

  const handlePostUpdated = useCallback(
    (updatedPost: Post) => {
      updatePostInState(updatedPost);
    },
    [updatePostInState]
  );

  const handlePostRemoved = useCallback(
    (postId: string) => {
      removePostById(postId);
    },
    [removePostById]
  );

  const filteredPosts = useMemo(() => {
    if (!selectedIntent) {
      return posts;
    }
    return posts.filter((post) => post.intentTag === selectedIntent);
  }, [posts, selectedIntent]);

  const renderIntentFilters = () => {
    const options = INTENT_TAG_ORDER.map((tag) => ({
      tag,
      label: INTENT_TAG_META[tag].label,
      emoji: INTENT_TAG_META[tag].emoji,
    }));

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10141c]/80 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Filter by intent
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedIntent(null)}
            className={`
              rounded-full border px-3 py-1.5 text-sm font-semibold transition
              ${
                selectedIntent === null
                  ? "border-white/30 bg-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                  : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10"
              }
            `}
          >
            All
          </button>
          {options.map((intent) => {
            const isActive = selectedIntent === intent.tag;
            return (
              <button
                key={intent.tag}
                type="button"
                onClick={() => setSelectedIntent(intent.tag)}
                className={`
                  inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition
                  ${
                    isActive
                      ? "border-sky-400/60 bg-sky-500/20 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.4)]"
                      : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10"
                  }
                `}
                aria-pressed={isActive}
              >
                <span>{intent.emoji}</span>
                <span className="whitespace-nowrap">{intent.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!normalizedClubId) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        Club context missing — please refresh and try again.
      </div>
    );
  }

  const renderContent = () => {
    const postListClasses = "space-y-4";

    if (isInitialLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <PostCardSkeleton key={`feed-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          Something went wrong fetching posts. Please try again shortly.
        </div>
      );
    }

    const noPostsMessage = (
      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
        No posts yet — start the first conversation.
      </p>
    );

    const noFilteredMessage = (
      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
        No posts for this intent yet.
      </p>
    );

    const content =
      posts.length === 0
        ? noPostsMessage
        : filteredPosts.length === 0
          ? noFilteredMessage
          : (
            <div className={postListClasses}>
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  clubId={normalizedClubId}
                  post={post}
                  currentUserId={currentUserId}
                  canHostManage={canHostManage}
                  onPostUpdated={handlePostUpdated}
                  onPostRemoved={handlePostRemoved}
                />
              ))}
            </div>
          );

    return (
      <>
        {content}
        {hasMore && (
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={isLoadingMore}
              className={`
                rounded-full border border-white/10 bg-[#0f4a7f] px-6 py-2.5 text-sm font-semibold text-white
                transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#0c79c1] hover:shadow-[0_10px_35px_rgba(12,121,193,0.35)]
                disabled:cursor-not-allowed disabled:opacity-60
              `}
            >
              {isLoadingMore ? "Loading…" : "See more"}
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <section className={`space-y-6 ${className}`}>
      <PostComposer
        clubId={normalizedClubId}
        authorId={currentUserId}
        onPostCreated={handlePostCreated}
      />

      {renderIntentFilters()}

      {renderContent()}
    </section>
  );
}

CommunityFeed.displayName = "CommunityFeed";
