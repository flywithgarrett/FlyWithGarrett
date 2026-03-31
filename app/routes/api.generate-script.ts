import type { Route } from "./+types/api.generate-script";

const MOCK_SCRIPT = `HOOK (0-3 sec):
"Stop scrolling — this is the one thing nobody tells you about this."

BODY (3-45 sec):
So here's the deal.
Most people think [topic] is all about [common misconception].
But after doing this for years, I can tell you — it's actually about [real insight].
Let me break it down.
[Point 1 — punchy, specific]
[Point 2 — personal story/example]
[Point 3 — the "aha" moment]
That's the difference between people who get it and people who don't.

CTA (last 5 sec):
Follow for more real talk. Drop a 🔥 if this hit different.

CAPTION:
The truth nobody talks about 👀 This changed everything for me. Save this for later.

HASHTAGS:
#flywithgarrett #nyc #nyclife #realtalk #lifestyle #motivation #tips #fyp #viral #creator`;

export async function action({ request }: Route.ActionArgs) {
  try {
    const { hook, pillar } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      // Return mock script when no API key
      const mockFilled = MOCK_SCRIPT.replace("[topic]", pillar || "this")
        .replace("[common misconception]", "what you see on social media")
        .replace("[real insight]", "consistency and authenticity")
        .replace("[Point 1 — punchy, specific]", `First — ${hook.split(" ").slice(0, 5).join(" ")}... that's the hook.`)
        .replace("[Point 2 — personal story/example]", "I learned this the hard way living in NYC.")
        .replace("[Point 3 — the \"aha\" moment]", "Once you see it, you can't unsee it.");
      return Response.json({ script: mockFilled, mock: true });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are the personal scriptwriter for Garrett Ray (@flywithgarrett), a Boeing 787 pilot, NYC lifestyle creator with 806K Instagram and 542K TikTok, Atlas Hydration founder. Tone: confident, authentic, funny, self-aware. Write punchy short sentences. Never mention airports or uniforms for social content.`,
      messages: [{
        role: "user",
        content: `Write a TikTok/Reel script for this hook: "${hook}"
Content pillar: ${pillar}

Format the script as:
HOOK (0-3 sec): [exact words to say]
BODY (3-45 sec): [beat by beat breakdown]
CTA (last 5 sec): [call to action]

Also include:
CAPTION: [Instagram/TikTok caption with emojis]
HASHTAGS: [10 relevant hashtags]`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return Response.json({ script: text });
  } catch (e: any) {
    console.error("Script generation error:", e);
    return Response.json({ script: null, error: e.message || "Failed to generate script" }, { status: 500 });
  }
}
