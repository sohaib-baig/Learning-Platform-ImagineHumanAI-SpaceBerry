import React, { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { FormRow } from "@/components/ui/FormRow";
import { HostLesson } from "./types";
import { isValidYouTubeUrl } from "@/lib/youtube";

type LessonEditorMode = "create" | "edit";

interface LessonEditorProps {
  open: boolean;
  mode: LessonEditorMode;
  clubId: string;
  journeyId: string;
  lesson?: HostLesson;
  onClose: () => void;
  onSaved: (lesson: HostLesson) => void;
}

interface LessonFormState {
  title: string;
  description: string;
  durationMinutes: string;
  contentType: "video" | "article" | "exercise";
  content: string;
  videoUrl: string;
  isPublished: boolean;
  isArchived: boolean;
}

const defaultFormState: LessonFormState = {
  title: "",
  description: "",
  durationMinutes: "",
  contentType: "article",
  content: "",
  videoUrl: "",
  isPublished: false,
  isArchived: false,
};

function buildInitialState(
  mode: LessonEditorMode,
  lesson?: HostLesson
): LessonFormState {
  if (mode === "edit" && lesson) {
    return {
      title: lesson.title ?? "",
      description: lesson.description ?? "",
      durationMinutes:
        typeof lesson.durationMinutes === "number"
          ? String(lesson.durationMinutes)
          : "",
      contentType: lesson.contentType ?? "article",
      content: lesson.content ?? "",
      videoUrl: lesson.videoUrl ?? "",
      isPublished: lesson.isPublished ?? false,
      isArchived: lesson.isArchived ?? false,
    };
  }
  return defaultFormState;
}

export function LessonEditor({
  open,
  mode,
  clubId,
  journeyId,
  lesson,
  onClose,
  onSaved,
}: LessonEditorProps) {
  const [formState, setFormState] = useState<LessonFormState>(() =>
    buildInitialState(mode, lesson)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormState(buildInitialState(mode, lesson));
      setError(null);
    }
  }, [mode, lesson, open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const contentFieldLabel = useMemo(() => {
    switch (formState.contentType) {
      case "video":
        return "YouTube Video URL";
      case "exercise":
        return "Exercise Instructions";
      default:
        return "Content (Markdown supported)";
    }
  }, [formState.contentType]);

  const isVideoLesson = formState.contentType === "video";
  const initialVideoUrl = lesson?.videoUrl?.trim() ?? "";
  const videoUrlChanged =
    mode === "create" ? true : formState.videoUrl.trim() !== initialVideoUrl;
  const initialContentType = lesson?.contentType ?? "article";
  const contentTypeChanged =
    mode === "create" || formState.contentType !== initialContentType;

  const handleChange = <Field extends keyof LessonFormState>(
    field: Field,
    value: LessonFormState[Field]
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!open) {
    return null;
  }

  const handleSubmit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User is not authenticated.");
      }

      const idToken = await currentUser.getIdToken();

      const payload: Record<string, unknown> = {
        title: formState.title.trim(),
        description: formState.description.trim(),
        isPublished: formState.isPublished,
        isArchived: formState.isArchived,
      };

      if (formState.durationMinutes) {
        const parsed = Number.parseInt(formState.durationMinutes, 10);
        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error("Duration must be a positive number.");
        }
        payload.durationMinutes = parsed;
      }

      const trimmedVideoUrl = formState.videoUrl.trim();
      const trimmedContent = formState.content.trim();

      if (isVideoLesson) {
        if (!trimmedVideoUrl) {
          throw new Error("Video lessons require a YouTube URL.");
        }
        if (!isValidYouTubeUrl(trimmedVideoUrl)) {
          throw new Error("Please provide a valid YouTube video URL.");
        }
        if (videoUrlChanged || mode === "create" || contentTypeChanged) {
          payload.videoUrl = trimmedVideoUrl;
        }
      } else {
        if (!trimmedContent) {
          throw new Error("Please provide content for this lesson.");
        }
        payload.content = trimmedContent;
        if (contentTypeChanged && initialContentType === "video") {
          payload.videoUrl = "";
        }
      }

      if (contentTypeChanged) {
        payload.contentType = formState.contentType;
        if (!isVideoLesson) {
          payload.videoUrl = "";
        }
      }

      const endpoint =
        mode === "create"
          ? `/api/clubs/${clubId}/journeys/${journeyId}/lessons`
          : `/api/clubs/${clubId}/journeys/${journeyId}/lessons/${lesson?.id}`;

      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error ||
          (mode === "create"
            ? "Failed to create lesson."
            : "Failed to update lesson.");
        throw new Error(message);
      }

      const { lesson: updatedLesson } = (await response.json()) as {
        lesson: HostLesson;
      };

      onSaved(updatedLesson);
      onClose();
    } catch (err) {
      console.error("[LessonEditor] Error:", err);
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1118]/95 shadow-[0_25px_70px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
              {mode === "create" ? "New lesson" : "Edit lesson"}
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {mode === "create" ? "Create Lesson" : "Edit Lesson"}
            </h2>
            <p className="text-sm text-zinc-500">
              {mode === "create"
                ? "Add a new lesson to your journey."
                : "Update the details for this lesson."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:border-white/30 hover:text-white"
          >
            <span className="sr-only">Close</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-12rem)] space-y-6 overflow-y-auto px-8 py-8"
        >
          <FormRow label="Title" htmlFor="lesson-title" required>
            <input
              id="lesson-title"
              type="text"
              value={formState.title}
              onChange={(event) => handleChange("title", event.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow
            label="Short Description"
            htmlFor="lesson-description"
            description="Displayed alongside the lesson title in some contexts."
          >
            <textarea
              id="lesson-description"
              rows={3}
              value={formState.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <div className="grid gap-4 md:grid-cols-2">
            <FormRow
              label="Duration (minutes)"
              htmlFor="lesson-duration"
              description="Approximate time to complete this lesson."
            >
              <input
                id="lesson-duration"
                type="number"
                min={0}
                value={formState.durationMinutes}
                onChange={(event) =>
                  handleChange("durationMinutes", event.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
            </FormRow>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">
              Lessons are automatically appended to the end of the journey.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormRow
              label="Content Type"
              htmlFor="lesson-content-type"
              description="Choose Video to embed a YouTube link; Article and Exercise use rich text."
            >
              <select
                id="lesson-content-type"
                value={formState.contentType}
                onChange={(event) =>
                  handleChange(
                    "contentType",
                    event.target.value as LessonFormState["contentType"]
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              >
                <option value="article">Article</option>
                <option value="video">Video</option>
                <option value="exercise">Exercise</option>
              </select>
            </FormRow>

            {formState.contentType === "video" ? (
              <FormRow
                label={contentFieldLabel}
                htmlFor="lesson-video-url"
                description="Example: https://www.youtube.com/watch?v=abc123xyz00"
              >
                <input
                  id="lesson-video-url"
                  type="url"
                  inputMode="url"
                  required={formState.contentType === "video"}
                  value={formState.videoUrl}
                  onChange={(event) =>
                    handleChange("videoUrl", event.target.value)
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
              </FormRow>
            ) : (
              <FormRow label={contentFieldLabel} htmlFor="lesson-content">
                <textarea
                  id="lesson-content"
                  rows={6}
                  value={formState.content}
                  onChange={(event) =>
                    handleChange("content", event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                />
              </FormRow>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={formState.isPublished}
                onChange={(event) =>
                  handleChange("isPublished", event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>Published</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={formState.isArchived}
                onChange={(event) =>
                  handleChange("isArchived", event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>Archived</span>
            </label>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || formState.title.trim().length === 0}
              className="inline-flex items-center justify-center rounded-2xl border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Create Lesson"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
