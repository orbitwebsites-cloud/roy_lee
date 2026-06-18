"use client";

import type { ImprovementItem } from "@/lib/types";

const effortTone: Record<string, string> = {
  easy: "text-good border-good/40",
  medium: "text-warn border-warn/40",
  committed: "text-bad border-bad/40",
};

export default function PlanList({ plan }: { plan: ImprovementItem[] }) {
  return (
    <div className="space-y-3">
      {plan.map((p) => (
        <div key={p.rank} className="card p-4 animate-rise">
          <div className="flex items-start gap-3">
            <div className="halo-bg grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white">
              {p.rank}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold">{p.title}</h4>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${effortTone[p.effort]}`}
                >
                  {p.effort}
                </span>
                <span className="ml-auto font-mono text-xs text-muted">
                  +{p.projectedLift.toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{p.why}</p>
              <p className="mt-2 text-sm">
                <span className="halo-text font-semibold">Do this: </span>
                {p.action}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
