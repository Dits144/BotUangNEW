"use client";

import { DragEvent, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "./button";

export function ImageDropzone({
  label,
  description,
  file,
  previewUrl,
  onFileChange,
  onClear,
  disabled,
}: {
  label: string;
  description?: string;
  file?: File | null;
  previewUrl?: string;
  onFileChange: (file: File | null) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const localPreview = file ? URL.createObjectURL(file) : "";
  const visiblePreview = localPreview || previewUrl || "";

  function handleFiles(files: FileList | null) {
    const nextFile = files?.[0] ?? null;
    if (!nextFile) return;
    if (!nextFile.type.startsWith("image/")) return;
    onFileChange(nextFile);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-3 transition",
        dragging ? "border-emerald-400 bg-emerald-500/10" : "",
        disabled ? "opacity-60" : "",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      {visiblePreview ? (
        <div className="space-y-3">
          <img
            src={visiblePreview}
            alt={label}
            className="max-h-72 w-full rounded-[14px] border border-[var(--line)] object-contain"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Ganti gambar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={disabled}
              onClick={() => {
                onFileChange(null);
                onClear?.();
              }}
            >
              <X className="h-4 w-4" />
              Hapus
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center rounded-[14px] px-4 text-center transition hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--surface)]">
            <ImageIcon className="h-5 w-5 text-emerald-500" />
          </span>
          <span className="mt-3 font-semibold">{label}</span>
          <span className="mt-1 max-w-xs text-sm text-[var(--muted)]">
            {description ?? "Drag and drop gambar ke sini atau klik untuk memilih file."}
          </span>
        </button>
      )}
    </div>
  );
}
