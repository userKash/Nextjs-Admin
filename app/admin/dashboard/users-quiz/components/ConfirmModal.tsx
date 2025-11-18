"use client";
import React, { useEffect, useRef } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";

type ModalMode = "confirm" | "result";

interface ConfirmModalProps {
  open: boolean;
  mode?: ModalMode;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  mode = "confirm",
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isResult = mode === "result";

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isResult) onCancel();
      if (e.key === "Enter") {
        const active = document.activeElement;
        if (active instanceof HTMLButtonElement || active instanceof HTMLInputElement) return;

        if (isResult) onCancel();
        else onConfirm();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel, onConfirm, isResult]);

  useEffect(() => {
    if (open) setTimeout(() => panelRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (!isResult && e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {!isResult && (
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 p-2 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center">

          <div className="w-24 h-24 rounded-full bg-linear-to-br from-[#EEF2FF] to-white flex items-center justify-center shadow-md mb-6">
            {isResult ? (
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-[#F59E0B]" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {isResult ? "Success" : title}
          </h2>
          <p className="mt-3 text-sm text-gray-600 px-3">{message}</p>
          <div className="mt-6 flex gap-3 justify-center">
            {!isResult && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={isResult ? onCancel : onConfirm}
              className="px-4 py-2 rounded-lg bg-[#5E67CC] text-white font-semibold hover:bg-[#5255b8]"
            >
              {isResult ? "OK" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
