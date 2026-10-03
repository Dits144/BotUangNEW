"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
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

type OrbPoint = {
  x: number;
  y: number;
  z: number;
  seed: number;
};

function createOrbPoints() {
  const points: OrbPoint[] = [];
  const rings = 15;

  for (let ring = 0; ring < rings; ring += 1) {
    const y = 1 - ((ring + 0.5) / rings) * 2;
    const radius = Math.sqrt(1 - y * y);
    const count = Math.max(6, Math.round(28 * radius));

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + ring * 0.33;
      points.push({
        x: Math.cos(angle) * radius,
        y,
        z: Math.sin(angle) * radius,
        seed: (ring * 31 + index * 17) % 97,
      });
    }
  }

  return points;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(createOrbPoints, []);
  const phase = loading ? "thinking" : answered ? "answered" : "idle";
  const label = loading ? "Thinking" : answered ? "Done" : "BotUang AI";

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let stopped = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = 180;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    function draw(time: number) {
      if (!context) return;
      context.clearRect(0, 0, size, size);

      const reduced = media.matches;
      const spin = reduced ? 0.25 : time / 4200;
      const thinkingPulse = phase === "thinking" ? (Math.sin(time / 260) + 1) / 2 : 0;
      const answeredBoost = phase === "answered" ? 0.28 : 0;
      const cos = Math.cos(spin);
      const sin = Math.sin(spin);
      const center = size / 2;
      const scale = phase === "answered" ? 46 : 52;

      for (const point of points) {
        const x = point.x * cos + point.z * sin;
        const z = -point.x * sin + point.z * cos;
        const y = point.y;
        const depth = (z + 1) / 2;
        const perspective = 1.05 + depth * 0.48;
        const px = center + x * scale * perspective;
        const py = center - y * scale * perspective;
        const wave = (Math.sin(time / 420 + point.seed) + 1) / 2;
        const alpha =
          0.24 +
          depth * 0.42 +
          thinkingPulse * wave * 0.34 +
          answeredBoost;
        const radius = 1.05 + depth * 1.4 + thinkingPulse * 0.45;
        const green = Math.round(190 + depth * 55);
        const blue = Math.round(155 + wave * 55);

        context.beginPath();
        context.fillStyle = `rgba(52, ${green}, ${blue}, ${Math.min(alpha, 0.98)})`;
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
      }

      if (phase === "thinking") {
        const sweep = (time / 12) % 360;
        const gradient = context.createConicGradient((sweep * Math.PI) / 180, center, center);
        gradient.addColorStop(0, "rgba(16,185,129,0)");
        gradient.addColorStop(0.42, "rgba(16,185,129,0.22)");
        gradient.addColorStop(1, "rgba(16,185,129,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(center, center, 68, 0, Math.PI * 2);
        context.fill();
      }

      if (!stopped && (!reduced || frame < 1 || phase !== "idle")) {
        frame += 1;
        requestAnimationFrame(draw);
      }
    }

    const raf = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [phase, points]);

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
    <div
      className={cn("ai-morph-root", className)}
      data-phase={phase}
      data-typing={typing ? "" : undefined}
    >
      <div className="ai-morph-bg" aria-hidden="true" />
      <div className="ai-morph-stage" aria-hidden="true">
        <span className="ai-morph-halo" />
        <div className="ai-morph-orb-shell">
          <canvas ref={canvasRef} className="ai-morph-canvas" />
          <span className="ai-morph-green" />
          <span className="ai-morph-pulse" />
        </div>
      </div>

      <div className="ai-morph-label" aria-live="polite">
        <span>{label}</span>
        {loading ? (
          <span className="ai-morph-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : null}
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
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!value.trim() || loading}
          className="ai-morph-send"
          aria-label="Kirim perintah AI"
          data-ready={value.trim() ? "" : undefined}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      <div className="ai-morph-answer" data-visible={answered ? "" : undefined}>
        <span className="ai-morph-answer-dot" />
        <p>{status ?? "Perintah siap diproses."}</p>
      </div>
    </div>
  );
}
