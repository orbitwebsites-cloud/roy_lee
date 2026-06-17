import { NextRequest, NextResponse } from "next/server";
import { runCloser } from "@/lib/ai";
import type { CloserKind } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS: CloserKind[] = ["bio", "opener", "reply"];

// Closer engine — coaches the USER's own messages only. No third-party
// profiling. Gated behind verified-adult status on the client.
export async function POST(req: NextRequest) {
  try {
    const { kind, context, adultVerified } = await req.json();

    if (!adultVerified) {
      return NextResponse.json(
        { error: "Closer requires verified-adult status." },
        { status: 403 },
      );
    }
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }
    if (!context || typeof context !== "string" || context.trim().length < 3) {
      return NextResponse.json({ error: "Add a little context first." }, { status: 400 });
    }

    const result = await runCloser(kind, context.slice(0, 4000));
    return NextResponse.json({ result });
  } catch (err) {
    console.error("closer error", err);
    return NextResponse.json({ error: "Coaching failed." }, { status: 500 });
  }
}
