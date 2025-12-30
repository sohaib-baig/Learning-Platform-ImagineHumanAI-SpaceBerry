import React, { useCallback, useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import type { ClubJourney } from "@/types/club";
import { LessonList } from "./LessonList";
import { LessonEditor } from "./LessonEditor";
import { HostLesson } from "./types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HostGate } from "@/components/host/HostGate";

type LessonEditorState =
  | { mode: "create" }
  | { mode: "edit"; lesson: HostLesson };

interface LessonManagerProps {
  clubId: string;
  journey: ClubJourney;
  onClose: () => void;
}

export function LessonManager({ clubId, journey, onClose }: LessonManagerProps) {
  const [lessons, setLessons] = useState<HostLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonEditorState, setLessonEditorState] =
    useState<LessonEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostLesson | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [listProcessing, setListProcessing] = useState(false);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User is not authenticated.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `/api/clubs/${clubId}/journeys/${journey.id}/lessons`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to load lessons.");
      }

      const data = (await response.json()) as {
        lessons: HostLesson[];
      };

      setLessons(
        (data.lessons ?? []).map((lesson) => ({
          ...lesson,
          order: lesson.order ?? 0,
        }))
      );
    } catch (err) {
      console.error("[LessonManager] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load lessons.");
    } finally {
      setLoading(false);
    }
  }, [clubId, journey.id]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleLessonSaved = (lesson: HostLesson) => {
    setLessons((prevLessons) => {
      const existingIndex = prevLessons.findIndex((item) => item.id === lesson.id);
      if (existingIndex === -1) {
        return [...prevLessons, lesson].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
      }
      const updated = [...prevLessons];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...lesson,
      };
      return updated.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
  };

  const handleLessonDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleteLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User is not authenticated.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `/api/clubs/${clubId}/journeys/${journey.id}/lessons/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to delete lesson.");
      }

      setLessons((prevLessons) =>
        prevLessons.filter((lessonItem) => lessonItem.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      console.error("[LessonManager] Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete lesson.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLessonReorder = async (lessonIds: string[]) => {
    setListProcessing(true);
    setError(null);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User is not authenticated.");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `/api/clubs/${clubId}/journeys/${journey.id}/lessons/reorder`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ lessonIds }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to reorder lessons.");
      }

      setLessons((prevLessons) => {
        const lessonMap = new Map(
          prevLessons.map((lesson) => [lesson.id, lesson])
        );
        const reordered: HostLesson[] = [];
        lessonIds.forEach((lessonId, index) => {
          const lesson = lessonMap.get(lessonId);
          if (lesson) {
            reordered.push({
              ...lesson,
              order: index,
            });
          }
        });
        const remaining = prevLessons.filter(
          (lesson) => !lessonIds.includes(lesson.id)
        );
        return [...reordered, ...remaining];
      });
    } catch (err) {
      console.error("[LessonManager] Reorder error:", err);
      setError(err instanceof Error ? err.message : "Failed to reorder lessons.");
    } finally {
      setListProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0d1118]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        <div className="flex flex-col gap-4 border-b border-white/5 px-8 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
              Lesson Manager
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {journey.title}
            </h2>
            {journey.summary && (
              <p className="mt-1 text-sm text-zinc-500">{journey.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <HostGate>
              <button
                type="button"
                onClick={() => setLessonEditorState({ mode: "create" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Lesson
              </button>
            </HostGate>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-zinc-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading lessons…
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : (
            <>
              {listProcessing && (
                <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Saving lesson order…
                </div>
              )}
              <LessonList
                lessons={lessons}
                onEdit={(lessonItem) =>
                  setLessonEditorState({ mode: "edit", lesson: lessonItem })
                }
                onDelete={(lessonItem) => setDeleteTarget(lessonItem)}
                onReorder={handleLessonReorder}
              />
            </>
          )}
        </div>
      </div>

      {lessonEditorState && (
        <LessonEditor
          open={lessonEditorState !== null}
          mode={lessonEditorState.mode}
          clubId={clubId}
          journeyId={journey.id}
          lesson={
            lessonEditorState.mode === "edit" ? lessonEditorState.lesson : undefined
          }
          onClose={() => setLessonEditorState(null)}
          onSaved={handleLessonSaved}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete lesson?"
        description="This lesson will be removed permanently. Members will no longer see it in the journey."
        confirmLabel="Delete lesson"
        destructive
        loading={deleteLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleLessonDelete}
      />
    </div>
  );
}

