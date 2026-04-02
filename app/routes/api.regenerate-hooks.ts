import type { Route } from "./+types/api.regenerate-hooks";

const PILLARS: Record<string, { name: string; description: string; audience: string }> = {
  lifestyle: { name: "Lifestyle & Finance", description: "NYC life, credit cards, investing, homeownership, money tips", audience: "millennials interested in money and NYC lifestyle" },
  dogdad: { name: "Dog Dad", description: "Bella the Weimaraner, NYC dog adventures, Dog Dad Diaries", audience: "dog owners, NYC lifestyle followers" },
  performance: { name: "Peak Performance", description: "gym, paddle tennis, supplements, recovery, optimize life", audience: "health-conscious men 25-35" },
  entrepreneur: { name: "Entrepreneur / Atlas", description: "building Atlas Hydration CPG brand, business tips, founder life", audience: "aspiring entrepreneurs, business-minded followers" },
  pilot: { name: "Pilot Life", description: "airline pilot lifestyle, subtle pilot references, no uniforms", audience: "aviation fans, career-curious followers" },
};

export async function loader() {
  return Response.json({ error: "Use POST" }, { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  const { pillarId } = await request.json();
  const pillar = PILLARS[pillarId];

  if (!pillar) {
    return Response.json({ error: "Unknown pillar" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({
      hooks: [
        `The truth about ${pillar.name.toLowerCase()} that nobody talks about`,
        `What I wish I knew about ${pillar.name.toLowerCase()} at 25`,
        `A day in my life focused on ${pillar.name.toLowerCase()}`,
        `The ${pillar.name.toLowerCase()} mistake I made so you don't have to`,
        `How I approach ${pillar.name.toLowerCase()} differently than everyone else`,
        `What ${pillar.name.toLowerCase()} actually looks like behind the scenes`,
        `The ${pillar.name.toLowerCase()} system that changed everything for me`,
      ],
    });
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Generate 7 scroll-stopping TikTok/Instagram Reel hooks for @flywithgarrett.

Creator context: Garrett Ray, Boeing 787 pilot, NYC-based, 806K Instagram, 542K TikTok. Founder of Atlas Hydration (electrolyte brand). Building SkyWay (flight tracking app). Dog dad (Bella, Weimaraner). Tone: confident, authentic, funny, self-aware, aspirational.

Content pillar: ${pillar.name}
Pillar description: ${pillar.description}
Target audience: ${pillar.audience}

Rules:
- Each hook must be under 15 words
- Must make someone stop scrolling immediately
- Must feel like something Garrett would actually say
- Be specific to his life (pilot, NYC, Atlas, Bella, 30s)
- NO generic advice hooks

Return ONLY a JSON array of 7 strings. No markdown. No explanation.
Example: ["hook one", "hook two", "hook three"]`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const hooks = JSON.parse(match[0]);
      if (Array.isArray(hooks)) return Response.json({ hooks: hooks.slice(0, 7) });
    }
    return Response.json({ error: "Failed to parse response" }, { status: 500 });
  } catch (err: any) {
    console.error("Anthropic error:", err);
    return Response.json({ error: "Generation failed: " + (err.message || "unknown") }, { status: 500 });
  }
}
