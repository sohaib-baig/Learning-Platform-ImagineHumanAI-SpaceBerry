"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, Clock, BookOpen } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { useClub } from "@/context/ClubContext";
import { useAuth } from "@/hooks/useAuth";
import { LessonProgress, LessonProgressStatus } from "@/types/classroom";
import {
  getLessonProgress,
  markLessonCompleted,
  markLessonAsComplete,
} from "@/lib/firestore/classroom";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ProgressBar } from "@/components/ProgressBar";
import { UpgradeGate } from "@/components/UpgradeGate";
import { db } from "@/lib/firebase";
import { analytics } from "@/lib/analytics";
import { useLesson } from "@/hooks/useLesson";
import { startClubCheckout } from "@/lib/stripe";

type LessonItem = {
  id: string;
  title: string;
  order: number;
  durationMinutes: number | null;
  videoUrl: string;
  contentBlocks: Array<{ type: string; value: string }>;
  isPublished: boolean;
};

type JourneyPayload = {
  id: string;
  title: string;
  description: string;
  summary: string;
  layer: string;
  emotionShift: string;
  estimatedMinutes: number | null;
  isPublished: boolean;
  order: number;
  slug: string;
  thumbnailUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type JourneyResponse = {
  journey: JourneyPayload;
  lessons: LessonItem[];
};

function formatMinutes(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr${hours !== 1 ? "s" : ""}`;
  }
  return `${hours} hr${hours !== 1 ? "s" : ""} ${remainingMinutes} min`;
}

interface JourneyModalProps {
  journeyId: string;
  open: boolean;
  onClose: () => void;
}

export function JourneyModal({ journeyId, open, onClose }: JourneyModalProps) {
  const { user, loading: authLoading } = useAuth();
  const { clubId, clubData, isHost, isMember, isTrialMember, loading, error } =
    useClub();
  const [journey, setJourney] = useState<JourneyPayload | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lessonProgress, setLessonProgress] = useState<
    Record<string, LessonProgress>
  >({});
  const [activeLessonProgress, setActiveLessonProgress] =
    useState<LessonProgress | null>(null);
  const [activeLessonCompletionStatus, setActiveLessonCompletionStatus] =
    useState<LessonProgressStatus | null>(null);
  const [lastAccessibleLessonId, setLastAccessibleLessonId] = useState<
    string | null
  >(null);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const {
    lesson: activeLessonData,
    loading: lessonLoading,
    error: lessonError,
    isAccessBlocked,
  } = useLesson({
    clubId,
    journeyId,
    lessonId: activeLessonId,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCancelled = false;

    const fetchJourney = async () => {
      if (!clubId || (!isHost && !isMember)) {
        return;
      }

      if (!user) {
        return;
      }

      setIsFetchingContent(true);
      setFetchError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(
          `/api/clubs/${clubId}/journeys/${journeyId}/lessons`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const message =
            errorBody?.error ||
            `Failed to load journey (${response.statusText})`;
          throw new Error(message);
        }

        const data = (await response.json()) as JourneyResponse;
        if (!isCancelled) {
          setJourney(data.journey);
          setLessons(
            (data.lessons || [])
              .filter((lesson) => lesson.isPublished)
              .map((lesson) => ({
                ...lesson,
                durationMinutes:
                  typeof lesson.durationMinutes === "number"
                    ? lesson.durationMinutes
                    : null,
                videoUrl: lesson.videoUrl ?? "",
                contentBlocks: Array.isArray(lesson.contentBlocks)
                  ? lesson.contentBlocks
                  : [],
              }))
              .sort((a, b) => a.order - b.order)
          );
        }
      } catch (err) {
        console.error("[JourneyModal] Error loading lessons:", err);
        if (!isCancelled) {
          setFetchError(
            err instanceof Error ? err.message : "Failed to load lessons"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingContent(false);
        }
      }
    };

    fetchJourney();

    return () => {
      isCancelled = true;
    };
  }, [open, clubId, journeyId, user, isHost, isMember]);

  useEffect(() => {
    if (lessons.length > 0 && !activeLessonId) {
      setActiveLessonId(lessons[0].id);
    }
  }, [lessons, activeLessonId]);

  useEffect(() => {
    if (activeLessonId && activeLessonData && !isAccessBlocked) {
      setLastAccessibleLessonId(activeLessonId);
    }
  }, [activeLessonId, activeLessonData, isAccessBlocked]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.uid || lessons.length === 0) {
        setLessonProgress({});
        return;
      }

      try {
        const progressEntries = await Promise.all(
          lessons.map(async (lesson) => {
            try {
              const progress = await getLessonProgress(
                user.uid,
                journeyId,
                lesson.id
              );
              return progress ? [lesson.id, progress] : null;
            } catch (err) {
              console.error(
                "[JourneyModal] Error fetching lesson progress:",
                err
              );
              return null;
            }
          })
        );

        const progressMap = Object.fromEntries(
          progressEntries.filter(
            (entry): entry is [string, LessonProgress] => entry !== null
          )
        );
        setLessonProgress(progressMap);
      } catch (err) {
        console.error("[JourneyModal] Failed to load lesson progress:", err);
      }
    };

    fetchProgress();
  }, [user?.uid, journeyId, lessons]);

  useEffect(() => {
    const loadActiveLessonProgress = async () => {
      if (!user?.uid || !activeLessonId) {
        setActiveLessonProgress(null);
        return;
      }

      try {
        const progress = await getLessonProgress(
          user.uid,
          journeyId,
          activeLessonId
        );
        setActiveLessonProgress(progress);
      } catch (err) {
        console.error(
          "[JourneyModal] Error fetching active lesson progress:",
          err
        );
      }
    };

    loadActiveLessonProgress();
  }, [user?.uid, journeyId, activeLessonId]);

  useEffect(() => {
    if (!user?.uid || !clubId || !journeyId || !activeLessonId) {
      setActiveLessonCompletionStatus(null);
      return;
    }

    const progressRef = doc(
      db,
      `clubs/${clubId}/journeys/${journeyId}/lessons/${activeLessonId}/progress`,
      user.uid
    );

    const unsubscribe = onSnapshot(
      progressRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setActiveLessonCompletionStatus(null);
          return;
        }
        const data = snapshot.data() as { status?: LessonProgressStatus };
        setActiveLessonCompletionStatus(data.status ?? null);
      },
      (err) => {
        console.error(
          "[JourneyModal] Error subscribing to lesson completion:",
          err
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, clubId, journeyId, activeLessonId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const activeLessonMeta = useMemo(() => {
    return lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  }, [lessons, activeLessonId]);

  const displayedLesson = useMemo(() => {
    if (activeLessonData) {
      return {
        ...activeLessonData,
        contentBlocks: activeLessonData.contentBlocks ?? [],
        videoUrl: activeLessonData.videoUrl ?? "",
      };
    }
    if (activeLessonMeta) {
      return activeLessonMeta;
    }
    return null;
  }, [activeLessonData, activeLessonMeta]);

  const activeLessonDurationMinutes =
    activeLessonData?.durationMinutes ??
    activeLessonMeta?.durationMinutes ??
    null;

  const isLessonCompleted = activeLessonCompletionStatus === "completed";
  const MAX_TRIAL_ORDER = 1;
  const canRecordCompletion = Boolean(
    user?.uid && clubId && journeyId && activeLessonId
  );

  const durationLabel = useMemo(() => {
    return formatMinutes(journey?.estimatedMinutes ?? null);
  }, [journey?.estimatedMinutes]);

  const handleUpgrade = useCallback(() => {
    if (!clubId) {
      return;
    }
    startClubCheckout(clubId).catch((err) => {
      console.error("[JourneyModal] Failed to start checkout:", err);
    });
  }, [clubId]);

  const handleGateClose = useCallback(() => {
    if (lessons.length === 0) {
      return;
    }
    const fallbackLessonId =
      lastAccessibleLessonId ||
      lessons.find((lesson) => lesson.order <= MAX_TRIAL_ORDER)?.id ||
      lessons[0]?.id ||
      null;

    if (fallbackLessonId) {
      setActiveLessonId(fallbackLessonId);
    }
  }, [lastAccessibleLessonId, lessons]);

  const handleLessonSelect = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setCompletionError(null);
    setIsSavingCompletion(false);
    setActiveLessonCompletionStatus(null);
  };

  const handleLessonCompletion = () => {
    if (!activeLessonId) return;

    setLessonProgress((prev) => ({
      ...prev,
      [activeLessonId]: {
        ...(prev[activeLessonId] ?? {
          watchedSeconds: 0,
          videoDurationSeconds: 0,
          percentWatched: 0,
          isCompleted: false,
          lastPlaybackPosition: 0,
          updatedAt: new Date().toISOString(),
        }),
        isCompleted: true,
        percentWatched: 100,
      },
    }));
    setActiveLessonCompletionStatus("completed");
  };

  const handleManualCompletionClick = async () => {
    if (isLessonCompleted) {
      return;
    }
    if (!user?.uid || !clubId || !journeyId || !activeLessonId) {
      setCompletionError("Signin to track your progress.");
      return;
    }

    setIsSavingCompletion(true);
    setCompletionError(null);

    try {
      await markLessonAsComplete(
        user.uid,
        journeyId,
        activeLessonId,
        clubId,
        activeLessonDurationMinutes ? activeLessonDurationMinutes * 60 : 0
      );
      await markLessonCompleted({
        uid: user.uid,
        clubId,
        journeyId,
        lessonId: activeLessonId,
      });
      analytics.track("lesson_completed", {
        journeyId,
        clubId,
        lessonId: activeLessonId,
        method: "manual_button",
      });
      handleLessonCompletion();
    } catch (err) {
      console.error("[JourneyModal] Failed to mark lesson completion:", err);
      setCompletionError("Unable to save your completion. Please try again.");
    } finally {
      setIsSavingCompletion(false);
    }
  };

  if (!open) {
    return null;
  }

  if (loading || authLoading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          <span>Loading your journey...</span>
        </div>
      </div>
    );
  }

  if (error || !clubId || !clubData) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1118]/95 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Journey unavailable
          </h1>
          <p className="text-zinc-400">
            {error || "We couldn&apos;t load this journey. Please try again later."}
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!isHost && !isMember) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1118]/95 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Members only content
          </h1>
          <p className="text-zinc-400">
            Join this club to unlock all of its journeys and lessons.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1118]/95 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-zinc-400 mb-6">{fetchError}</p>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!journey || lessons.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1118]/95 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white mb-3">
            No lessons published yet
          </h2>
          <p className="text-zinc-400 mb-6">
            The host hasn&apos;t published any lessons for this journey yet. Please
            check back soon!
          </p>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const layeredTag = journey.layer ? (
    <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-sm rounded-full text-zinc-300">
      {journey.layer}
    </span>
  ) : null;

  const emotionShiftTag = journey.emotionShift ? (
    <span className="text-primary font-medium">{journey.emotionShift}</span>
  ) : null;

  const totalLessons = lessons.length;
  const completedLessons = Object.values(lessonProgress).filter(
    (progress) => progress?.isCompleted
  ).length;
  const percentComplete =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl my-4">
        <div className="rounded-3xl border border-white/10 bg-[#0d1118]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/5 px-6 py-5 bg-white/5 flex-shrink-0">
            <div className="flex-1">
              {isFetchingContent && (
                <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                  Updating journey lessons…
                </div>
              )}
              <p className="text-xs text-zinc-500 mb-1.5">
                {clubData.info.name} · Journey
              </p>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-white mb-2">
                    {journey.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                    {layeredTag}
                    {emotionShiftTag}
                    {durationLabel && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                        <Clock size={14} className="text-primary" />
                        {durationLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                      <BookOpen size={14} className="text-primary" />
                      <span>
                        {completedLessons} of {totalLessons} completed
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed line-clamp-2">
                    {journey.summary || journey.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:border-white/30 hover:text-white flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-w-xs mt-3">
                <ProgressBar value={percentComplete} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <aside className="lg:col-span-1 space-y-3">
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="p-3 border-b border-white/5">
                    <h2 className="font-semibold text-white">Lessons</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {totalLessons} lesson{totalLessons !== 1 ? "s" : ""} ·{" "}
                      {clubData.info.name}
                    </p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {lessons.map((lesson) => {
                      const progress = lessonProgress[lesson.id];
                      const isActive = lesson.id === activeLessonId;
                      const isCompleted = progress?.isCompleted ?? false;
                      const percentWatched = progress?.percentWatched ?? 0;
                      const showLockIcon =
                        isTrialMember && lesson.order > MAX_TRIAL_ORDER;

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleLessonSelect(lesson.id)}
                          className={`w-full text-left p-3 transition ${
                            isActive
                              ? "bg-primary/10 border-l-4 border-l-primary"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {isCompleted ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              ) : (
                                <div
                                  className={`w-5 h-5 rounded-full border-2 ${
                                    isActive
                                      ? "border-primary"
                                      : percentWatched > 0
                                        ? "border-amber-400"
                                        : "border-white/20"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <h3
                                    className={`font-medium ${
                                      isActive ? "text-primary" : "text-white"
                                    }`}
                                  >
                                    {lesson.title}
                                  </h3>
                                  {showLockIcon && (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4 text-amber-400"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M7 11V7a5 5 0 0110 0v4" />
                                      <rect
                                        x="5"
                                        y="11"
                                        width="14"
                                        height="10"
                                        rx="2"
                                      />
                                    </svg>
                                  )}
                                </div>
                                {lesson.durationMinutes && (
                                  <span className="text-xs text-zinc-400 mt-0.5">
                                    {lesson.durationMinutes} min
                                  </span>
                                )}
                              </div>
                              {!isCompleted && percentWatched > 0 && (
                                <div className="mt-2">
                                  <ProgressBar value={percentWatched} />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <main className="lg:col-span-2 space-y-6">
                {activeLessonMeta ? (
                  <div className="space-y-6">
                    {isAccessBlocked ? (
                      <UpgradeGate
                        onUpgrade={handleUpgrade}
                        onClose={handleGateClose}
                      />
                    ) : (
                      <>
                        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                          <div className="flex flex-col gap-2 mb-4">
                            <p className="text-sm font-medium text-primary">
                              Lesson{" "}
                              {displayedLesson?.order ?? activeLessonMeta.order}
                            </p>
                            <h2 className="text-xl font-semibold text-white">
                              {displayedLesson?.title ?? activeLessonMeta.title}
                            </h2>
                            {activeLessonDurationMinutes && (
                              <span className="text-sm text-zinc-400">
                                {activeLessonDurationMinutes} minute
                                {activeLessonDurationMinutes !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {lessonLoading && (
                            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                              Unlocking lesson…
                            </div>
                          )}
                          {!isAccessBlocked &&
                            lessonError &&
                            !lessonLoading && (
                              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                                {lessonError}
                              </div>
                            )}
                          {displayedLesson?.videoUrl ? (
                            <VideoPlayer
                              playbackId={displayedLesson.videoUrl}
                              title={displayedLesson.title}
                              userId={user?.uid}
                              journeyId={journeyId}
                              lessonId={displayedLesson.id}
                              clubId={clubId}
                              initialTime={
                                activeLessonProgress?.lastPlaybackPosition ?? 0
                              }
                              durationSeconds={
                                activeLessonDurationMinutes
                                  ? activeLessonDurationMinutes * 60
                                  : undefined
                              }
                              onCompletion={handleLessonCompletion}
                            />
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-zinc-400">
                              Lesson content will appear here once the host adds
                              a video.
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {isLessonCompleted ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-3 py-1 text-sm font-semibold text-emerald-200">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Completed
                              </span>
                            ) : user?.uid ? (
                              <button
                                type="button"
                                onClick={handleManualCompletionClick}
                                disabled={
                                  !canRecordCompletion || isSavingCompletion
                                }
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#437be0]"
                              >
                                {isSavingCompletion && (
                                  <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                )}
                                {isSavingCompletion
                                  ? "Saving..."
                                  : "Mark as completed"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-400"
                              >
                                Sign in to mark as completed
                              </button>
                            )}
                            {completionError && (
                              <span className="text-sm text-red-300">
                                {completionError}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                          <h3 className="text-base font-semibold text-white mb-3">
                            Lesson Resources
                          </h3>
                          {displayedLesson?.contentBlocks?.length ? (
                            <div className="space-y-4">
                              {displayedLesson.contentBlocks.map(
                                (block, index) => (
                                  <div
                                    key={`${displayedLesson.id}-block-${index}`}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                                  >
                                    <p className="text-zinc-200 leading-relaxed">
                                      {block.value}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-zinc-400">
                              The host hasn&apos;t added additional resources for
                              this lesson yet.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-2xl border border-white/10 p-8 text-center">
                    <h3 className="text-base font-semibold text-white mb-2">
                      Select a lesson to begin
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Choose a lesson from the left to start exploring this
                      journey.
                    </p>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
