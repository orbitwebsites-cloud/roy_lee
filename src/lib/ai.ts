import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { CloserKind, ScanResult, CloserResult } from "./types";

// Provider-agnostic AI layer for HALO.
//
// Two workloads with different needs:
//   - Mirror (selfie scoring) -> requires a VISION/multimodal model
//   - Closer (bio/openers/replies) -> text-only
//
// All non-Anthropic providers here are OpenAI-compatible, so we drive them with
// the OpenAI SDK pointed at each base URL. Pick a provider per workload via
// MIRROR_PROVIDER / CLOSER_PROVIDER; otherwise we auto-select the first one with
// a key. Model IDs drift, so every default is overridable via env.
//
// PRIVACY NOTE: Mirror images are faces (biometric data). Choose the Mirror
// provider with data-residency + no-training terms in mind (see README). Text
// (Closer) carries no sensitive data and can go to the cheapest/fastest option.

type ProviderId = "anthropic" | "groq" | "cerebras" | "siliconflow" | "openrouter";

type ProviderCfg = {
  id: ProviderId;
  label: string;
  keyEnv: string;
  baseURL?: string; // omitted for anthropic (uses its own SDK)
  vision: boolean;
  defaultChatModel: string;
  defaultVisionModel?: string;
  chatModelEnv: string;
  visionModelEnv: string;
};

const PROVIDERS: Record<ProviderId, ProviderCfg> = {
  anthropic: {
    id: "anthropic",
    label: "Claude",
    keyEnv: "ANTHROPIC_API_KEY",
    vision: true,
    defaultChatModel: "claude-opus-4-8",
    defaultVisionModel: "claude-opus-4-8",
    chatModelEnv: "ANTHROPIC_CHAT_MODEL",
    visionModelEnv: "ANTHROPIC_VISION_MODEL",
  },
  groq: {
    id: "groq",
    label: "Groq",
    keyEnv: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    vision: true,
    defaultChatModel: "openai/gpt-oss-120b",
    defaultVisionModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    chatModelEnv: "GROQ_CHAT_MODEL",
    visionModelEnv: "GROQ_VISION_MODEL",
  },
  cerebras: {
    id: "cerebras",
    label: "Cerebras",
    keyEnv: "CEREBRAS_API_KEY",
    baseURL: "https://api.cerebras.ai/v1",
    vision: false, // text-only platform — great for Closer
    defaultChatModel: "gpt-oss-120b",
    chatModelEnv: "CEREBRAS_CHAT_MODEL",
    visionModelEnv: "CEREBRAS_VISION_MODEL",
  },
  siliconflow: {
    id: "siliconflow",
    label: "SiliconFlow",
    keyEnv: "SILICONFLOW_API_KEY",
    baseURL: "https://api.siliconflow.com/v1",
    vision: true,
    defaultChatModel: "Qwen/Qwen2.5-7B-Instruct",
    defaultVisionModel: "Qwen/Qwen2.5-VL-72B-Instruct",
    chatModelEnv: "SILICONFLOW_CHAT_MODEL",
    visionModelEnv: "SILICONFLOW_VISION_MODEL",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    keyEnv: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    vision: true,
    defaultChatModel: "meta-llama/llama-3.3-70b-instruct:free",
    defaultVisionModel: "qwen/qwen2.5-vl-72b-instruct:free",
    chatModelEnv: "OPENROUTER_CHAT_MODEL",
    visionModelEnv: "OPENROUTER_VISION_MODEL",
  },
};

// Auto-select order when no explicit provider is set.
const VISION_ORDER: ProviderId[] = ["anthropic", "groq", "openrouter", "siliconflow"];
const CHAT_ORDER: ProviderId[] = ["cerebras", "groq", "openrouter", "siliconflow", "anthropic"];

function hasKey(p: ProviderCfg) {
  return !!process.env[p.keyEnv];
}
function chatModel(p: ProviderCfg) {
  return process.env[p.chatModelEnv] || p.defaultChatModel;
}
function visionModel(p: ProviderCfg) {
  return process.env[p.visionModelEnv] || p.defaultVisionModel || "";
}

function pickProvider(kind: "vision" | "chat"): ProviderCfg | null {
  const explicit = (
    kind === "vision" ? process.env.MIRROR_PROVIDER : process.env.CLOSER_PROVIDER
  ) as ProviderId | undefined;
  if (explicit && PROVIDERS[explicit]) {
    const p = PROVIDERS[explicit];
    if (hasKey(p) && (kind === "chat" || p.vision)) return p;
  }
  for (const id of kind === "vision" ? VISION_ORDER : CHAT_ORDER) {
    const p = PROVIDERS[id];
    if (hasKey(p) && (kind === "chat" || p.vision)) return p;
  }
  return null;
}

function openaiClient(p: ProviderCfg) {
  return new OpenAI({
    apiKey: process.env[p.keyEnv]!,
    baseURL: p.baseURL,
    defaultHeaders:
      p.id === "openrouter"
        ? { "HTTP-Referer": "https://halo.app", "X-Title": "HALO" }
        : undefined,
  });
}

export function aiEnabled() {
  return (Object.values(PROVIDERS) as ProviderCfg[]).some(hasKey);
}

/** For the status surface: which provider/model powers each workload. */
export function aiInfo() {
  const v = pickProvider("vision");
  const c = pickProvider("chat");
  return {
    mirror: v ? `${v.label} · ${visionModel(v)}` : "Demo model",
    closer: c ? `${c.label} · ${chatModel(c)}` : "Demo model",
  };
}

// --- Safety-first system prompts (provider-independent) ---------------------

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
Provide 5 subScores (skin, hair, grooming, style, expression) and 4 plan items ranked by ROI. Output JSON only, no prose.`;

const CLOSER_SYSTEM = `You are HALO Closer, a communication coach that helps the USER write their OWN dating messages with more confidence and warmth.

RULES (non-negotiable):
- Coach the user's side only. Never help deceive, manipulate, pressure, or coerce anyone. No content that misrepresents who the user is.
- Keep suggestions respectful, genuine, and consent-respecting. Decline anything sexual, demeaning, or manipulative.
- Do NOT analyze, rate, or profile other people. Work only from the context the user provides about themselves and the general situation.

Return ONLY a JSON object, no prose:
{ "suggestions": string[] (3 distinct options), "coaching": string (one practical tip) }`;

// --- Low-level provider calls -----------------------------------------------

async function chatComplete(p: ProviderCfg, system: string, user: string): Promise<string> {
  if (p.id === "anthropic") {
    const a = new Anthropic();
    const m = await a.messages.create({
      model: chatModel(p),
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: user }],
    });
    return anthropicText(m);
  }
  const c = openaiClient(p);
  const r = await c.chat.completions.create({
    model: chatModel(p),
    max_tokens: 1200,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}

async function visionComplete(
  p: ProviderCfg,
  system: string,
  user: string,
  b64: string,
  mt: string,
): Promise<string> {
  if (p.id === "anthropic") {
    const a = new Anthropic();
    const m = await a.messages.create({
      model: visionModel(p),
      max_tokens: 2000,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mt as "image/png" | "image/jpeg" | "image/webp",
                data: b64,
              },
            },
            { type: "text", text: user },
          ],
        },
      ],
    });
    return anthropicText(m);
  }
  const c = openaiClient(p);
  const r = await c.chat.completions.create({
    model: visionModel(p),
    max_tokens: 2000,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: `data:${mt};base64,${b64}` } },
        ],
      },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}

function anthropicText(m: Anthropic.Message) {
  return m.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// --- Public API (stable signatures used by the route handlers) --------------

export async function analyzeSelfie(
  base64: string,
  mediaType: string,
): Promise<{ result?: ScanResult; flagged?: boolean; flagReason?: string }> {
  const p = pickProvider("vision");
  if (!p) return mockScan();

  try {
    const raw = await visionComplete(
      p,
      MIRROR_SYSTEM,
      "Give me my private HALO baseline and improvement plan.",
      base64,
      mediaType,
    );
    const json = extractJson(raw);
    if (!json) return mockScan();
    if (json.flagged)
      return { flagged: true, flagReason: json.flagReason || "Image could not be analyzed." };

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
        plan: (json.plan ?? []).map((pl: Record<string, unknown>, i: number) => ({
          rank: Number(pl.rank ?? i + 1),
          title: String(pl.title ?? ""),
          why: String(pl.why ?? ""),
          action: String(pl.action ?? ""),
          projectedLift: Number(pl.projectedLift ?? 0.3),
          effort: (["easy", "medium", "committed"].includes(String(pl.effort))
            ? pl.effort
            : "medium") as "easy" | "medium" | "committed",
        })),
      },
    };
  } catch (err) {
    console.error(`[ai] vision provider ${p.id} failed, using demo model:`, err);
    return mockScan();
  }
}

export async function runCloser(kind: CloserKind, context: string): Promise<CloserResult> {
  const p = pickProvider("chat");
  if (!p) return mockCloser(kind);

  const prompts: Record<CloserKind, string> = {
    bio: `Here is my own dating bio draft (or notes about me). Rewrite it into 3 stronger, authentic versions:\n\n${context}`,
    opener: `I want to start a conversation. Here's the context I can share about the situation and me:\n\n${context}\n\nSuggest 3 genuine openers I could send.`,
    reply: `Here's a conversation I'm in (paraphrased) and I'm not sure how to reply:\n\n${context}\n\nSuggest 3 warm, genuine replies and how to move toward asking them out.`,
  };

  try {
    const raw = await chatComplete(p, CLOSER_SYSTEM, prompts[kind]);
    const json = extractJson(raw);
    if (!json) return mockCloser(kind);
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      kind,
      suggestions: Array.isArray(json.suggestions) ? json.suggestions.map(String) : [],
      coaching: String(json.coaching ?? ""),
    };
  } catch (err) {
    console.error(`[ai] chat provider ${p.id} failed, using demo model:`, err);
    return mockCloser(kind);
  }
}

// --- helpers ----------------------------------------------------------------

function clamp(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// --- Deterministic offline mock (so the MVP is demonstrable without any key) -

function mockScan(): { result: ScanResult } {
  return {
    result: {
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
    },
  };
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
