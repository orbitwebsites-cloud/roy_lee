"use client";

import { useRef, useState } from "react";
import type { ScanResult } from "@/lib/types";
import {
  addScan,
  getProfile,
  getScans,
  track,
  FREE_SCAN_LIMIT,
} from "@/lib/store";
import { useStoreValue } from "@/lib/useStore";
import ScoreRing from "@/components/ScoreRing";
import SubScoreBar from "@/components/SubScoreBar";
import PlanList from "@/components/PlanList";
import AgeGate from "@/components/AgeGate";
import ShareCard from "@/components/ShareCard";
import Paywall from "@/components/Paywall";

type Stage = "intro" | "consent" | "loading" | "result" | "error";

export default function ScanPage() {
  const profile = useStoreValue(getProfile);
  const scans = useStoreValue(getScans);
  const fileRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("intro");
  const [pending, setPending] = useState<{ b64: string; mt: string } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [showAge, setShowAge] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [saved, setSaved] = useState(false);

  function pickFile() {
    // Re-scans (beyond the free allowance) require Pro.
    if (scans.length >= FREE_SCAN_LIMIT && !profile.subscribed) {
      setShowPaywall(true);
      return;
    }
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.split(",")[1] ?? "";
      setPending({ b64, mt: file.type || "image/jpeg" });
      setStage("consent");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function analyze() {
    if (!pending) return;
    setStage("loading");
    track("scan_start");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: pending.b64,
          mediaType: pending.mt,
          consented: true,
        }),
      });
      const data = await res.json();
      if (data.flagged) {
        setError(
          data.flagReason ||
            "We couldn't analyze that image. HALO is for adults scanning themselves only.",
        );
        setStage("error");
        return;
      }
      if (!res.ok || !data.result) throw new Error(data.error || "failed");
      setResult(data.result);
      setSaved(false);
      setStage("result");
      track("scan_complete", { overall: data.result.overall });
    } catch {
      setError("Something went wrong analyzing your photo. Please try again.");
      setStage("error");
    } finally {
      // Privacy: drop the image bytes from memory immediately after sending.
      setPending(null);
    }
  }

  function saveResult() {
    if (!result) return;
    if (!profile.ageConfirmed18) {
      setShowAge(true);
      return;
    }
    persist();
  }

  function persist() {
    if (!result) return;
    addScan(result);
    setSaved(true);
    track("scan_saved");
  }

  const prev = scans.length ? scans[scans.length - 1] : null;
  const delta = result && prev ? result.overall - prev.overall : undefined;

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFile}
      />

      {stage === "intro" && (
        <div className="animate-rise">
          <header className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">HALO</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">
              Your <span className="halo-text">unfair advantage</span> in attraction.
            </h1>
            <p className="mt-3 text-sm text-muted">
              A private, honest baseline and a plan to level up — looks, grooming, style,
              and confidence. No account needed to see your first score.
            </p>
          </header>

          <div className="card grid place-items-center gap-5 p-8 text-center">
            <ScoreRing score={0} size={150} label="scan to reveal" />
            <button
              onClick={pickFile}
              className="halo-bg w-full rounded-2xl py-4 text-base font-semibold text-black"
            >
              Scan my selfie
            </button>
            <p className="text-xs text-muted">
              Scan yourself only. Your photo is analyzed and never stored.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-muted">
            {["Honest baseline", "Ranked plan", "Track your glow-up"].map((t) => (
              <div key={t} className="card px-2 py-3">
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === "consent" && (
        <div className="card mt-10 p-6 animate-rise">
          <h2 className="text-lg font-bold">Before we scan</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>• This is a private self-improvement baseline — only you see it.</li>
            <li>
              • Scan a clear photo of <strong>yourself</strong>, not anyone else.
            </li>
            <li>
              • Your photo is analyzed to generate your plan and is{" "}
              <strong>not stored</strong>.
            </li>
            <li>• HALO is for adults (18+). No minors.</li>
          </ul>
          <button
            onClick={analyze}
            className="halo-bg mt-5 w-full rounded-xl py-3 text-sm font-semibold text-black"
          >
            I agree — analyze my photo
          </button>
          <button
            onClick={() => setStage("intro")}
            className="mt-2 w-full py-2 text-sm text-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {stage === "loading" && (
        <div className="mt-24 grid place-items-center gap-6">
          <div className="halo-ring animate-spin-slow h-24 w-24 rounded-full" />
          <p className="text-sm text-muted">Reading your features…</p>
        </div>
      )}

      {stage === "error" && (
        <div className="card mt-16 p-6 text-center animate-rise">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setStage("intro")}
            className="halo-bg mt-5 rounded-xl px-6 py-2.5 text-sm font-semibold text-black"
          >
            Try again
          </button>
        </div>
      )}

      {stage === "result" && result && (
        <div className="animate-rise space-y-6">
          <div className="card grid place-items-center gap-3 p-6 text-center">
            <ScoreRing score={result.overall} potential={result.potential} size={200} />
            <p className="text-sm text-muted">{result.summary}</p>
            {delta != null && (
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  delta >= 0 ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
                }`}
              >
                {delta >= 0 ? "↑ +" : "↓ "}
                {Math.abs(delta)} vs last scan
              </span>
            )}
          </div>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Breakdown
            </h3>
            <div className="card space-y-4 p-5">
              {result.subScores.map((s) => (
                <SubScoreBar key={s.key} s={s} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Your plan — highest ROI first
            </h3>
            <PlanList plan={result.plan} />
          </section>

          <div className="sticky bottom-2 space-y-2">
            <button
              onClick={() => {
                setShowShare(true);
                track("share_open");
              }}
              className="halo-bg w-full rounded-xl py-3 text-sm font-semibold text-black"
            >
              Share my glow-up
            </button>
            <button
              onClick={saveResult}
              disabled={saved}
              className="glass w-full rounded-xl py-3 text-sm font-medium disabled:opacity-60"
            >
              {saved ? "Saved to Progress ✓" : "Save & track progress"}
            </button>
          </div>
        </div>
      )}

      {showAge && (
        <AgeGate
          reason="Create your account to save scans and track your progress over time."
          onCancel={() => setShowAge(false)}
          onConfirmed={() => {
            setShowAge(false);
            persist();
          }}
        />
      )}
      {showShare && result && (
        <ShareCard
          overall={result.overall}
          potential={result.potential}
          delta={delta != null && delta > 0 ? delta : undefined}
          onClose={() => setShowShare(false)}
        />
      )}
      {showPaywall && <Paywall feature="scan" onClose={() => setShowPaywall(false)} />}
    </div>
  );
}
