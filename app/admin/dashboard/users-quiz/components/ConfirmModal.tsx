"use client";
import React, { useEffect, useRef } from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") {
        const active = document.activeElement;
        if (active instanceof HTMLButtonElement || active instanceof HTMLInputElement) return;
        onConfirm();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel, onConfirm]);

  useEffect(() => {
    if (open) {
      setTimeout(() => panelRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={false}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white/95 shadow-2xl ring-1 ring-black/5 transition-all duration-200 ease-out overflow-visible p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">

          {/* Bigger circle, no clipping */}
          <div className="w-24 h-24 rounded-full bg-linear-to-br from-[#EEF2FF] to-white flex items-center justify-center shadow-md mb-5">
            <AlertTriangle className="w-10 h-10 text-[#F59E0B]" />
          </div>

          <button
            onClick={onCancel}
            className="absolute right-4 top-4 p-2 rounded-md text-gray-500 hover:bg-gray-100 transition"
            aria-label="Close dialog"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed px-3">
            {message}
          </p>

          <div className="mt-6 flex gap-3 justify-center">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-[#5E67CC] text-white font-semibold hover:bg-[#5255b8] transition"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
