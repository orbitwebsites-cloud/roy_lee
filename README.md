# HALO — the $2M app MVP

> Working title. A **private self-improvement & confidence coach** that gives you an honest baseline, a ranked plan to level up (looks, grooming, style), and a de-risked dating-communication coach — built so its *only* missing variable is distribution.

This is the live MVP for the plan in `roy-lee-just-announced-melodic-metcalfe.md` (the "$2M app for Roy Lee" brief). It is a mobile-first **PWA**: open it on a phone, run a scan, track your glow-up, and use the Closer coach.

## What's built

**Mirror (wedge)** — upload a selfie → private HALO baseline + sub-scores (skin, hair, grooming, style, expression) + a ranked, highest-ROI-first improvement plan + a projected "potential" ceiling. The first result is **ungated** (no account needed) — that's the aha moment.

**Progress** — save scans to track a before/after trend, streak, glow-up share card, and a rotating **weekly quest** that keeps the loop alive past score plateaus.

**Closer (de-risked upsell)** — coaches *your own* dating bio / openers / replies. Locked behind a hard 18+ gate **and** a stronger verified-adult step. Never profiles third parties; never helps deceive or pressure.

**Virality, instrumented** — share/invite ("challenge a friend") events are tracked for a k-factor proxy (see the Me tab). Built, not deferred.

**Safety, built in** — 18+ gate (gates Mirror saving *and* Closer), stronger adult verification for Closer, explicit consent before analysis, **selfies are never stored** (analyzed then discarded), and one-tap "delete everything".

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Works with **no API key** — a built-in demo model returns a realistic scan so the whole flow is usable offline. For live Claude vision analysis, set `ANTHROPIC_API_KEY` (see `.env.example`); the app uses `claude-opus-4-8`.

```bash
npm run build && npm start   # production build
```

## Architecture

- **Next.js 16 (App Router) + Tailwind v4**, mobile-first PWA (`manifest.webmanifest`).
- **`src/lib/anthropic.ts`** — Claude vision (Mirror) + text (Closer) with safety-first system prompts and a deterministic offline fallback.
- **`src/app/api/analyze`, `/api/closer`** — server routes; reject un-consented analysis, likely-minor images, and un-verified Closer use.
- **`src/lib/store.ts`** — client persistence (localStorage) shaped to the planned **Supabase** schema (`users`, `scans`, `closer_sessions`, `events`) so production swaps in Supabase + RLS without UI changes. We persist scores/plans only — never images.
- **`src/components/`** — `ScoreRing`, `SubScoreBar`, `PlanList`, `AgeGate`, `AdultVerify`, `ShareCard`, `Paywall`, `TabBar`.

## Production swap-ins (planned)

Supabase (auth, Postgres + RLS, private image buckets), Stripe (subscription paywall) + Stripe Identity (adult verification), and geofencing of IL/EU until a full biometric-consent + DPIA flow ships. See the plan file for the full compliance workstream and the $2M valuation logic.
