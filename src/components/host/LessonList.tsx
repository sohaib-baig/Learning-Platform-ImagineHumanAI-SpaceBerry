import React, { useMemo } from "react";
import { ArrowDown, ArrowUp, Edit3, Trash2 } from "lucide-react";
import { HostGate } from "@/components/host/HostGate";
import { useClub } from "@/context/ClubContext";
import { HostLesson } from "./types";

interface LessonListProps {
  lessons: HostLesson[];
  onEdit: (lesson: HostLesson) => void;
  onDelete: (lesson: HostLesson) => void;
  onReorder: (lessonIds: string[]) => void;
}

export function LessonList({
  lessons,
  onEdit,
  onDelete,
  onReorder,
}: LessonListProps) {
  const { canHostManage } = useClub();

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [lessons]
  );

  const moveLesson = (index: number, direction: "up" | "down") => {
    const offset = direction === "up" ? -1 : 1;
    const newIndex = index + offset;

    if (newIndex < 0 || newIndex >= sortedLessons.length) {
      return;
    }

    const updated = [...sortedLessons];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);

    onReorder(updated.map((lesson) => lesson.id));
  };

  if (sortedLessons.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center">
        <h3 className="text-lg font-semibold text-white">No lessons yet</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Add lessons to structure the learning experience for this journey.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f131a]/90 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-white/5 text-sm text-white">
          <thead className="bg-white/5 text-zinc-400">
            <tr>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">
                Lesson
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">
                Order
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedLessons.map((lesson, index) => (
              <tr key={lesson.id} className="transition hover:bg-white/5">
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-white">
                      {lesson.title}
                    </span>
                    {lesson.description && (
                      <p className="text-xs text-zinc-400">
                        {lesson.description}
                      </p>
                    )}
                    <span className="text-xs font-medium text-zinc-500">
                      {lesson.contentType.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-zinc-400">
                  {lesson.order ?? 0}
                </td>
                <td className="px-4 py-4 align-top text-zinc-400">
                  {lesson.durationMinutes
                    ? `${lesson.durationMinutes} min`
                    : "—"}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-2 text-xs text-white">
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        lesson.isPublished
                          ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                          : "border border-white/10 bg-white/5 text-white/70"
                      }`}
                    >
                      {lesson.isPublished ? "Published" : "Draft"}
                    </span>
                    {lesson.isArchived && (
                      <span className="inline-flex w-fit items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
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
                        onClick={() => moveLesson(index, "up")}
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
                        onClick={() => moveLesson(index, "down")}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                        disabled={
                          !canHostManage || index === sortedLessons.length - 1
                        }
                      >
                        <ArrowDown size={14} />
                        Down
                      </button>
                    </HostGate>
                    <HostGate showIfNotHost>
                      <button
                        type="button"
                        onClick={() => onEdit(lesson)}
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
                        onClick={() => onDelete(lesson)}
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
          {sortedLessons.map((lesson, index) => (
            <div key={lesson.id} className="p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {lesson.title}
                  </h3>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    {lesson.contentType}
                  </p>
                  {lesson.description && (
                    <p className="mt-1 text-xs text-zinc-400">
                      {lesson.description}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-zinc-500">
                  Order {lesson.order ?? 0}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    lesson.isPublished
                      ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {lesson.isPublished ? "Published" : "Draft"}
                </span>
                {lesson.isArchived && (
                  <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                    Archived
                  </span>
                )}
                {lesson.durationMinutes ? (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70">
                    {lesson.durationMinutes} min
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => moveLesson(index, "up")}
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
                    onClick={() => moveLesson(index, "down")}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-40"
                    disabled={
                      !canHostManage || index === sortedLessons.length - 1
                    }
                  >
                    <ArrowDown size={14} />
                    Down
                  </button>
                </HostGate>
                <HostGate showIfNotHost>
                  <button
                    type="button"
                    onClick={() => onEdit(lesson)}
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
                    onClick={() => onDelete(lesson)}
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

