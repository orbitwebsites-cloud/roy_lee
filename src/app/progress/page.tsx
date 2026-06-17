"use client";

import Link from "next/link";
import { getScans, track } from "@/lib/store";
import { useStoreValue } from "@/lib/useStore";
import ScoreRing from "@/components/ScoreRing";
import { useState } from "react";
import ShareCard from "@/components/ShareCard";

// Fresh weekly quests keep the loop alive past score plateaus (a known
// looksmaxxing churn failure). In production these rotate from a content engine.
const QUESTS = [
  { title: "Hydration week", task: "Drink 2L water daily + moisturizer AM/PM. Photograph day 1 and day 7." },
  { title: "Fit reset", task: "Tailor your two most-worn outfits. Re-scan in the better fit." },
  { title: "Lighting lab", task: "Take 20 window-lit photos at eye level. Keep your top 3." },
  { title: "Sleep streak", task: "7+ hours for 5 nights. Puffiness and skin tone respond fast." },
];

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 80;
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="url(#halo-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h;
        return <circle key={i} cx={x} cy={y} r="3.5" fill="var(--halo-via)" />;
      })}
    </svg>
  );
}

export default function ProgressPage() {
  const scans = useStoreValue(getScans);
  const [showShare, setShowShare] = useState(false);

  if (scans.length === 0) {
    return (
      <div className="mt-24 text-center animate-rise">
        <ScoreRing score={0} size={140} label="no scans yet" />
        <p className="mt-6 text-sm text-muted">
          Save a scan to start tracking your glow-up over time.
        </p>
        <Link
          href="/"
          className="halo-bg mt-5 inline-block rounded-xl px-6 py-3 text-sm font-semibold text-black"
        >
          Run a scan
        </Link>
      </div>
    );
  }

  const first = scans[0];
  const latest = scans[scans.length - 1];
  const delta = latest.overall - first.overall;
  const streak = scans.length;
  const quest = QUESTS[(streak - 1) % QUESTS.length];

  return (
    <div className="animate-rise space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Your glow-up</h1>
        <p className="mt-1 text-sm text-muted">{streak}-scan streak · keep it alive</p>
      </header>

      <div className="card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Trend</span>
          <span
            className={`font-semibold ${delta >= 0 ? "text-good" : "text-bad"}`}
          >
            {delta >= 0 ? "↑ +" : "↓ "}
            {Math.abs(delta)} since start
          </span>
        </div>
        <div className="mt-3">
          <Sparkline values={scans.map((s) => s.overall)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card grid place-items-center gap-2 p-4">
          <ScoreRing score={first.overall} size={120} label="first" />
        </div>
        <div className="card grid place-items-center gap-2 p-4">
          <ScoreRing
            score={latest.overall}
            potential={latest.potential}
            size={120}
            label="now"
          />
        </div>
      </div>

      <div
        className="card p-5"
        style={{
          background:
            "radial-gradient(500px 200px at 100% 0%, rgba(124,92,255,0.18), transparent 60%)",
        }}
      >
        <p className="text-xs uppercase tracking-wide text-muted">This week&apos;s quest</p>
        <h3 className="mt-1 text-lg font-bold halo-text">{quest.title}</h3>
        <p className="mt-1 text-sm text-muted">{quest.task}</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl border border-border px-4 py-2 text-sm"
        >
          Re-scan to log progress
        </Link>
      </div>

      <button
        onClick={() => {
          setShowShare(true);
          track("share_open", { from: "progress" });
        }}
        className="halo-bg w-full rounded-xl py-3 text-sm font-semibold text-black"
      >
        Share my progress
      </button>

      {showShare && (
        <ShareCard
          overall={latest.overall}
          potential={latest.potential}
          delta={delta > 0 ? delta : undefined}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
