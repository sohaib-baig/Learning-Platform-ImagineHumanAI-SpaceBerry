"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNowStrict } from "date-fns";
import type { Comment } from "@/types/community";
import {
  MAX_COMMENT_LENGTH,
  softDeleteComment,
  updateComment,
} from "@/lib/firestore/community";

const FALLBACK_RELATIVE_TIME = "Just now";
const COMMENT_HIDDEN_PLACEHOLDER =
  "This comment is no longer visible to members.";
const COMMENT_DELETE_CONFIRMATION_MESSAGE =
  "Delete this comment? It will no longer be visible to members.";
const COMMENT_HIDE_CONFIRMATION_MESSAGE =
  "Hide this comment from members? Only hosts will be able to review it.";
const COMMENT_REMOVAL_DELAY_MS = 220;

const resolveAuthorLabel = (comment: Comment, currentUserId: string) =>
  comment.authorId === currentUserId ? "You" : "Club member";

const formatRelativeTimestamp = (comment: Comment) => {
  try {
    const date = comment.createdAt?.toDate?.();
    if (!date) {
      return FALLBACK_RELATIVE_TIME;
    }
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (error) {
    console.error("[CommentItem] - Failed to format timestamp", error);
    return FALLBACK_RELATIVE_TIME;
  }
};

export interface CommentItemProps {
  clubId: string;
  postId: string;
  comment: Comment;
  currentUserId: string;
  canHostManage?: boolean;
  onCommentUpdated?: (comment: Comment) => void;
  onCommentRemoved?: (commentId: string) => void;
}

/**
 * Presentational row displaying a single post comment with author metadata.
 */
export function CommentItem({
  clubId,
  postId,
  comment,
  currentUserId,
  canHostManage = false,
  onCommentUpdated,
  onCommentRemoved,
}: CommentItemProps) {
  const [localComment, setLocalComment] = useState(comment);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(comment.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isProcessingModeration, setIsProcessingModeration] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const removalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalComment(comment);
    setDraftContent(comment.content);
  }, [comment]);

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

  const isAuthor = localComment.authorId === currentUserId;
  const authorLabel = resolveAuthorLabel(localComment, currentUserId);
  const relativeTime = formatRelativeTimestamp(localComment);
  const isHidden = localComment.hidden === true;
  const wasEdited =
    Boolean(localComment.updatedAt && localComment.createdAt) &&
    localComment.updatedAt.toMillis() > localComment.createdAt.toMillis();
  const charactersRemaining = Math.max(
    0,
    MAX_COMMENT_LENGTH - draftContent.length
  );

  const closeMenu = () => setIsMenuOpen(false);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    setDraftContent(localComment.content);
    setEditError(null);
    closeMenu();
  }, [localComment.content]);

  const handleCancelEditing = () => {
    setIsEditing(false);
    setDraftContent(localComment.content);
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
      setEditError("Comment cannot be empty.");
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setEditError(
        `Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`
      );
      return;
    }

    setIsSavingEdit(true);
    setActionError(null);

    try {
      await updateComment({
        clubId,
        postId,
        commentId: localComment.id,
        actorId: currentUserId,
        content: trimmed,
      });

      const updatedComment: Comment = {
        ...localComment,
        content: trimmed,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      setLocalComment(updatedComment);
      onCommentUpdated?.(updatedComment);
      setIsEditing(false);
    } catch (error) {
      console.error("[CommentItem] - Failed to update comment", error);
      setEditError(
        error instanceof Error
          ? error.message
          : "We couldn't update this comment. Please try again."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const triggerRemoval = () => {
    if (!onCommentRemoved) {
      return;
    }

    setIsRemoving(true);
    if (removalTimerRef.current) {
      clearTimeout(removalTimerRef.current);
    }

    removalTimerRef.current = setTimeout(() => {
      onCommentRemoved(localComment.id);
    }, COMMENT_REMOVAL_DELAY_MS);
  };

  const handleSoftDelete = async (mode: "delete" | "hide") => {
    const confirmationMessage =
      mode === "hide"
        ? COMMENT_HIDE_CONFIRMATION_MESSAGE
        : COMMENT_DELETE_CONFIRMATION_MESSAGE;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setIsProcessingModeration(true);
    setActionError(null);

    try {
      await softDeleteComment({
        clubId,
        postId,
        commentId: localComment.id,
        actorId: currentUserId,
        mode,
      });

      const updatedComment: Comment = {
        ...localComment,
        hidden: true,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      setLocalComment(updatedComment);
      onCommentUpdated?.(updatedComment);
      closeMenu();
      triggerRemoval();
    } catch (error) {
      console.error(`[CommentItem] - Failed to ${mode} comment`, error);
      setActionError(
        error instanceof Error
          ? error.message
          : "We couldn't update this comment. Please try again."
      );
    } finally {
      setIsProcessingModeration(false);
    }
  };

  const renderCommentBody = () => {
    if (isEditing) {
      return (
        <div className="mt-2">
          <textarea
            value={draftContent}
            onChange={handleDraftChange}
            maxLength={MAX_COMMENT_LENGTH}
            rows={4}
            disabled={isSavingEdit}
            className="w-full rounded-lg border border-white/10 bg-[#14161a] p-2 text-sm text-zinc-100 outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/20 disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
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
                className="rounded-full bg-primary/90 px-3 py-1 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary/40"
              >
                {isSavingEdit ? "Saving..." : "Save"}
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
        <p className="mt-2 rounded-lg bg-white/5 p-2 text-sm text-zinc-400">
          {COMMENT_HIDDEN_PLACEHOLDER}
        </p>
      );
    }

    return (
      <p className="mt-2 whitespace-pre-line text-sm text-zinc-100">
        {localComment.content}
      </p>
    );
  };

  const moderationMenuVisible = isAuthor || canHostManage;

  return (
    <article
      className={`
        rounded-2xl border border-white/10 bg-[#15181c] p-3 text-xs text-zinc-400 transition-all duration-200
        ${isRemoving ? "translate-y-1 opacity-0" : ""}
      `}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <span className="font-medium text-white">{authorLabel}</span>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {relativeTime}
            {wasEdited && (
              <span className="ml-1 text-zinc-500" aria-label="Edited comment">
                (edited)
              </span>
            )}
          </p>
        </div>
        {moderationMenuVisible && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Comment actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((previous) => !previous)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-base text-zinc-300 transition hover:border-white/30 hover:bg-white/5"
            >
              ...
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-white/10 bg-[#15181c] p-1 shadow-2xl"
              >
                {isAuthor && (
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/5"
                  >
                    Edit comment
                  </button>
                )}
                {(isAuthor || canHostManage) && (
                  <button
                    type="button"
                    onClick={() => void handleSoftDelete("delete")}
                    disabled={isProcessingModeration}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete comment
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
      </header>

      {isHidden && (
        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          Hidden
        </span>
      )}

      {renderCommentBody()}

      {actionError && (
        <p className="mt-2 text-sm text-red-600">{actionError}</p>
      )}
    </article>
  );
}

CommentItem.displayName = "CommentItem";


