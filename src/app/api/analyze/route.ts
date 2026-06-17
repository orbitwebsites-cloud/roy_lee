import { NextRequest, NextResponse } from "next/server";
import { analyzeSelfie } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

// Mirror engine. Accepts a base64 selfie of the USER, returns a private
// baseline + improvement plan. The image is analyzed and NOT persisted here.
export async function POST(req: NextRequest) {
  try {
    const { image, mediaType, consented } = await req.json();

    if (!consented) {
      return NextResponse.json(
        { error: "Consent is required before analysis." },
        { status: 400 },
      );
    }
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    const mt = allowed.includes(mediaType) ? mediaType : "image/jpeg";

    const { result, flagged, flagReason } = await analyzeSelfie(image, mt);

    if (flagged) {
      // Likely-minor or invalid image: reject BEFORE storing anything.
      return NextResponse.json({ flagged: true, flagReason }, { status: 422 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    console.error("analyze error", err);
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
