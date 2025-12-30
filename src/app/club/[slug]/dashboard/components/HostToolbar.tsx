import Link from "next/link";
import { HostGate } from "@/components/host/HostGate";
import { Plus, Pencil, FolderPlus } from "lucide-react";

interface HostToolbarProps {
  clubSlug: string;
  onAddJourney: () => void;
  onAddDownload: () => void;
}

export function HostToolbar({
  clubSlug,
  onAddJourney,
  onAddDownload,
}: HostToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <HostGate>
        <Link
          href={`/club/${clubSlug}/editor`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Pencil size={16} />
          Edit Club
        </Link>
      </HostGate>

      <HostGate>
        <button
          type="button"
          onClick={onAddJourney}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
        >
          <Plus size={16} />
          Add New Journey
        </button>
      </HostGate>

      <HostGate>
        <button
          type="button"
          onClick={onAddDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          <FolderPlus size={16} />
          Add Digital Product
        </button>
      </HostGate>
    </div>
  );
}

