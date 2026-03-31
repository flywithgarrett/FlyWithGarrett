import Anthropic from "@anthropic-ai/sdk";
import { kvGet, kvSet } from "./kv.server";
import { PILLAR_HOOKS } from "./constants";
import type { Pillar } from "./types";

const SYSTEM_PROMPT = `You are the personal creative director and content strategist for Garrett Ray (@flywithgarrett). He is a Boeing 787 commercial airline pilot, NYC-based lifestyle creator with 806K Instagram followers and 542K TikTok followers, founder of Atlas Hydration (clean zero-sugar electrolyte brand), and builder of SkyWay (flight tracking app). His dog is Bella (Weimaraner). He lives in NYC. His tone: confident, authentic, aspirational, grounded, funny, self-aware. NEVER mention airports, pilot uniforms, or cockpit content for YouTube/TikTok. His 5 content pillars are:
1. Lifestyle & Finance (NYC life, credit cards, investing)
2. Dog Dad (Bella, NYC dog adventures)
3. Peak Performance (gym, paddle, supplements, optimize life)
4. Entrepreneur/Atlas (CPG brand building, business tips)
5. Pilot Life (subtle lifestyle angle, no uniform content)
Always write in his authentic voice. Short punchy sentences. Real and relatable.`;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function aiGenerate(userPrompt: string, systemOverride?: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: systemOverride || SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : null;
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

export interface DailyIdea {
  hook: string;
  format: string;
  platform: string;
  why_now: string;
  filming_tip: string;
  estimated_reach: "low" | "medium" | "high";
}

export async function generateDailyBrief(pillar: string, pillarDescription: string, date: string): Promise<DailyIdea[]> {
  // Check cache first
  const cacheKey = `cache:brief:${date}`;
  const cached = await kvGet<DailyIdea[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const text = await aiGenerate(
    `Generate 3 specific, actionable content ideas for today (${date}).
Today's pillar: ${pillar} — ${pillarDescription}.
Each idea must be hyper-specific — not generic advice, actual content pieces Garrett can film TODAY with his phone in NYC.
For each idea include:
- hook: the exact scroll-stopping first line (make it specific and punchy)
- format: one of: TikTok, Reel, YouTube Short, Instagram Story, YouTube Long
- platform: one of: TikTok, Instagram, YouTube
- why_now: one sentence on why this works RIGHT NOW (trend, timing, relevance)
- filming_tip: one specific tip for HOW to film this today (location, angle, approach)
- estimated_reach: low/medium/high based on pillar performance patterns

Return ONLY a JSON array, no markdown:
[{"hook":"...","format":"...","platform":"...","why_now":"...","filming_tip":"...","estimated_reach":"low|medium|high"}]`,
    `You are the personal creative director for Garrett Ray (@flywithgarrett), a Boeing 787 pilot, NYC lifestyle creator (806K Instagram, 542K TikTok), Atlas Hydration founder, and SkyWay app builder. His dog is Bella (Weimaraner). Tone: confident, authentic, aspirational, funny, self-aware. NEVER suggest airport, cockpit, or uniform content for TikTok/YouTube. Today is ${date}. Today's content pillar is ${pillar}. Return ONLY valid JSON, no markdown, no explanation.`
  );

  if (!text) return getFallbackIdeas(pillar as Pillar);
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return getFallbackIdeas(pillar as Pillar);
  try {
    const ideas = JSON.parse(match[0]) as DailyIdea[];
    if (ideas.length > 0) {
      await kvSet(cacheKey, ideas);
      return ideas;
    }
    return getFallbackIdeas(pillar as Pillar);
  } catch {
    return getFallbackIdeas(pillar as Pillar);
  }
}

function getFallbackIdeas(pillarKey: Pillar): DailyIdea[] {
  const hooks = PILLAR_HOOKS[pillarKey] || PILLAR_HOOKS.lifestyle;
  return hooks.slice(0, 3).map((hook) => ({
    hook,
    format: "Reel",
    platform: "Instagram",
    why_now: "Evergreen content that consistently performs",
    filming_tip: "Film in natural light, authentic setting",
    estimated_reach: "medium" as const,
  }));
}

export interface TrendInsight {
  trend: string;
  why_it_works: string;
  how_garrett_can_use_it: string;
}

export async function fetchTrendingContent(): Promise<TrendInsight[]> {
  // Cache for 4 hours
  const now = new Date();
  const hourBlock = Math.floor(now.getHours() / 4);
  const cacheKey = `cache:trends:${now.toISOString().split("T")[0]}:${hourBlock}`;
  const cached = await kvGet<TrendInsight[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const client = getClient();
  if (!client) return [];

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
      messages: [{
        role: "user",
        content: `Search for what content is trending right now on TikTok and Instagram in these niches: NYC lifestyle, personal finance for millennials, dog content, health & wellness supplements, entrepreneurship / brand building. What formats, hooks, and topics are getting the most engagement this week? Return 5 specific insights Garrett (@flywithgarrett) can act on TODAY. Format as JSON array with: trend, why_it_works, how_garrett_can_use_it. Return ONLY the JSON array, no markdown.`
      }],
    });

    // Extract text from the response
    const textBlock = msg.content.find((b: any) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : null;
    if (!text) return [];

    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const trends = JSON.parse(match[0]) as TrendInsight[];
    if (trends.length > 0) await kvSet(cacheKey, trends);
    return trends;
  } catch (e) {
    console.error("Trend fetch error:", e);
    return [];
  }
}

export async function generateScript(hook: string, format: string): Promise<string | null> {
  const formatInstructions: Record<string, string> = {
    "TikTok": "Write a 30-60 second TikTok script. Format: Hook (0-3s) → Body (3-45s) → CTA (45-60s). Include timestamps.",
    "Reel": "Write a 30-60 second Instagram Reel script. Format: Hook (0-3s) → Body (3-45s) → CTA (45-60s). Include timestamps.",
    "YouTube Short": "Write a 45-60 second YouTube Short script. Format: Hook → Key insight → CTA. Include timestamps.",
    "YouTube Long": "Write a 90-second YouTube intro. Format: Hook (0-5s) → Tease (5-15s) → Intro (15-60s) → Transition (60-90s).",
    "YouTube": "Write a 90-second YouTube intro. Format: Hook (0-5s) → Tease (5-15s) → Intro (15-60s) → Transition (60-90s).",
    "Instagram Story": "Write a 5-8 frame Instagram Story sequence. Each frame: text overlay + visual description + duration.",
    "Story": "Write a 5-8 frame Instagram Story sequence. Each frame: text overlay + visual description + duration.",
    "Caption": "Write an Instagram caption. Format: Hook line → Story paragraph → CTA → Hashtag block (8-12 relevant hashtags).",
  };
  return aiGenerate(
    `Write a ${format} script for this hook: "${hook}"\n\n${formatInstructions[format] || formatInstructions["Reel"]}\n\nWrite in Garrett's voice. Short punchy sentences. No fluff.`
  );
}

export async function editScript(script: string, instruction: string): Promise<string | null> {
  return aiGenerate(`Edit this script based on the instruction.\n\nCurrent script:\n${script}\n\nInstruction: ${instruction}\n\nReturn ONLY the edited script, nothing else.`);
}

export async function generateAnalysis(contentData: string): Promise<string | null> {
  return aiGenerate(
    `Analyze this content performance data and return a JSON object (no markdown):
{"whatsWorking":[{"insight":"...","evidence":"...","action":"..."}],"whatsNotWorking":[{"insight":"...","evidence":"...","action":"..."}],"contentGaps":[{"pillar":"...","gap":"...","suggestion":"..."}],"weeklyFocus":"...","overallScore":7,"scoreSummary":"..."}
Provide 2-3 items per array. Be specific.\n\nData:\n${contentData}`
  );
}
