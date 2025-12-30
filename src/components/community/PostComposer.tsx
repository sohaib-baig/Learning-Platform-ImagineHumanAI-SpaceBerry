import React, { useEffect, useMemo, useRef, useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  createPost,
  MAX_POST_LENGTH as FIRESTORE_MAX_POST_LENGTH,
} from "@/lib/firestore/community";
import { IntentTag } from "@/types/community";
import { TagSelector } from "@/components/community/TagSelector";

export const MAX_POST_LENGTH = FIRESTORE_MAX_POST_LENGTH;
const INITIAL_COMMENTS_COUNT = 0;
const SUCCESS_MESSAGE_TIMEOUT_MS = 5000;

/** Props accepted by the PostComposer component. */
export interface PostComposerProps {
  clubId: string;
  authorId: string;
  onPostCreated?: (payload: PostComposerCreatedPayload) => void;
  className?: string;
}

export interface PostComposerCreatedPayload {
  postId: string;
  content: string;
  intentTag: IntentTag;
  authorId: string;
}

export interface PostInput {
  content: string;
  intentTag: IntentTag | null;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedContent?: string;
  error?: string;
}

export const VALIDATION_MESSAGES = {
  missingContent: "Share a thought before posting.",
  overLimit: `Keep it within ${MAX_POST_LENGTH} characters — short and clear works best.`,
  missingContext:
    "We’re missing your club or author info, try refreshing and posting again.",
  missingTag: "Pick a tag so people know what you need.",
  genericError: "Something glitched — give it another try in a moment.",
  success: "Shared with your space",
} as const;

/**
 * Pure helper that validates the composer inputs.
 */
export function validatePostInput({
  content,
  intentTag,
}: PostInput): ValidationResult {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return { isValid: false, error: VALIDATION_MESSAGES.missingContent };
  }

  if (trimmedContent.length > MAX_POST_LENGTH) {
    return { isValid: false, error: VALIDATION_MESSAGES.overLimit };
  }

  if (!intentTag) {
    return { isValid: false, error: VALIDATION_MESSAGES.missingTag };
  }

  return { isValid: true, sanitizedContent: trimmedContent };
}

/** Minimal composer for creating club posts with a single intent tag. */
export function PostComposer({
  clubId,
  authorId,
  onPostCreated,
  className = "",
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<IntentTag | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [intentExpanded, setIntentExpanded] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedClubId = clubId?.trim();
  const normalizedAuthorId = authorId?.trim();
  const isContextMissing = !normalizedClubId || !normalizedAuthorId;

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const characterCount = content.length;
  const trimmedContent = useMemo(() => content.trim(), [content]);
  const isOverLimit = characterCount > MAX_POST_LENGTH;
  const shouldShowContentReminder = characterCount > 0 && !trimmedContent;
  const isSubmitDisabled =
    isSubmitting ||
    isContextMissing ||
    !trimmedContent ||
    isOverLimit ||
    !selectedTag;
  const showMissingTag = trimmedContent.length > 0 && !selectedTag;

  const clearSuccessLater = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setIsSuccessVisible(false);
      successTimeoutRef.current = null;
    }, SUCCESS_MESSAGE_TIMEOUT_MS);
  };

  const handleContentChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setContent(event.target.value);
    if (!intentExpanded) {
      setIntentExpanded(true);
    }
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleTagChange = (tag: IntentTag) => {
    setSelectedTag(tag);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (isContextMissing) {
      setErrorMessage(VALIDATION_MESSAGES.missingContext);
      return;
    }

    if (!selectedTag) {
      setErrorMessage(VALIDATION_MESSAGES.missingTag);
      setIntentExpanded(true);
      return;
    }

    const tagToUse = selectedTag;
    const validation = validatePostInput({ content, intentTag: tagToUse });

    if (!validation.isValid || !validation.sanitizedContent) {
      setErrorMessage(validation.error ?? VALIDATION_MESSAGES.genericError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setIsSuccessVisible(false);

    try {
      const postId = await createPost(normalizedClubId, {
        authorId: normalizedAuthorId,
        content: validation.sanitizedContent,
        intentTag: tagToUse,
        commentsCount: INITIAL_COMMENTS_COUNT,
      });

      console.log("[PostComposer] - Post created", postId);
      setContent("");
      setIsSuccessVisible(true);
      clearSuccessLater();
      onPostCreated?.({
        postId,
        content: validation.sanitizedContent,
        intentTag: tagToUse,
        authorId: normalizedAuthorId,
      });
    } catch (error) {
      console.error("[PostComposer] - Error creating post", error);
      setErrorMessage(VALIDATION_MESSAGES.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        rounded-3xl border border-white/10 bg-[#131820]/95 p-4 sm:p-5 shadow-[0_25px_70px_rgba(0,0,0,0.45)] transition-all
        hover:border-white/20 hover:shadow-[0_30px_80px_rgba(0,0,0,0.5)]
        focus-within:border-white/30 focus-within:shadow-[0_35px_90px_rgba(0,0,0,0.55)]
        ${className}
      `}
      aria-describedby={errorMessage ? "post-composer-feedback" : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-sky-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M12 3v3" />
                  <path d="M12 18v3" />
                  <path d="M3 12h3" />
                  <path d="M18 12h3" />
                  <path d="M5.636 5.636 7.757 7.757" />
                  <path d="M16.243 16.243 18.364 18.364" />
                  <path d="M5.636 18.364 7.757 16.243" />
                  <path d="M16.243 7.757 18.364 5.636" />
                </svg>
              </span>
              <span>Create new</span>
            </p>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Keep the conversation flowing
            </h2>
          </div>
        </div>

        <div className="relative">
          <textarea
            id="post-content"
            name="post-content"
            onFocus={() => setIntentExpanded(true)}
            onBlur={() => {
              if (!content.trim()) {
                setIntentExpanded(false);
              }
            }}
            className={`
              w-full rounded-2xl border border-white/10 bg-[#161b24] px-4 pb-9 pr-16 pt-3 text-sm text-zinc-100
              placeholder:text-zinc-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/15
              disabled:opacity-60
            `}
            placeholder="What would you like to explore together?"
            value={content}
            onChange={handleContentChange}
            rows={4}
            disabled={isSubmitting || isContextMissing}
          />
          <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-zinc-500">
            {characterCount}/{MAX_POST_LENGTH}
          </span>
        </div>

        <div className="flex flex-col gap-1 text-xs text-red-400">
          {shouldShowContentReminder && (
            <p className="font-medium">
              {VALIDATION_MESSAGES.missingContent}
            </p>
          )}
          {isOverLimit && (
            <p className="font-medium">{VALIDATION_MESSAGES.overLimit}</p>
          )}
        </div>

        {intentExpanded && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Select intent
            </p>
            <TagSelector
              value={selectedTag}
              onChange={handleTagChange}
              disabled={isSubmitting || isContextMissing}
              className="pt-1"
            />
            {showMissingTag && (
              <p className="text-sm text-amber-300">
                {VALIDATION_MESSAGES.missingTag}
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <p
            id="post-composer-feedback"
            className="text-sm text-red-400"
            aria-live="assertive"
          >
            {errorMessage}
          </p>
        )}

        {isSuccessVisible && (
          <p className="text-sm text-emerald-400" aria-live="polite">
            {VALIDATION_MESSAGES.success}
          </p>
        )}

        {(intentExpanded || trimmedContent.length > 0) && (
          <div className="flex justify-end pt-1">
            <PrimaryButton
              type="submit"
              disabled={isSubmitDisabled}
              className="min-w-[110px] rounded-full px-5 py-2 font-semibold shadow-[0_12px_40px_rgba(12,121,193,0.45)]"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </form>
  );
}

PostComposer.displayName = "PostComposer";
