"use client";

import { useEffect, useState } from "react";
import {
  getProfile,
  getScans,
  getCloser,
  getEvents,
  deleteEverything,
} from "@/lib/store";
import { useStoreValue } from "@/lib/useStore";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function MePage() {
  const profile = useStoreValue(getProfile);
  const scans = useStoreValue(getScans);
  const closer = useStoreValue(getCloser);
  const events = useStoreValue(getEvents);
  const [confirm, setConfirm] = useState(false);
  const [ai, setAi] = useState<string>("…");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setAi(d.ai ? "Claude vision (live)" : "Demo model (no API key)"))
      .catch(() => setAi("Demo model"));
  }, []);

  const shares = events.filter((e) => e.type === "share").length;
  const invites = events.filter(
    (e) => e.type === "share" && (e.meta as { kind?: string })?.kind === "invite",
  ).length;
  // Rough k-factor proxy for the demo: invites per activated user.
  const kFactor = scans.length ? (invites / Math.max(1, 1)).toFixed(2) : "0.00";

  return (
    <div className="animate-rise space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Me</h1>
      </header>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Account & safety
        </h2>
        <Row label="Age verified (18+)" value={profile.ageConfirmed18 ? "Yes" : "No"} />
        <Row
          label="Adult-verified (Closer)"
          value={profile.adultVerified ? "Yes" : "Not yet"}
        />
        <Row label="Subscription" value={profile.subscribed ? "HALO Pro" : "Free"} />
        <Row label="Saved scans" value={String(scans.length)} />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Your privacy
        </h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>• Your selfies are analyzed and <strong>never stored</strong>.</li>
          <li>• We keep only your scores and plans, on this device.</li>
          <li>• Closer never analyzes or profiles other people.</li>
          <li>• Delete everything below, anytime, in one tap.</li>
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Growth signals (demo)
        </h2>
        <p className="mb-2 text-xs text-muted">
          The asset Roy buys: a loop that already converts. These would feed a growth
          dashboard in production.
        </p>
        <Row label="Scans completed" value={String(events.filter((e) => e.type === "scan_complete").length)} />
        <Row label="Closer sessions" value={String(closer.length)} />
        <Row label="Shares" value={String(shares)} />
        <Row label="Friend challenges sent" value={String(invites)} />
        <Row label="Viral coefficient (k, demo)" value={kFactor} />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Engine
        </h2>
        <Row label="AI analysis" value={ai} />
        <p className="mt-1 text-[11px] text-muted">
          When an Anthropic API key is configured, scans use Claude vision. Otherwise a
          built-in demo model runs so the full flow is usable offline.
        </p>
      </section>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full rounded-xl border border-bad/50 py-3 text-sm font-medium text-bad"
        >
          Delete everything
        </button>
      ) : (
        <div className="card border border-bad/40 p-5">
          <p className="text-sm">
            This permanently deletes your scans, plans, Closer history, and verification
            status from this device. This cannot be undone.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm"
            >
              Keep
            </button>
            <button
              onClick={() => {
                deleteEverything();
                setConfirm(false);
              }}
              className="flex-1 rounded-xl bg-bad py-2.5 text-sm font-semibold text-black"
            >
              Delete it all
            </button>
          </div>
        </div>
      )}

      <p className="pb-2 text-center text-[11px] text-muted">
        HALO · a private self-improvement coach · 18+
      </p>
    </div>
  );
}
