"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNowStrict } from "date-fns";
import type { Post } from "@/types/community";
import { INTENT_TAG_META } from "@/components/community/intentTagMeta";
import { CommentsSection } from "@/components/community/CommentsSection";
import {
  MAX_POST_LENGTH,
  softDeletePost,
  updatePostContent,
} from "@/lib/firestore/community";

const FALLBACK_RELATIVE_TIME = "Just now";
const HIDDEN_PLACEHOLDER_MESSAGE = "This post is no longer visible to members.";
const DELETE_CONFIRMATION_MESSAGE =
  "Are you sure you want to delete this post? Members will no longer see it.";
const HIDE_CONFIRMATION_MESSAGE =
  "Hide this post from members? They will no longer see it.";
const REMOVAL_ANIMATION_MS = 260;

export interface PostCardProps {
  clubId: string;
  post: Post;
  currentUserId: string;
  className?: string;
  canHostManage?: boolean;
  onPostUpdated?: (post: Post) => void;
  onPostRemoved?: (postId: string) => void;
}

const resolveAuthorLabel = (post: Post, currentUserId: string) =>
  post.authorId === currentUserId ? "You" : "Club member";

const formatRelativeTimestamp = (post: Post) => {
  try {
    const date = post.createdAt?.toDate?.();
    if (!date) {
      return FALLBACK_RELATIVE_TIME;
    }
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (error) {
    console.error("[PostCard] - Failed to format timestamp", error);
    return FALLBACK_RELATIVE_TIME;
  }
};

/**
 * Presentational card showing a single community post.
 */
export function PostCard({
  clubId,
  post,
  currentUserId,
  className = "",
  canHostManage = false,
  onPostUpdated,
  onPostRemoved,
}: PostCardProps) {
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(post.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isProcessingModeration, setIsProcessingModeration] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const removalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalPost(post);
    setDraftContent(post.content);
  }, [post]);

  useEffect(() => {
    setCommentCount(post.commentsCount);
  }, [post.commentsCount]);

  useEffect(() => {
    return () => {
      if (removalTimerRef.current) {
        clearTimeout(removalTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [isMenuOpen]);

  const isAuthor = localPost.authorId === currentUserId;
  const authorLabel = resolveAuthorLabel(localPost, currentUserId);
  const relativeTime = formatRelativeTimestamp(localPost);
  const tagMeta =
    INTENT_TAG_META[localPost.intentTag] ??
    ({ emoji: "💬", label: "Conversation" } as const);
  const wasEdited =
    Boolean(localPost.updatedAt && localPost.createdAt) &&
    localPost.updatedAt.toMillis() > localPost.createdAt.toMillis();
  const isHidden = localPost.hidden === true;
  const commentCountLabel = commentCount === 1 ? "comment" : "comments";
  const charactersRemaining = Math.max(
    0,
    MAX_POST_LENGTH - draftContent.length
  );
  const authorInitial = authorLabel.charAt(0).toUpperCase();

  const closeMenu = () => setIsMenuOpen(false);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    setDraftContent(localPost.content);
    setEditError(null);
    closeMenu();
  }, [localPost.content]);

  const handleCancelEditing = () => {
    setIsEditing(false);
    setDraftContent(localPost.content);
    setEditError(null);
  };

  const handleDraftChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDraftContent(event.target.value);
    if (editError) {
      setEditError(null);
    }
  };

  const handleSaveEdit = async () => {
    const trimmed = draftContent.trim();

    if (!trimmed) {
      setEditError("Post content cannot be empty.");
      return;
    }

    if (trimmed.length > MAX_POST_LENGTH) {
      setEditError(`Posts must be ${MAX_POST_LENGTH} characters or fewer.`);
      return;
    }

    setIsSavingEdit(true);
    setActionError(null);

    try {
      await updatePostContent({
        clubId,
        postId: localPost.id,
        actorId: currentUserId,
        content: trimmed,
      });

      const updatedPost: Post = {
        ...localPost,
        content: trimmed,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      setLocalPost(updatedPost);
      onPostUpdated?.(updatedPost);
      setIsEditing(false);
    } catch (error) {
      console.error("[PostCard] - Failed to update post content", error);
      setEditError(
        error instanceof Error
          ? error.message
          : "We couldn't update this post. Please try again."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const triggerRemoval = () => {
    if (!onPostRemoved) {
      return;
    }

    setIsRemoving(true);
    if (removalTimerRef.current) {
      clearTimeout(removalTimerRef.current);
    }

    removalTimerRef.current = setTimeout(() => {
      onPostRemoved(localPost.id);
    }, REMOVAL_ANIMATION_MS);
  };

  const handleSoftDelete = async (mode: "delete" | "hide") => {
    const confirmationMessage =
      mode === "hide" ? HIDE_CONFIRMATION_MESSAGE : DELETE_CONFIRMATION_MESSAGE;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsProcessingModeration(true);
    setActionError(null);

    try {
      await softDeletePost({
        clubId,
        postId: localPost.id,
        actorId: currentUserId,
        mode,
      });

      const updatedPost: Post = {
        ...localPost,
        hidden: true,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      setLocalPost(updatedPost);
      onPostUpdated?.(updatedPost);
      closeMenu();
      triggerRemoval();
    } catch (error) {
      console.error(`[PostCard] - Failed to ${mode} post`, error);
      setActionError(
        error instanceof Error
          ? error.message
          : "We couldn't update this post. Please try again."
      );
    } finally {
      setIsProcessingModeration(false);
    }
  };

  const renderPostBody = () => {
    if (isEditing) {
      return (
        <div className="mt-4">
          <textarea
            value={draftContent}
            onChange={handleDraftChange}
            maxLength={MAX_POST_LENGTH}
            rows={5}
            disabled={isSavingEdit}
            className="w-full rounded-xl border border-white/10 bg-[#14161a] p-3 text-sm text-zinc-100 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20 disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span>{charactersRemaining} characters left</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                className="rounded-full border border-white/10 px-3 py-1 font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="rounded-full bg-primary/90 px-4 py-1 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary/40"
              >
                {isSavingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
          {editError && (
            <p className="mt-2 text-sm text-red-600">{editError}</p>
          )}
        </div>
      );
    }

    if (isHidden) {
      return (
        <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-zinc-400">
          {HIDDEN_PLACEHOLDER_MESSAGE}
        </p>
      );
    }

    return (
      <p className="mt-4 whitespace-pre-line text-sm text-zinc-100">
        {localPost.content}
      </p>
    );
  };

  const moderationMenuVisible = isAuthor || canHostManage;

  return (
    <article
      className={`
        rounded-3xl border border-white/8 bg-[#141922]/92 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300
        hover:border-white/15 hover:shadow-[0_25px_70px_rgba(0,0,0,0.5)] ${isRemoving ? "translate-y-1 opacity-0" : ""} ${className}
      `}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold uppercase text-zinc-200">
            {authorInitial}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{authorLabel}</p>
            <p className="text-xs text-zinc-500">
              {relativeTime}
              {wasEdited && (
                <span className="ml-2 text-zinc-500" aria-label="Edited post">
                  (edited)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHidden && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Hidden
            </span>
          )}
          <span
            className="
              inline-flex items-center gap-1 rounded-full border border-white/10
              bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200
            "
          >
            <span>{tagMeta.emoji}</span>
            <span>{tagMeta.label}</span>
          </span>
          {moderationMenuVisible && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Post actions"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((previous) => !previous)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-zinc-300 transition hover:border-white/30 hover:bg-white/5"
              >
                ...
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-white/10 bg-[#15181c] p-1 shadow-2xl"
                >
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={handleStartEditing}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5"
                    >
                      Edit post
                    </button>
                  )}
                  {(isAuthor || canHostManage) && (
                    <button
                      type="button"
                      onClick={() => void handleSoftDelete("delete")}
                      disabled={isProcessingModeration}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete post
                    </button>
                  )}
                  {canHostManage && (
                    <button
                      type="button"
                      onClick={() => void handleSoftDelete("hide")}
                      disabled={isProcessingModeration}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Hide from members
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {renderPostBody()}

      {actionError && (
        <p className="mt-3 text-sm text-red-600">{actionError}</p>
      )}

      {!isHidden && (
        <footer className="mt-5 border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={() => setShowComments((previous) => !previous)}
            disabled={isHidden}
            className="
              inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 transition
              hover:text-white disabled:cursor-not-allowed disabled:opacity-60
            "
          >
            <span>{showComments ? "Hide comments" : "View comments"}</span>
          </button>
          <span className="mt-2 block text-xs text-zinc-500">
            {commentCount} {commentCountLabel}
          </span>

          <CommentsSection
            clubId={clubId}
            postId={localPost.id}
            currentUserId={currentUserId}
            initialCommentsCount={localPost.commentsCount}
            isExpanded={showComments}
            canHostManage={canHostManage}
            onCountChange={setCommentCount}
          />
        </footer>
      )}
    </article>
  );
}

export interface PostCardSkeletonProps {
  className?: string;
}

export function PostCardSkeleton({ className = "" }: PostCardSkeletonProps) {
  return (
    <div
      className={`
        animate-pulse rounded-3xl border border-white/8 bg-[#141922]/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/5" />
        </div>
        <div className="h-6 w-32 rounded-full bg-white/5" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
        <div className="h-3 w-2/3 rounded bg-white/5" />
      </div>
      <div className="mt-4 h-3 w-32 rounded bg-white/5" />
    </div>
  );
}

PostCard.displayName = "PostCard";
PostCardSkeleton.displayName = "PostCardSkeleton";
