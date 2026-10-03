"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/utils";

type AiThinkingOrbAndInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  answered?: boolean;
  placeholder?: string;
  status?: string;
  className?: string;
};

export function AiThinkingOrbAndInput({
  value,
  onValueChange,
  onSubmit,
  loading = false,
  answered = false,
  placeholder = "Tulis perintah untuk BotUang AI...",
  status,
  className,
}: AiThinkingOrbAndInputProps) {
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<number | null>(null);
  const phase = loading ? "thinking" : answered ? "answered" : "idle";

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit();
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && (event.shiftKey || event.nativeEvent.isComposing)) {
      event.preventDefault();
    }
  }

  function change(nextValue: string) {
    onValueChange(nextValue);
    setTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 320);
  }

  return (
    <div className={cn("ai-morph-root", className)} data-phase={phase} data-typing={typing ? "" : undefined}>
      <div className="ai-morph-stage" aria-hidden="true">
        <span className="ai-morph-halo" />
        <span className="ai-morph-orb">
          <span className="ai-morph-core" />
          <span className="ai-morph-ring ai-morph-ring-a" />
          <span className="ai-morph-ring ai-morph-ring-b" />
          <span className="ai-morph-dot ai-morph-dot-a" />
          <span className="ai-morph-dot ai-morph-dot-b" />
          <span className="ai-morph-dot ai-morph-dot-c" />
        </span>
      </div>

      <form className="ai-morph-input" onSubmit={submit} autoComplete="off">
        <Sparkles className="ai-morph-spark" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => change(event.target.value)}
          onKeyDown={keyDown}
          placeholder={placeholder}
          disabled={loading}
          className="ai-morph-field"
          aria-label="Perintah AI BotUang"
        />
        <button
          type="submit"
          disabled={!value.trim() || loading}
          className="ai-morph-send"
          aria-label="Kirim perintah AI"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      <p className="ai-morph-status" aria-live="polite">
        {status ?? (loading ? "Membaca perintah..." : answered ? "Siap disimpan" : "Catat transaksi, todo, reminder, atau command")}
      </p>
    </div>
  );
}
