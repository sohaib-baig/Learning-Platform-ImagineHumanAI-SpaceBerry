"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b1f23] p-6 shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-zinc-400">{message}</p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition hover:from-sky-500 hover:to-sky-400 hover:shadow-[0_0_25px_rgba(14,165,233,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
