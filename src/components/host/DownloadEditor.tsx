"use client";

import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { FormRow } from "@/components/ui/FormRow";
import type { ClubDownload } from "@/types/club";

type DownloadEditorMode = "create" | "edit";

interface DownloadEditorProps {
  open: boolean;
  mode: DownloadEditorMode;
  clubId: string;
  download?: ClubDownload;
  onClose: () => void;
  onSaved: (download: ClubDownload) => void;
}

interface DownloadFormState {
  title: string;
  description: string;
  price: string;
  isFree: boolean;
  fileUrl: string;
}

const defaultFormState: DownloadFormState = {
  title: "",
  description: "",
  price: "",
  isFree: true,
  fileUrl: "",
};

export function DownloadEditor({
  open,
  mode,
  clubId,
  download,
  onClose,
  onSaved,
}: DownloadEditorProps) {
  const [formState, setFormState] =
    useState<DownloadFormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (download) {
        setFormState({
          title: download.title ?? "",
          description: download.description ?? "",
          price:
            typeof download.price === "number" ? String(download.price) : "",
          isFree: download.isFree ?? (!download.price || download.price === 0),
          fileUrl: download.url ?? "",
        });
      } else {
        setFormState(defaultFormState);
      }
      setError(null);
    }
  }, [download, open]);

  const handleChange = <Field extends keyof DownloadFormState>(
    field: Field,
    value: DownloadFormState[Field]
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

      const title = formState.title.trim();
      if (!title) {
        throw new Error("Title is required.");
      }

      const url = formState.fileUrl.trim();
      if (!url) {
        throw new Error("Please provide a file URL or attachment link.");
      }

      let price = 0;
      if (!formState.isFree) {
        const parsed = Number.parseFloat(formState.price);
        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error("Price must be a valid non-negative number.");
        }
        price = parsed;
      }

      const idToken = await currentUser.getIdToken();

      const payload: Record<string, unknown> = {
        title,
        description: formState.description.trim(),
        url,
        isFree: formState.isFree,
      };

      if (!formState.isFree) {
        payload.price = price;
        payload.currency = "AUD";
      }

      const endpoint =
        mode === "create"
          ? `/api/clubs/${clubId}/downloads`
          : `/api/clubs/${clubId}/downloads/${download?.id}`;

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
            ? "Failed to create download."
            : "Failed to update download.");
        throw new Error(message);
      }

      const { download: savedDownload } = (await response.json()) as {
        download: ClubDownload;
      };

      onSaved(savedDownload);
      onClose();
    } catch (err) {
      console.error("[DownloadEditor] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to save download.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1118]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-zinc-500">
              {mode === "create" ? "New digital product" : "Edit digital product"}
            </p>
            <h2 className="text-2xl font-semibold text-white">
              {mode === "create"
                ? "Add Digital Product"
                : "Edit Digital Product"}
            </h2>
            <p className="text-sm text-zinc-500">
              Share downloadable resources with your club members.
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
          <FormRow label="Title" htmlFor="download-title" required>
            <input
              id="download-title"
              type="text"
              value={formState.title}
              onChange={(event) => handleChange("title", event.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow label="Description" htmlFor="download-description">
            <textarea
              id="download-description"
              rows={3}
              value={formState.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <FormRow
            label="Download URL"
            htmlFor="download-url"
            description="Provide a direct URL to the hosted file or storage location."
            required
          >
            <input
              id="download-url"
              type="url"
              value={formState.fileUrl}
              onChange={(event) => handleChange("fileUrl", event.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </FormRow>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={formState.isFree}
                onChange={(event) =>
                  handleChange("isFree", event.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span>Make this download free</span>
            </label>
            <FormRow
              label="Price (AUD)"
              htmlFor="download-price"
              description="Leave blank for free downloads."
            >
              <input
                id="download-price"
                type="number"
                min={0}
                step="0.01"
                value={formState.price}
                disabled={formState.isFree}
                onChange={(event) => handleChange("price", event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-inner focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </FormRow>
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
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl border border-primary bg-transparent px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Add Download"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
