import type { Route } from "./+types/api.regenerate-hooks";

export async function loader() {
  return Response.json({ error: "Use POST" }, { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const body = await request.json();
    const pillarLabel = body.pillarLabel || "Lifestyle";
    const pillarDescription = body.pillarDescription || "";

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ hooks: [
        `New ${pillarLabel} hook idea — trending format`,
        `What nobody tells you about ${pillarLabel.toLowerCase()}`,
        `The honest truth about my ${pillarLabel.toLowerCase()} journey`,
        `3 things I learned this week about ${pillarLabel.toLowerCase()}`,
        `POV: your ${pillarLabel.toLowerCase()} routine is wrong`,
        `I stopped doing this and everything changed`,
        `Unpopular opinion about ${pillarLabel.toLowerCase()}`,
      ], mock: true });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: `You are a content strategist for @flywithgarrett, a Boeing 787 pilot, NYC lifestyle creator with 806K Instagram, Atlas Hydration founder. Write scroll-stopping hooks in his voice: confident, authentic, funny, self-aware. Short punchy sentences.`,
      messages: [{
        role: "user",
        content: `Generate exactly 7 new, fresh content hooks for the "${pillarLabel}" pillar (${pillarDescription}). Each hook should be a scroll-stopping first line for a TikTok/Reel. Make them specific, trendy, and authentic to Garrett's voice. Return ONLY a JSON array of 7 strings, no markdown: ["hook1","hook2",...]`
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const hooks = JSON.parse(match[0]) as string[];
      return Response.json({ hooks: hooks.slice(0, 7) });
    }
    return Response.json({ hooks: [], error: "Failed to parse AI response" }, { status: 500 });
  } catch (e: any) {
    console.error("Regenerate hooks error:", e);
    return Response.json({ hooks: [], error: e.message || "Server error" }, { status: 500 });
  }
}
