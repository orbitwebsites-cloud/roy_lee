"use client";

import { useEffect } from "react";
import { saveProfile, track } from "@/lib/store";

// Freemium paywall. Appears after free limits. In production this is Stripe
// Checkout; here we simulate the purchase so the flow is demonstrable.
export default function Paywall({
  onClose,
  feature,
}: {
  onClose: () => void;
  feature: string;
}) {
  useEffect(() => {
    track("paywall_view", { feature });
  }, [feature]);

  function subscribe() {
    track("subscribe", { plan: "monthly" });
    saveProfile({ subscribed: true });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-5">
      <div className="card w-full max-w-sm p-6 animate-rise">
        <h3 className="text-xl font-bold">Unlock HALO Pro</h3>
        <p className="mt-1 text-sm text-muted">
          You&apos;ve used your free {feature}. Go Pro to keep leveling up.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {[
            "Unlimited scans & weekly re-scans",
            "Full ranked improvement plan + projected potential",
            "Unlimited Closer coaching",
            "Progress tracking, streaks & glow-up cards",
          ].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="halo-text">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-xl border border-border p-4 text-center">
          <div className="font-mono text-3xl font-bold">
            $29.99<span className="text-base font-normal text-muted">/mo</span>
          </div>
          <div className="text-xs text-muted">or $9.99/week · cancel anytime</div>
        </div>
        <button
          onClick={subscribe}
          className="halo-bg mt-4 w-full rounded-xl py-3 text-sm font-semibold text-black"
        >
          Start Pro
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2 text-sm text-muted">
          Maybe later
        </button>
      </div>
    </div>
  );
}
