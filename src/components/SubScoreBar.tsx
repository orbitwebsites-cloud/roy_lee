"use client";

import type { SubScore } from "@/lib/types";

export default function SubScoreBar({ s }: { s: SubScore }) {
  const tone = s.score >= 75 ? "var(--good)" : s.score >= 55 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{s.label}</span>
        <span className="font-mono text-muted">{s.score}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${s.score}%`, background: tone, transition: "width 0.8s ease" }}
        />
      </div>
      {s.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.note}</p>}
    </div>
  );
}
