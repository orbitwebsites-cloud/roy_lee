"use client";

import { useState } from "react";
import { saveProfile } from "@/lib/store";

// Stronger, privacy-preserving age assurance required to unlock the dating
// (Closer) features — stronger than the self-attested 18+ gate.
//
// In production this calls a provider (e.g. Stripe Identity) that returns ONLY
// an adult yes/no signal. We store the pass/fail + timestamp, never the raw ID.
// Here we simulate that round-trip so the gate is demonstrable end-to-end.
export default function AdultVerify({ onVerified }: { onVerified: () => void }) {
  const [state, setState] = useState<"idle" | "checking" | "done">("idle");

  function verify() {
    setState("checking");
    setTimeout(() => {
      // Simulated provider response: { adult: true }. Store result only.
      saveProfile({ adultVerified: true });
      setState("done");
      setTimeout(onVerified, 600);
    }, 1400);
  }

  return (
    <div className="card mx-auto mt-10 max-w-sm p-6 text-center animate-rise">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full halo-bg text-2xl text-black">
        ♥
      </div>
      <h3 className="mt-4 text-lg font-bold">Verify you&apos;re an adult</h3>
      <p className="mt-2 text-sm text-muted">
        Dating features are locked until your age is verified. This is a one-time,
        privacy-preserving check — we receive only an adult yes/no and never store your ID.
      </p>
      <button
        onClick={verify}
        disabled={state !== "idle"}
        className="halo-bg mt-5 w-full rounded-xl py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        {state === "idle" && "Verify with secure provider"}
        {state === "checking" && "Verifying…"}
        {state === "done" && "Verified ✓"}
      </button>
      <p className="mt-3 text-[11px] text-muted">
        Powered by a third-party identity provider (e.g. Stripe Identity).
      </p>
    </div>
  );
}
