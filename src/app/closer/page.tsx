"use client";

import { useState } from "react";
import type { CloserKind, CloserResult } from "@/lib/types";
import {
  getProfile,
  getCloser,
  addCloser,
  track,
  FREE_CLOSER_LIMIT,
} from "@/lib/store";
import { useStoreValue } from "@/lib/useStore";
import AgeGate from "@/components/AgeGate";
import AdultVerify from "@/components/AdultVerify";
import Paywall from "@/components/Paywall";

const TABS: { kind: CloserKind; label: string; placeholder: string }[] = [
  { kind: "bio", label: "Optimize bio", placeholder: "Paste your current bio or a few notes about you…" },
  { kind: "opener", label: "Openers", placeholder: "Describe the situation and what you can share about yourself…" },
  { kind: "reply", label: "Reply coach", placeholder: "Paraphrase the conversation you're stuck on…" },
];

export default function CloserPage() {
  const profile = useStoreValue(getProfile);
  const history = useStoreValue(getCloser);
  const [showAge, setShowAge] = useState(false);

  // Gate 1: 18+ self-attestation.
  if (!profile.ageConfirmed18) {
    return (
      <div className="mt-20 text-center animate-rise">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full halo-bg text-2xl text-black">
          ♥
        </div>
        <h1 className="mt-4 text-2xl font-bold">Closer</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Your dating performance coach — optimize your profile and get genuine openers
          and replies. Adults only.
        </p>
        <button
          onClick={() => setShowAge(true)}
          className="halo-bg mt-6 rounded-xl px-6 py-3 text-sm font-semibold text-black"
        >
          I&apos;m 18 or older
        </button>
        {showAge && (
          <AgeGate
            reason="Closer is an 18+ dating feature."
            onCancel={() => setShowAge(false)}
            onConfirmed={() => setShowAge(false)}
          />
        )}
      </div>
    );
  }

  // Gate 2: stronger verified-adult check.
  if (!profile.adultVerified) {
    return <AdultVerify onVerified={() => track("closer_unlocked")} />;
  }

  return <CloserTools subscribed={profile.subscribed} usedCount={history.length} />;
}

function CloserTools({ subscribed, usedCount }: { subscribed: boolean; usedCount: number }) {
  const [kind, setKind] = useState<CloserKind>("bio");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CloserResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const tab = TABS.find((t) => t.kind === kind)!;

  async function run() {
    if (usedCount >= FREE_CLOSER_LIMIT && !subscribed) {
      setShowPaywall(true);
      return;
    }
    if (context.trim().length < 3) return;
    setLoading(true);
    setResult(null);
    track("closer_run", { kind });
    try {
      const res = await fetch("/api/closer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, context, adultVerified: true }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        addCloser(data.result);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, i: number) {
    await navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="animate-rise space-y-5">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Closer</h1>
        <p className="mt-1 text-sm text-muted">Coaches your side — genuine, never fake.</p>
      </header>

      <div className="grid grid-cols-3 gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.kind}
            onClick={() => {
              setKind(t.kind);
              setResult(null);
            }}
            className={`rounded-xl px-2 py-2 text-xs font-medium transition ${
              kind === t.kind ? "halo-bg text-black" : "card text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder={tab.placeholder}
        rows={5}
        className="w-full rounded-2xl border border-border bg-surface-2 p-4 text-sm outline-none focus:border-[var(--halo-via)]"
      />

      <button
        onClick={run}
        disabled={loading}
        className="halo-bg w-full rounded-xl py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {loading ? "Coaching…" : "Get suggestions"}
      </button>

      {result && (
        <div className="space-y-2">
          {result.suggestions.map((s, i) => (
            <div key={i} className="card p-4 animate-rise">
              <p className="text-sm">{s}</p>
              <button
                onClick={() => copy(s, i)}
                className="mt-2 text-xs halo-text"
              >
                {copied === i ? "Copied ✓" : "Copy"}
              </button>
            </div>
          ))}
          {result.coaching && (
            <div className="rounded-xl border border-border p-4 text-sm text-muted">
              <span className="halo-text font-semibold">Tip: </span>
              {result.coaching}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-muted">
        Closer never profiles other people and won&apos;t help deceive or pressure anyone.
      </p>

      {showPaywall && (
        <Paywall feature="Closer sessions" onClose={() => setShowPaywall(false)} />
      )}
    </div>
  );
}
