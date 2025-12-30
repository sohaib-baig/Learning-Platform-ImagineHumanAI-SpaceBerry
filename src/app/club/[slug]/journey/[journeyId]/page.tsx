"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { useClub, ClubProvider } from "@/context/ClubContext";
import { useAuth } from "@/hooks/useAuth";
import { LessonProgress, LessonProgressStatus } from "@/types/classroom";
import {
  getLessonProgress,
  markLessonCompleted,
  markLessonAsComplete,
} from "@/lib/firestore/classroom";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ProgressBar } from "@/components/ProgressBar";
import { BackToHomeButton } from "@/components/BackToHomeButton";
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

function JourneyLessonsContent({ journeyId }: { journeyId: string }) {
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
        console.error("[Club Journey Page] Error loading lessons:", err);
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
  }, [clubId, journeyId, user, isHost, isMember]);

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
                "[Club Journey Page] Error fetching lesson progress:",
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
        console.error(
          "[Club Journey Page] Failed to load lesson progress:",
          err
        );
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
          "[Club Journey Page] Error fetching active lesson progress:",
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
          "[Club Journey Page] Error subscribing to lesson completion:",
          err
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, clubId, journeyId, activeLessonId]);

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
  const MAX_TRIAL_ORDER = 1; // lessons starts from 0 in the database
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
      console.error("[Club Journey Page] Failed to start checkout:", err);
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
      console.error(
        "[Club Journey Page] Failed to mark lesson completion:",
        err
      );
      setCompletionError("Unable to save your completion. Please try again.");
    } finally {
      setIsSavingCompletion(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
          <span>Loading your journey...</span>
        </div>
      </div>
    );
  }

  if (error || !clubId || !clubData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Journey unavailable
          </h1>
          <p className="text-gray-600">
            {error || "We couldn’t load this journey. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  if (!isHost && !isMember) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Members only content
          </h1>
          <p className="text-gray-600">
            Join this club to unlock all of its journeys and lessons.
          </p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-600">{fetchError}</p>
        </div>
      </div>
    );
  }

  if (!journey || lessons.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            No lessons published yet
          </h2>
          <p className="text-slate-600">
            The host hasn’t published any lessons for this journey yet. Please
            check back soon!
          </p>
        </div>
      </div>
    );
  }

  const layeredTag = journey.layer ? (
    <span className="inline-block px-3 py-1 bg-slate-100 text-sm rounded-full text-slate-700">
      {journey.layer}
    </span>
  ) : null;

  const emotionShiftTag = journey.emotionShift ? (
    <span className="text-brand font-medium">{journey.emotionShift}</span>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <BackToHomeButton clubSlug={clubData.info.slug} />
          {isFetchingContent && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              Updating journey lessons…
            </div>
          )}
          <p className="text-sm text-slate-500">
            {clubData.info.name} · Journey
          </p>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 mb-3">
              {journey.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
              {layeredTag}
              {emotionShiftTag}
              {durationLabel && (
                <span className="text-slate-500 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {durationLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fontSize="9"
                    fill="currentColor"
                  >
                    {completedLessons}/{totalLessons}
                  </text>
                </svg>
                {percentComplete}% complete
              </span>
            </div>
            <p className="text-slate-600 max-w-3xl leading-relaxed">
              {journey.summary || journey.description}
            </p>
          </div>

          <div className="max-w-md">
            <ProgressBar value={percentComplete} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">Lessons</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {totalLessons} lesson{totalLessons !== 1 ? "s" : ""} ·{" "}
                  {clubData.info.name}
                </p>
              </div>
              <div className="divide-y divide-slate-200">
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
                      className={`w-full text-left p-4 transition ${
                        isActive
                          ? "bg-slate-50 border-l-4 border-l-brand"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isCompleted ? (
                            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
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
                                  ? "border-brand"
                                  : percentWatched > 0
                                    ? "border-amber-400"
                                    : "border-slate-300"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`font-medium ${
                                  isActive ? "text-brand" : "text-slate-900"
                                }`}
                              >
                                {lesson.title}
                              </h3>
                              {showLockIcon && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4 text-amber-500"
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
                              <span className="text-xs text-slate-500 mt-0.5">
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
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                      <div className="flex flex-col gap-2 mb-4">
                        <p className="text-sm font-medium text-brand">
                          Lesson{" "}
                          {displayedLesson?.order ?? activeLessonMeta.order}
                        </p>
                        <h2 className="text-2xl font-semibold text-slate-900">
                          {displayedLesson?.title ?? activeLessonMeta.title}
                        </h2>
                        {activeLessonDurationMinutes && (
                          <span className="text-sm text-slate-500">
                            {activeLessonDurationMinutes} minute
                            {activeLessonDurationMinutes !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {lessonLoading && (
                        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                          Unlocking lesson…
                        </div>
                      )}
                      {!isAccessBlocked && lessonError && !lessonLoading && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
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
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                          Lesson content will appear here once the host adds a
                          video.
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {isLessonCompleted ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
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
                            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
                          >
                            Sign in to mark as completed
                          </button>
                        )}
                        {completionError && (
                          <span className="text-sm text-red-600">
                            {completionError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Lesson Resources
                      </h3>
                      {displayedLesson?.contentBlocks?.length ? (
                        <div className="space-y-4">
                          {displayedLesson.contentBlocks.map((block, index) => (
                            <div
                              key={`${displayedLesson.id}-block-${index}`}
                              className="p-4 rounded-xl bg-slate-50 border border-slate-200"
                            >
                              <p className="text-slate-700 leading-relaxed">
                                {block.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600">
                          The host hasn’t added additional resources for this
                          lesson yet.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Select a lesson to begin
                </h3>
                <p className="text-slate-600">
                  Choose a lesson from the left to start exploring this journey.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ClubJourneyPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string | undefined;
  const journeyId = params?.journeyId as string | undefined;

  useEffect(() => {
    if (!slug || !journeyId) {
      router.replace("/club");
    }
  }, [slug, journeyId, router]);

  if (!slug || !journeyId) {
    return null;
  }

  return (
    <ClubProvider slug={slug}>
      <JourneyLessonsContent journeyId={journeyId} />
    </ClubProvider>
  );
}
