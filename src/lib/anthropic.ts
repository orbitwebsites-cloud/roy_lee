import Anthropic from "@anthropic-ai/sdk";
import type { CloserKind, ScanResult, CloserResult } from "./types";

// Latest, most capable Claude model (see claude-api skill). Vision + structured JSON.
const MODEL = "claude-opus-4-8";

const hasKey = !!process.env.ANTHROPIC_API_KEY;
const client = hasKey ? new Anthropic() : null;

export function aiEnabled() {
  return hasKey;
}

// --- Safety-first system prompts -------------------------------------------
// HALO is a PRIVATE self-improvement coach, not a "hotness rater". The score is
// a private, improvement-oriented baseline. These guardrails are load-bearing
// for Apple/Anthropic policy compliance.

const MIRROR_SYSTEM = `You are HALO, a private, supportive self-improvement coach.
A user has uploaded a photo of THEMSELVES to get a constructive baseline and a plan to level up their appearance, grooming, and style.

RULES (non-negotiable):
- This is self-improvement coaching for the uploader only. Be kind, specific, and constructive — never cruel, demeaning, or shaming.
- The "overall" number is a PRIVATE baseline for tracking progress, framed around things the person can change (skin, hair, grooming, style, photo/expression), not a verdict on their worth.
- If the person in the photo appears to be a MINOR (under 18), or the image is not a clear photo of a single human face, set "flagged" true with a short "flagReason" and do not score.
- Focus the plan on the highest-ROI, most changeable factors first. Be encouraging about potential.

Return ONLY a JSON object with this exact shape:
{
  "flagged": boolean,
  "flagReason": string,
  "overall": number (0-100),
  "potential": number (0-100, >= overall),
  "summary": string (one warm, motivating sentence),
  "subScores": [{ "key": string, "label": string, "score": number (0-100), "note": string }],
  "plan": [{ "rank": number, "title": string, "why": string, "action": string, "projectedLift": number, "effort": "easy"|"medium"|"committed" }]
}
Provide 5 subScores (skin, hair, grooming, style, expression) and 4 plan items ranked by ROI.`;

const CLOSER_SYSTEM = `You are HALO Closer, a communication coach that helps the USER write their OWN dating messages with more confidence and warmth.

RULES (non-negotiable):
- Coach the user's side only. Never help deceive, manipulate, pressure, or coerce anyone. No content that misrepresents who the user is.
- Keep suggestions respectful, genuine, and consent-respecting. Decline anything sexual, demeaning, or manipulative.
- Do NOT analyze, rate, or profile other people. Work only from the context the user provides about themselves and the general situation.

Return ONLY a JSON object:
{ "suggestions": string[] (3 distinct options), "coaching": string (one practical tip) }`;

// --- Public API -------------------------------------------------------------

export async function analyzeSelfie(
  base64: string,
  mediaType: string,
): Promise<{ result?: ScanResult; flagged?: boolean; flagReason?: string }> {
  if (!client) return { ...mockScan() };

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: MIRROR_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/png" | "image/jpeg" | "image/webp",
              data: base64,
            },
          },
          { type: "text", text: "Give me my private HALO baseline and improvement plan." },
        ],
      },
    ],
  });

  const json = extractJson(msg);
  if (!json) return { ...mockScan() };
  if (json.flagged) return { flagged: true, flagReason: json.flagReason || "Image could not be analyzed." };

  return {
    result: {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      overall: clamp(json.overall),
      potential: clamp(Math.max(json.potential ?? 0, json.overall ?? 0)),
      summary: String(json.summary ?? "You've got a strong base to build on."),
      subScores: (json.subScores ?? []).map((s: Record<string, unknown>) => ({
        key: String(s.key ?? ""),
        label: String(s.label ?? ""),
        score: clamp(Number(s.score)),
        note: String(s.note ?? ""),
      })),
      plan: (json.plan ?? []).map((p: Record<string, unknown>, i: number) => ({
        rank: Number(p.rank ?? i + 1),
        title: String(p.title ?? ""),
        why: String(p.why ?? ""),
        action: String(p.action ?? ""),
        projectedLift: Number(p.projectedLift ?? 0.3),
        effort: (["easy", "medium", "committed"].includes(String(p.effort))
          ? p.effort
          : "medium") as "easy" | "medium" | "committed",
      })),
    },
  };
}

export async function runCloser(
  kind: CloserKind,
  context: string,
): Promise<CloserResult> {
  if (!client) return mockCloser(kind);

  const prompts: Record<CloserKind, string> = {
    bio: `Here is my own dating bio draft (or notes about me). Rewrite it into 3 stronger, authentic versions:\n\n${context}`,
    opener: `I want to start a conversation. Here's the context I can share about the situation and me:\n\n${context}\n\nSuggest 3 genuine openers I could send.`,
    reply: `Here's a conversation I'm in (paraphrased) and I'm not sure how to reply:\n\n${context}\n\nSuggest 3 warm, genuine replies and how to move toward asking them out.`,
  };

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: CLOSER_SYSTEM,
    messages: [{ role: "user", content: prompts[kind] }],
  });

  const json = extractJson(msg);
  if (!json) return mockCloser(kind);
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    kind,
    suggestions: Array.isArray(json.suggestions) ? json.suggestions.map(String) : [],
    coaching: String(json.coaching ?? ""),
  };
}

// --- helpers ----------------------------------------------------------------

function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJson(msg: Anthropic.Message): any | null {
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// --- Deterministic offline mock (so the MVP is demonstrable without a key) ---

function seededScores(): ScanResult {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    overall: 68,
    potential: 84,
    summary: "Strong bones to build on — a few easy wins unlock most of your ceiling.",
    subScores: [
      { key: "skin", label: "Skin", score: 64, note: "Even tone, but hydration and a simple AM/PM routine would lift clarity fast." },
      { key: "hair", label: "Hair", score: 71, note: "Good volume. A sharper cut tailored to your face shape adds the most here." },
      { key: "grooming", label: "Grooming", score: 66, note: "Tidy. Defining your brows and a cleaner neckline are quick upgrades." },
      { key: "style", label: "Style", score: 62, note: "Fit is the lever — clothes that match your frame read as a big jump." },
      { key: "expression", label: "Photo & expression", score: 75, note: "Relaxed and warm. Better lighting and angles photograph your best self." },
    ],
    plan: [
      { rank: 1, title: "Dial in fit, not price", why: "Fit changes perceived everything — posture, shape, confidence — for near-zero cost.", action: "Get your two most-worn outfits tailored this week.", projectedLift: 0.7, effort: "easy" },
      { rank: 2, title: "Two-step skincare", why: "Skin clarity is the single most-noticed facial factor and improves in weeks.", action: "Add a gentle cleanser + moisturizer with SPF, morning and night.", projectedLift: 0.6, effort: "easy" },
      { rank: 3, title: "A cut built for your face", why: "The right cut frames your features and is a one-time, high-impact change.", action: "Book a stylist and ask for a cut for your face shape.", projectedLift: 0.5, effort: "medium" },
      { rank: 4, title: "Lighting & angles", why: "Most of your dating-photo gap is lighting, not looks.", action: "Shoot near a window at eye level; pick from 20 frames.", projectedLift: 0.4, effort: "easy" },
    ],
  };
}

function mockScan(): { result: ScanResult } {
  return { result: seededScores() };
}

function mockCloser(kind: CloserKind): CloserResult {
  const map: Record<CloserKind, { suggestions: string[]; coaching: string }> = {
    bio: {
      suggestions: [
        "Engineer by day, terrible-pun enthusiast by night. I'll out-plan you on a trip and lose to you at Mario Kart. Looking for someone curious and kind.",
        "I make a serious negroni and an even more serious playlist. Into climbing, second helpings, and people who text back. Show me your hometown's best food.",
        "Equal parts gym, bookstore, and taco truck. I value good questions over small talk. If you've got a strong opinion on pizza, we'll get along.",
      ],
      coaching: "Lead with specifics, not adjectives — a concrete detail invites a reply far better than 'fun and easygoing'.",
    },
    opener: {
      suggestions: [
        "Okay, important question to set the tone: is a hot dog a sandwich? Your answer determines everything.",
        "Your photos say you've actually been places — what's the one trip you'd repeat tomorrow?",
        "I'm choosing to believe we'd lose a trivia night together spectacularly. What's your useless-but-confident specialty subject?",
      ],
      coaching: "Ask one specific, easy-to-answer question — it gives them an obvious hook to reply to.",
    },
    reply: {
      suggestions: [
        "Ha, that's a strong take and I respect it. Counter-proposal: we settle it over coffee this week — Thursday or Saturday?",
        "You're more fun than my notifications deserve. Want to trade the texting for an actual drink? I know a good spot.",
        "Calling it now: this is better in person. Free for a low-stakes coffee this weekend?",
      ],
      coaching: "Once there's momentum, make the ask specific and low-pressure — offer two concrete time options.",
    },
  };
  return { id: crypto.randomUUID(), createdAt: Date.now(), kind, ...map[kind] };
}
