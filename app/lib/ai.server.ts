import Anthropic from "@anthropic-ai/sdk";
import { kvGet, kvSet } from "./kv.server";
import { PILLAR_HOOKS, WEEKLY_CADENCE, PILLAR_CONFIG } from "./constants";
import type { Pillar } from "./types";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function getMasterContext(data: {
  date?: string; dayOfWeek?: string; pillar?: string; pilotStatus?: string;
  calendarEvents?: string; workout?: string; atlasStatus?: string; skywayStatus?: string;
  fitnessStatus?: string;
}): string {
  return `You are Garrett Ray's personal AI Chief of Staff and Executive Assistant.
You have complete context on every area of his life and business.

IDENTITY:
- Garrett Ray, @flywithgarrett
- Boeing 787 commercial airline pilot (American Airlines)
- NYC-based lifestyle creator: 806K Instagram, 542K TikTok, 182K YouTube
- Founder: Atlas Hydration (clean zero-sugar electrolytes, 4 flavors, $29.99)
- Builder: SkyWay app (premium flight tracker, in development)
- Dog dad: Bella (Weimaraner)
- Background: Charlotte NC, wrestled competitively, avid golfer, paddle tennis
- Collaborators: Joey and Ali (content strategy team)

TODAY: ${data.date || new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
Content pillar: ${data.pillar || "Lifestyle & Finance"}
Pilot status: ${data.pilotStatus || "Unknown"}
Calendar: ${data.calendarEvents || "No events loaded"}
Workout: ${data.workout || "Check fitness plan"}
Atlas: ${data.atlasStatus || "Active — 4 flavors"}
SkyWay: ${data.skywayStatus || "MVP Build phase"}

CONTENT RULES:
- Instagram: lifestyle, dog dad, finance, travel, Optimize Life
- YouTube/TikTok: entrepreneur, Atlas, educational, quick-hit
- NEVER: airport, cockpit, uniform content on TikTok/YouTube
- Post 4-8 Instagram Stories daily
- Send new series concepts to Joey and Ali first

Be proactive, specific, actionable. Never generic. Think like a $300K/year EA.`;
}

export async function aiGenerate(userPrompt: string, systemOverride?: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: systemOverride || getMasterContext({}),
      messages: [{ role: "user", content: userPrompt }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : null;
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

export interface DailyIdea {
  hook: string; format: string; platform: string;
  why_now: string; filming_tip: string; estimated_reach: "low" | "medium" | "high";
}

export async function generateDailyBrief(pillar: string, pillarDescription: string, date: string): Promise<DailyIdea[]> {
  const cacheKey = `cache:brief:${date}`;
  const cached = await kvGet<DailyIdea[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const system = getMasterContext({ date, pillar });
  const text = await aiGenerate(
    `Generate 3 specific content ideas for today. Pillar: "${pillar}" — ${pillarDescription}.
Each must be hyper-specific — actual content Garrett can film TODAY in NYC.
Return ONLY JSON array: [{"hook":"...","format":"TikTok|Reel|YouTube Short|Instagram Story|YouTube Long","platform":"TikTok|Instagram|YouTube","why_now":"...","filming_tip":"...","estimated_reach":"low|medium|high"}]`,
    system
  );
  if (!text) return getFallbackIdeas(pillar);
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return getFallbackIdeas(pillar);
  try {
    const ideas = JSON.parse(match[0]) as DailyIdea[];
    if (ideas.length > 0) { await kvSet(cacheKey, ideas); return ideas; }
    return getFallbackIdeas(pillar);
  } catch { return getFallbackIdeas(pillar); }
}

function getFallbackIdeas(pillar: string): DailyIdea[] {
  const pillarKey = Object.keys(PILLAR_CONFIG).find((k) => PILLAR_CONFIG[k as Pillar].label.toLowerCase().includes(pillar.toLowerCase())) as Pillar || "lifestyle";
  const hooks = PILLAR_HOOKS[pillarKey] || PILLAR_HOOKS.lifestyle;
  return hooks.slice(0, 3).map((hook) => ({
    hook, format: "Reel", platform: "Instagram", why_now: "Evergreen content", filming_tip: "Film in natural light", estimated_reach: "medium" as const,
  }));
}

export interface DailyBriefing {
  summary: string; priority: string; bestFilmTime: string;
  atlasAction: string; skywayAction: string; fitnessNote: string;
}

export async function generateMorningBriefing(context: Parameters<typeof getMasterContext>[0]): Promise<DailyBriefing | null> {
  const cacheKey = `cache:morning:${context.date || new Date().toISOString().split("T")[0]}`;
  const cached = await kvGet<DailyBriefing>(cacheKey);
  if (cached) return cached;

  const text = await aiGenerate(
    `Given everything about Garrett's day today, generate:
1. A 2-sentence executive morning briefing (summary)
2. His #1 priority for today across all life areas (priority)
3. Best time to film content today based on schedule (bestFilmTime)
4. One Atlas Hydration action for today (atlasAction)
5. One SkyWay action for today (skywayAction)
6. One fitness/personal note (fitnessNote)
Return ONLY JSON: {"summary":"...","priority":"...","bestFilmTime":"...","atlasAction":"...","skywayAction":"...","fitnessNote":"..."}`,
    getMasterContext(context)
  );
  if (!text) return null;
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const briefing = JSON.parse(match[0]) as DailyBriefing;
    await kvSet(cacheKey, briefing);
    return briefing;
  } catch { return null; }
}

export interface TrendInsight { trend: string; why_it_works: string; how_garrett_can_use_it: string; }

export async function fetchTrendingContent(): Promise<TrendInsight[]> {
  const now = new Date();
  const cacheKey = `cache:trends:${now.toISOString().split("T")[0]}:${Math.floor(now.getHours() / 4)}`;
  const cached = await kvGet<TrendInsight[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const client = getClient();
  if (!client) return [];
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 2000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      messages: [{ role: "user", content: `Search for trending content on TikTok and Instagram right now in: NYC lifestyle, personal finance millennials, dog content, wellness supplements, entrepreneurship. Return 5 specific insights as JSON array: [{"trend":"...","why_it_works":"...","how_garrett_can_use_it":"..."}]` }],
    });
    const textBlock = msg.content.find((b: any) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : null;
    if (!text) return [];
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const trends = JSON.parse(match[0]) as TrendInsight[];
    if (trends.length > 0) await kvSet(cacheKey, trends);
    return trends;
  } catch { return []; }
}

export async function generateScript(hook: string, format: string): Promise<string | null> {
  const instructions: Record<string, string> = {
    "TikTok": "30-60 sec TikTok. Hook (0-3s) → Body (3-45s) → CTA (45-60s). Timestamps.",
    "Reel": "30-60 sec Reel. Hook (0-3s) → Body (3-45s) → CTA (45-60s). Timestamps.",
    "YouTube Short": "45-60 sec Short. Hook → Key insight → CTA. Timestamps.",
    "YouTube Long": "90 sec YouTube intro. Hook (0-5s) → Tease (5-15s) → Intro (15-60s) → Transition.",
    "YouTube": "90 sec YouTube intro. Hook (0-5s) → Tease (5-15s) → Intro (15-60s) → Transition.",
    "Instagram Story": "5-8 frame Story sequence. Each frame: text overlay + visual + duration.",
    "Story": "5-8 frame Story sequence. Each frame: text overlay + visual + duration.",
    "Caption": "Instagram caption. Hook → Story paragraph → CTA → 10 hashtags.",
  };
  return aiGenerate(`Write a ${format} script for: "${hook}"\n${instructions[format] || instructions["Reel"]}\nGarrett's voice. Punchy. No fluff.`);
}

export async function editScript(script: string, instruction: string): Promise<string | null> {
  return aiGenerate(`Edit this script: ${instruction}\n\nScript:\n${script}\n\nReturn ONLY the edited script.`);
}

export async function generateAnalysis(contentData: string): Promise<string | null> {
  return aiGenerate(`Analyze this data and return JSON: {"whatsWorking":[{"insight":"...","evidence":"...","action":"..."}],"whatsNotWorking":[{"insight":"...","evidence":"...","action":"..."}],"contentGaps":[{"pillar":"...","gap":"...","suggestion":"..."}],"weeklyFocus":"...","overallScore":7,"scoreSummary":"..."}\nData:\n${contentData}`);
}
