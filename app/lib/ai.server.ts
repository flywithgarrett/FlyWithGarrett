import Anthropic from "@anthropic-ai/sdk";

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

export async function aiGenerate(userPrompt: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    return msg.content[0].type === "text" ? msg.content[0].text : null;
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

export async function generateDailyIdeas(pillar: string, pillarDescription: string): Promise<{ hook: string; format: string; platform: string; score: number }[]> {
  const text = await aiGenerate(
    `Generate exactly 3 content ideas for today. Today's pillar: "${pillar}" — ${pillarDescription}.
Return ONLY a JSON array (no markdown): [{"hook":"scroll-stopping first line","format":"Reel|TikTok|Story|YouTube","platform":"Instagram|TikTok|YouTube","score":85}]
Make hooks punchy, specific, and authentic to Garrett's voice. Score 1-100 based on likely performance.`
  );
  if (!text) return [];
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}

export async function generateScript(hook: string, format: string): Promise<string | null> {
  const formatInstructions: Record<string, string> = {
    "TikTok": "Write a 30-60 second TikTok script. Format: Hook (0-3s) → Body (3-45s) → CTA (45-60s). Include timestamps.",
    "Reel": "Write a 30-60 second Instagram Reel script. Format: Hook (0-3s) → Body (3-45s) → CTA (45-60s). Include timestamps.",
    "YouTube": "Write a 90-second YouTube intro. Format: Hook (0-5s) → Tease (5-15s) → Intro (15-60s) → Transition (60-90s).",
    "Story": "Write a 5-8 frame Instagram Story sequence. Each frame: text overlay + visual description + duration.",
    "Caption": 'Write an Instagram caption. Format: Hook line → Story paragraph → CTA → Hashtag block (8-12 relevant hashtags).',
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

export async function generateWeeklyPlan(): Promise<{ day: string; pillar: string; hook: string; format: string; platform: string }[]> {
  const text = await aiGenerate(
    `Generate a 7-day content plan for this week. Follow the cadence: Mon=Lifestyle & Finance, Tue=Dog Dad, Wed=Peak Performance, Thu=Entrepreneur/Atlas, Fri=Pilot Life, Sat=YouTube Long-form, Sun=Atlas BTS.
Return ONLY a JSON array: [{"day":"Monday","pillar":"lifestyle","hook":"...","format":"Reel|TikTok|YouTube","platform":"Instagram|TikTok|YouTube"}]`
  );
  if (!text) return [];
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}
