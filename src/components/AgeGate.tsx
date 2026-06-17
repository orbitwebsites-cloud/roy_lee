"use client";

import { useState } from "react";
import { confirmAge } from "@/lib/store";

// Hard 18+ gate. Gates saving/tracking on Mirror AND is a prerequisite for
// Closer (which adds a stronger verified-adult step on top).
export default function AgeGate({
  onConfirmed,
  onCancel,
  reason,
}: {
  onConfirmed: () => void;
  onCancel: () => void;
  reason: string;
}) {
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (confirmAge(dob)) {
      onConfirmed();
    } else {
      setError("You must be 18 or older to use HALO. Account creation is blocked.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
      <div className="card w-full max-w-sm p-6 animate-rise">
        <h3 className="text-lg font-bold">Confirm you&apos;re 18+</h3>
        <p className="mt-1 text-sm text-muted">{reason}</p>
        <label className="mt-4 block text-xs uppercase tracking-wide text-muted">
          Date of birth
        </label>
        <input
          type="date"
          value={dob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => {
            setDob(e.target.value);
            setError("");
          }}
          className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-foreground outline-none focus:border-[var(--halo-via)]"
        />
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="halo-bg flex-1 rounded-xl py-2.5 text-sm font-semibold text-black"
          >
            Confirm
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Your date of birth is used only to verify you&apos;re an adult. No minors are
          permitted on HALO.
        </p>
      </div>
    </div>
  );
}
