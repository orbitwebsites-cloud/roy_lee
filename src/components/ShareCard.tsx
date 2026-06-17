"use client";

import { useState } from "react";
import { track } from "@/lib/store";
import ScoreRing from "./ScoreRing";

// Virality seed. We share PROGRESS / POTENTIAL (a flex), never a raw low score
// (socially costly). Includes a two-sided "challenge a friend" invite so the
// loop has recipient value. Every share/invite is instrumented for k-factor.
export default function ShareCard({
  overall,
  potential,
  delta,
  onClose,
}: {
  overall: number;
  potential: number;
  delta?: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function share(kind: "score" | "invite") {
    track("share", { kind, overall, potential });
    const text =
      kind === "invite"
        ? `I'm leveling up on HALO — potential ${potential}. Think you can beat my glow-up? Find your HALO potential 👇`
        : `My HALO potential is ${potential}${delta ? ` (up +${delta} this week)` : ""}. Find yours 👇`;
    const url = typeof window !== "undefined" ? window.location.origin : "https://halo.app";
    try {
      if (navigator.share) {
        await navigator.share({ title: "HALO", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled share sheet */
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-5">
      <div className="card w-full max-w-sm overflow-hidden animate-rise">
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{
            background:
              "radial-gradient(600px 300px at 50% -20%, rgba(214,92,255,0.35), transparent 60%)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted">HALO</p>
          <div className="mt-3 grid place-items-center">
            <ScoreRing score={overall} potential={potential} size={180} label="now" />
          </div>
          {delta != null && delta > 0 && (
            <div className="mt-3 inline-block rounded-full bg-good/15 px-3 py-1 text-sm font-semibold text-good">
              ↑ +{delta} this week
            </div>
          )}
          <p className="mt-3 text-sm text-muted">
            Ceiling <span className="halo-text font-bold">{potential}</span> — and climbing.
          </p>
        </div>
        <div className="space-y-2 p-4">
          <button
            onClick={() => share("score")}
            className="halo-bg w-full rounded-xl py-3 text-sm font-semibold text-black"
          >
            {copied ? "Copied!" : "Share my glow-up"}
          </button>
          <button
            onClick={() => share("invite")}
            className="w-full rounded-xl border border-border py-3 text-sm font-medium"
          >
            Challenge a friend to beat it
          </button>
          <button onClick={onClose} className="w-full py-2 text-sm text-muted">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
