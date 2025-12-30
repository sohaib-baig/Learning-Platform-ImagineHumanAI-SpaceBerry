import React, { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import type { ClubJourney } from "@/types/club";
import { FormRow } from "@/components/ui/FormRow";
import { useClub } from "@/context/ClubContext";

type JourneyEditorMode = "create" | "edit";

interface JourneyEditorProps {
  open: boolean;
  mode: JourneyEditorMode;
  clubId: string;
  journey?: ClubJourney;
  onClose: () => void;
  onSaved: (journey: ClubJourney) => void;
}

interface FormState {
  title: string;
  description: string;
  summary: string;
  estimatedMinutes: string;
  isPublished: boolean;
  isArchived: boolean;
}

const defaultFormState: FormState = {
  title: "",
  description: "",
  summary: "",
  estimatedMinutes: "",
  isPublished: false,
  isArchived: false,
};

function createInitialState(
  mode: JourneyEditorMode,
  journey?: ClubJourney
): FormState {
  if (mode === "edit" && journey) {
    return {
      title: journey.title ?? "",
      description: journey.description ?? "",
      summary: journey.summary ?? "",
      estimatedMinutes:
        journey.estimatedMinutes !== undefined &&
        journey.estimatedMinutes !== null
          ? String(journey.estimatedMinutes)
          : "",
      isPublished: journey.isPublished ?? false,
      isArchived: journey.isArchived ?? false,
    };
  }
  return defaultFormState;
}

export function JourneyEditor({
  open,
  mode,
  clubId,
  journey,
  onClose,
  onSaved,
}: JourneyEditorProps) {
  const { clubData } = useClub();
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialState(mode, journey)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormState(createInitialState(mode, journey));
      setError(null);
    }
  }, [mode, journey, open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const titlePlaceholder = useMemo(
    () => (mode === "create" ? "New journey title" : (journey?.title ?? "")),
    [mode, journey?.title]
  );

  const slugPreview = useMemo(() => {
    if (!journey?.slug) {
      return null;
    }
    const clubSlug = clubData?.info.slug;
    return clubSlug
      ? `/club/${clubSlug}/journey/${journey.slug}`
      : journey.slug;
  }, [clubData?.info.slug, journey?.slug]);

  const handleInputChange = (
    field: keyof FormState,
    value: string | boolean
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
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
        summary: formState.summary.trim(),
        isPublished: formState.isPublished,
        isArchived: formState.isArchived,
      };

      if (formState.estimatedMinutes) {
        const minutes = Number.parseInt(formState.estimatedMinutes, 10);
        if (Number.isNaN(minutes) || minutes < 0) {
          throw new Error("Estimated minutes must be a positive number.");
        }
        payload.estimatedMinutes = minutes;
      }

      const endpoint =
        mode === "create"
          ? `/api/clubs/${clubId}/journeys`
          : `/api/clubs/${clubId}/journeys/${journey?.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
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
            ? "Failed to create journey."
            : "Failed to update journey.");
        throw new Error(message);
      }

      const { journey: updatedJourney } = (await response.json()) as {
        journey: ClubJourney;
      };

      onSaved(updatedJourney);
      onClose();
    } catch (err) {
      console.error("[JourneyEditor] Submit error:", err);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#10131a]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
              {mode === "create" ? "New journey" : "Edit journey"}
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {mode === "create" ? "Create Journey" : "Edit Journey"}
            </h2>
            <p className="text-sm text-zinc-500">
              Configure the journey details members will see.
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
          <FormRow label="Title" htmlFor="journey-title" required>
            <input
              id="journey-title"
              type="text"
              required
              value={formState.title}
              onChange={(event) =>
                handleInputChange("title", event.target.value)
              }
              placeholder={titlePlaceholder}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow
            label="Summary"
            htmlFor="journey-summary"
            description="Short overview shown on cards and previews."
          >
            <textarea
              id="journey-summary"
              value={formState.summary}
              onChange={(event) =>
                handleInputChange("summary", event.target.value)
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow
            label="Description"
            htmlFor="journey-description"
            description="Full description displayed on the journey page."
          >
            <textarea
              id="journey-description"
              value={formState.description}
              onChange={(event) =>
                handleInputChange("description", event.target.value)
              }
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow
            label="Estimated Minutes"
            htmlFor="journey-estimated-minutes"
            description="Approximate total time to complete this journey."
          >
            <input
              id="journey-estimated-minutes"
              type="number"
              min={0}
              step={5}
              value={formState.estimatedMinutes}
              onChange={(event) =>
                handleInputChange("estimatedMinutes", event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow
            label="Journey URL"
            description="Slugs are generated automatically from the title and cannot be edited."
          >
            {slugPreview ? (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <span className="truncate">{slugPreview}</span>
                <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">
                  Locked
                </span>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {mode === "create"
                  ? "A unique slug will be generated when you save this journey."
                  : "This journey will receive a slug the next time you save it."}
              </p>
            )}
          </FormRow>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={formState.isPublished}
                onChange={(event) =>
                  handleInputChange("isPublished", event.target.checked)
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
                  handleInputChange("isArchived", event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>Mark as archived</span>
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
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || formState.title.trim().length === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(78,140,255,0.35)] transition hover:bg-[#437be0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Create Journey"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
