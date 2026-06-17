import { NextResponse } from "next/server";
import { aiEnabled, aiInfo } from "@/lib/ai";

// Lets the client show which provider/model powers each workload, without
// exposing any secret.
export async function GET() {
  return NextResponse.json({ ai: aiEnabled(), ...aiInfo() });
}
