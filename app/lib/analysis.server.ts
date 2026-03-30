import Anthropic from "@anthropic-ai/sdk";
import { kvGet, kvSet, kvAddItem } from "./kv.server";
import type { AnalysisResult, TopPost, PlatformStats, Platform } from "./types";
import { generateId } from "./utils";
import { PILLAR_CONFIG } from "./constants";

const SYSTEM_PROMPT = `You are a social media analytics expert for @flywithgarrett (Garrett Ray), a Boeing 787 pilot, Atlas Hydration founder, and NYC-based content creator.

His content pillars are:
1. Lifestyle & Finance — NYC life, credit cards, investing, homeownership tips
2. Dog Dad — Bella (Weimaraner) content, NYC dog adventures
3. Peak Performance — gym, paddle, supplements, recovery, Atlas integration
4. Entrepreneur/Atlas — BTS of building Atlas Hydration, product dev, CPG business
5. Pilot Life — subtle references only, no uniform/airport content on YT/TikTok

Platform roles:
- Instagram = lifestyle, dog dad, finance, travel, day-in-life
- YouTube/TikTok = entrepreneur, Atlas brand, educational content
- No Threads or X

Tone: Authentic, aspirational, approachable. Pilot identity referenced subtly.

Analyze the provided content performance data and return structured insights.`;

export async function generateAnalysis(
  platform: Platform | "all",
  stats: PlatformStats | null,
  topPosts: TopPost[]
): Promise<AnalysisResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  const dataContext = JSON.stringify({
    platform,
    stats,
    topPosts: topPosts.slice(0, 10),
    pillars: Object.entries(PILLAR_CONFIG).map(([k, v]) => ({ key: k, label: v.label })),
  });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this content performance data and return a JSON object (no markdown, just raw JSON) with exactly this structure:
{
  "whatsWorking": [{"insight": "...", "evidence": "...", "action": "..."}],
  "whatsNotWorking": [{"insight": "...", "evidence": "...", "action": "..."}],
  "contentGaps": [{"pillar": "...", "gap": "...", "suggestion": "..."}],
  "topOpportunities": [{"opportunity": "...", "rationale": "...", "priority": "high|medium|low"}],
  "weeklyFocus": "...",
  "overallScore": <number 1-10>,
  "scoreSummary": "..."
}

Provide 2-3 items per array. Be specific with evidence from the data.

Data:
${dataContext}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const result: AnalysisResult = {
      id: generateId(),
      platform,
      createdAt: new Date().toISOString(),
      overallScore: parsed.overallScore || 5,
      scoreSummary: parsed.scoreSummary || "",
      weeklyFocus: parsed.weeklyFocus || "",
      whatsWorking: parsed.whatsWorking || [],
      whatsNotWorking: parsed.whatsNotWorking || [],
      contentGaps: parsed.contentGaps || [],
      topOpportunities: parsed.topOpportunities || [],
    };

    // Save to history
    await kvAddItem(`analysis:${platform}:history`, result);

    return result;
  } catch (e) {
    console.error("Analysis generation error:", e);
    return null;
  }
}

export async function getAnalysisHistory(platform: Platform | "all"): Promise<AnalysisResult[]> {
  return (await kvGet<AnalysisResult[]>(`analysis:${platform}:history`)) ?? [];
}
