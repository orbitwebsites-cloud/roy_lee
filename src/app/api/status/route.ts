import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/anthropic";

// Lets the client show whether live Claude analysis or the offline demo model
// is active, without exposing any secret.
export async function GET() {
  return NextResponse.json({ ai: aiEnabled() });
}
