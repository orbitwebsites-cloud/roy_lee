"use client";

import type { Profile, ScanResult, CloserResult } from "./types";

// Client-side persistence for the MVP. The shape mirrors the planned Supabase
// schema (users, scans, closer_sessions, events) so production can swap this
// module for Supabase calls with RLS without touching the UI.
//
// IMPORTANT (privacy): we deliberately persist only SCORES and PLANS — never
// the uploaded image. The selfie is sent to the API, scored, and discarded.

const K = {
  profile: "halo.profile",
  scans: "halo.scans",
  closer: "halo.closer",
  events: "halo.events",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("halo:update"));
}

// --- Profile / safety -------------------------------------------------------

export function getProfile(): Profile {
  return read<Profile>(K.profile, {
    dob: null,
    ageConfirmed18: false,
    adultVerified: false,
    consentedToAnalysis: false,
    subscribed: false,
    createdAt: Date.now(),
  });
}

export function saveProfile(patch: Partial<Profile>) {
  write(K.profile, { ...getProfile(), ...patch });
}

/** 18+ gate. Returns true only if DOB is present AND age >= 18. */
export function confirmAge(dobISO: string): boolean {
  const dob = new Date(dobISO);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  const ok = age >= 18;
  saveProfile({ dob: dobISO, ageConfirmed18: ok });
  return ok;
}

// --- Scans ------------------------------------------------------------------

export function getScans(): ScanResult[] {
  return read<ScanResult[]>(K.scans, []).sort((a, b) => a.createdAt - b.createdAt);
}

export function addScan(scan: ScanResult) {
  write(K.scans, [...read<ScanResult[]>(K.scans, []), scan]);
}

export function latestScan(): ScanResult | null {
  const all = getScans();
  return all.length ? all[all.length - 1] : null;
}

// --- Closer -----------------------------------------------------------------

export function getCloser(): CloserResult[] {
  return read<CloserResult[]>(K.closer, []);
}

export function addCloser(c: CloserResult) {
  write(K.closer, [c, ...read<CloserResult[]>(K.closer, [])].slice(0, 25));
}

// --- Growth instrumentation (k-factor) --------------------------------------
// These events are the actual ASSET: share-rate, invites, activation. In
// production they'd flow to the `events` table and a growth dashboard.

export type GrowthEvent = { type: string; at: number; meta?: Record<string, unknown> };

export function track(type: string, meta?: Record<string, unknown>) {
  const all = read<GrowthEvent[]>(K.events, []);
  write(K.events, [...all, { type, at: Date.now(), meta }]);
}

export function getEvents(): GrowthEvent[] {
  return read<GrowthEvent[]>(K.events, []);
}

// --- Right to be forgotten --------------------------------------------------
// One-tap "delete everything". In production this also purges Supabase Storage
// objects, DB rows, the Stripe customer, and the age-verification record.

export function deleteEverything() {
  if (typeof window === "undefined") return;
  Object.values(K).forEach((k) => localStorage.removeItem(k));
  window.dispatchEvent(new Event("halo:update"));
}

// Free-tier usage limit (drives the paywall).
export const FREE_SCAN_LIMIT = 1;
export const FREE_CLOSER_LIMIT = 2;
