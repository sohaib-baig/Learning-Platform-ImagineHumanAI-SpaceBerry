import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Edit3, Layers, Trash2 } from "lucide-react";
import { getAuth } from "firebase/auth";
import type { ClubJourney } from "@/types/club";
import { HostGate } from "@/components/host/HostGate";
import { useClub } from "@/context/ClubContext";

interface JourneyListProps {
  journeys: ClubJourney[];
  clubId: string;
  onEdit: (journey: ClubJourney) => void;
  onDelete: (journey: ClubJourney) => void;
  onManageLessons: (journey: ClubJourney) => void;
  onReorder: (journeyIds: string[]) => void;
}

export function JourneyList({
  journeys,
  clubId,
  onEdit,
  onDelete,
  onManageLessons,
  onReorder,
}: JourneyListProps) {
  const { canHostManage } = useClub();
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  const sortedJourneys = useMemo(
    () => [...journeys].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [journeys]
  );

  useEffect(() => {
    let isCancelled = false;

    const fetchLessonCounts = async () => {
      if (!clubId || journeys.length === 0) {
        if (!isCancelled) {
          setLoadingCounts(false);
        }
        return;
      }

      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          if (!isCancelled) {
            setLoadingCounts(false);
          }
          return;
        }

        const idToken = await currentUser.getIdToken();
        const counts: Record<string, number> = {};

        // Fetch lesson counts for all journeys in parallel
        const countPromises = journeys.map(async (journey) => {
          try {
            const response = await fetch(
              `/api/clubs/${clubId}/journeys/${journey.id}/lessons`,
              {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              }
            );

            if (response.ok) {
              const data = (await response.json()) as {
                lessons?: unknown[];
              };
              counts[journey.id] = data.lessons?.length ?? 0;
            } else {
              counts[journey.id] = 0;
            }
          } catch (err) {
            console.error(
              `[JourneyList] Error fetching lesson count for journey ${journey.id}:`,
              err
            );
            counts[journey.id] = 0;
          }
        });

        await Promise.all(countPromises);

        if (!isCancelled) {
          setLessonCounts(counts);
        }
      } catch (err) {
        console.error("[JourneyList] Error fetching lesson counts:", err);
      } finally {
        if (!isCancelled) {
          setLoadingCounts(false);
        }
      }
    };

    fetchLessonCounts();

    return () => {
      isCancelled = true;
    };
  }, [clubId, journeys]);

  const moveJourney = (index: number, direction: "up" | "down") => {
    const offset = direction === "up" ? -1 : 1;
    const newIndex = index + offset;

    if (newIndex < 0 || newIndex >= sortedJourneys.length) {
      return;
    }

    const updated = [...sortedJourneys];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);

    onReorder(updated.map((journey) => journey.id));
  };

  if (sortedJourneys.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center">
        <h3 className="text-lg font-semibold text-white">No journeys yet</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Create your first journey to start organising lessons for members.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f131a]/90 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wider text-[11px] text-zinc-400">
                Title
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[11px] text-zinc-400">
                Order
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[11px] text-zinc-400">
                Lessons
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[11px] text-zinc-400">
                Status
              </th>
              <th className="px-6 py-3 text-right font-semibold uppercase tracking-wider text-[11px] text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedJourneys.map((journey, index) => (
              <tr key={journey.id} className="transition hover:bg-white/5">
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-white">
                      {journey.title}
                    </span>
                    {journey.summary && (
                      <p className="text-xs text-zinc-400">
                        {journey.summary}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-zinc-400">
                  {journey.order ?? 0}
                </td>
                <td className="px-4 py-4 align-top text-zinc-400">
                  {loadingCounts ? (
                    <span className="text-zinc-500">—</span>
                  ) : (
                    lessonCounts[journey.id] ?? 0
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-2 text-xs text-white">
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 font-medium text-[11px] ${
                        journey.isPublished
                          ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40"
                          : "bg-white/5 text-white/70 border border-white/10"
                      }`}
                    >
                      {journey.isPublished ? "Published" : "Draft"}
                    </span>
                    {journey.isArchived && (
                      <span className="inline-flex w-fit items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-200">
                        Archived
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <HostGate showIfNotHost>
                      <button
                        type="button"
                        onClick={() => moveJourney(index, "up")}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                        disabled={!canHostManage || index === 0}
                      >
                        <ArrowUp size={14} />
                        Up
                      </button>
                    </HostGate>
                    <HostGate showIfNotHost>
                      <button
                        type="button"
                        onClick={() => moveJourney(index, "down")}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                        disabled={
                          !canHostManage || index === sortedJourneys.length - 1
                        }
                      >
                        <ArrowDown size={14} />
                        Down
                      </button>
                    </HostGate>
                    <HostGate showIfNotHost>
                      <button
                        type="button"
                        onClick={() => onManageLessons(journey)}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-40"
                        disabled={!canHostManage}
                      >
                        <Layers size={14} />
                        Lessons
                      </button>
                    </HostGate>
                    <HostGate showIfNotHost>
                      <button
                        type="button"
                        onClick={() => onEdit(journey)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                        disabled={!canHostManage}
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                    </HostGate>
                    <HostGate showIfNotHost>
                      <button
                        type="button"
                        onClick={() => onDelete(journey)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                        disabled={!canHostManage}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </HostGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <div className="divide-y divide-white/5">
          {sortedJourneys.map((journey, index) => (
            <div key={journey.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {journey.title}
                  </h3>
                  {journey.summary && (
                    <p className="mt-1 text-xs text-zinc-400">{journey.summary}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span className="font-medium text-zinc-500">
                    Order {journey.order ?? 0}
                  </span>
                  <span className="font-medium text-zinc-500">
                    {loadingCounts ? (
                      "—"
                    ) : (
                      `${lessonCounts[journey.id] ?? 0} lesson${(lessonCounts[journey.id] ?? 0) === 1 ? "" : "s"}`
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium text-[11px] ${
                    journey.isPublished
                      ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {journey.isPublished ? "Published" : "Draft"}
                </span>
                {journey.isArchived && (
                  <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-200">
                    Archived
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => moveJourney(index, "up")}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                    disabled={!canHostManage || index === 0}
                  >
                    <ArrowUp size={14} />
                    Up
                  </button>
                </HostGate>
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => moveJourney(index, "down")}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                    disabled={
                      !canHostManage || index === sortedJourneys.length - 1
                    }
                  >
                    <ArrowDown size={14} />
                    Down
                  </button>
                </HostGate>
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => onManageLessons(journey)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-40"
                    disabled={!canHostManage}
                  >
                    <Layers size={14} />
                    Lessons
                  </button>
                </HostGate>
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => onEdit(journey)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs	font-medium text-zinc-200 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                    disabled={!canHostManage}
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                </HostGate>
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => onDelete(journey)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                    disabled={!canHostManage}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </HostGate>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

