import { useState } from "react";
import { useLoaderData, Form, useFetcher, Link } from "react-router";
import { Camera, Play, Music2, Droplets, Smartphone, ChevronDown, ChevronUp, Sparkles, RefreshCw, ArrowRight, Zap, TrendingUp } from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { getConnectionStatus } from "~/lib/analytics.server";
import { generateDailyBrief, fetchTrendingContent } from "~/lib/ai.server";
import type { DailyIdea, TrendInsight } from "~/lib/ai.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG, MANAGER_DIRECTIVES } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import type { ContentItem, AnalyticsSnapshot, Idea, AtlasMetric } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export function meta() { return [{ title: "Command Center — FlyWithGarrett" }]; }

export async function loader() {
  const today = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();
  const todayCadence = WEEKLY_CADENCE[todayDow];
  const pillarConfig = PILLAR_CONFIG[todayCadence.pillar];

  const [contentItems, snapshots, connections, atlasMetrics] = await Promise.all([
    kvGet<ContentItem[]>("content:items"),
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    getConnectionStatus(),
    kvGet<AtlasMetric[]>("atlas:metrics"),
  ]);

  // Auto-generate daily brief (cached for 24hrs by key)
  let dailyIdeas: DailyIdea[] = [];
  try {
    dailyIdeas = await generateDailyBrief(todayCadence.label, pillarConfig.description, today);
  } catch { /* fallback handled inside generateDailyBrief */ }

  // Fetch trends (cached for 4hrs)
  let trends: TrendInsight[] = [];
  try {
    trends = await fetchTrendingContent();
  } catch { /* non-critical */ }

  const todayContent = (contentItems ?? []).filter((i) => i.scheduledAt?.startsWith(today));

  const platformStats = (["instagram", "youtube", "tiktok"] as const).map((p) => {
    const latest = (snapshots ?? []).filter((s) => s.platform === p).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return { platform: p, followers: latest?.followers ?? 0, connected: connections[p], label: PLATFORM_CONFIG[p].label, color: PLATFORM_CONFIG[p].color };
  });

  const latestAtlas = (atlasMetrics ?? []).sort((a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime())[0] ?? null;
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  return { todayCadence, pillarConfig: { color: pillarConfig.color, description: pillarConfig.description }, todayContent, platformStats, latestAtlas, dailyIdeas, trends, hasApiKey };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "regenerate-brief") {
    const today = new Date().toISOString().split("T")[0];
    // Clear cache to force regeneration
    await kvSet(`cache:brief:${today}`, null);
    const pillar = formData.get("pillar") as string;
    const desc = formData.get("description") as string;
    await generateDailyBrief(pillar, desc, today);
    return { ok: true };
  }
  if (intent === "use-idea") {
    const idea: Idea = {
      id: generateId(), title: formData.get("hook") as string,
      pillar: formData.get("pillar") as Idea["pillar"],
      hookDraft: formData.get("hook") as string, notes: "", status: "raw",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("ideas:bank", idea);
    return { saved: true };
  }
  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };
const reachColors: Record<string, string> = { high: "#30d158", medium: "#ffd60a", low: "#aeaeb2" };

export default function Dashboard() {
  const { todayCadence, pillarConfig, todayContent, platformStats, latestAtlas, dailyIdeas, trends, hasApiKey } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [directivesOpen, setDirectivesOpen] = useState(false);
  const isRegenerating = fetcher.state !== "idle";

  return (
    <div className="space-y-10">
      {/* Date + Pillar */}
      <div>
        <p className="text-title">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <div className="mt-3">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium"
            style={{ backgroundColor: pillarConfig.color + "20", color: pillarConfig.color }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: pillarConfig.color }} />
            {todayCadence.label}
          </span>
        </div>
      </div>

      {/* Today's Content Brief — HERO CARD */}
      <div className="card-static" style={{ borderLeft: `3px solid ${pillarConfig.color}`, background: `linear-gradient(135deg, #f5f5f7 0%, ${pillarConfig.color}08 100%)` }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: pillarConfig.color }} />
            <p className="text-[16px] font-medium text-[#1d1d1f]">Today's Content Brief</p>
          </div>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="regenerate-brief" />
            <input type="hidden" name="pillar" value={todayCadence.label} />
            <input type="hidden" name="description" value={pillarConfig.description} />
            <button type="submit" disabled={isRegenerating} className="btn-ghost flex items-center gap-1.5 text-[12px]">
              <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? "Generating..." : "Regenerate"}
            </button>
          </fetcher.Form>
        </div>

        {!hasApiKey && (
          <div className="mb-4 p-3 rounded-[12px] bg-[rgba(255,214,10,0.08)]">
            <p className="text-[12px] text-[#ffd60a]">Add your ANTHROPIC_API_KEY in Vercel to get AI-generated ideas</p>
          </div>
        )}

        <div className="space-y-3">
          {dailyIdeas.map((idea, i) => (
            <div key={i} className="p-4 rounded-[16px] bg-[rgba(0,0,0,0.03)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[#1d1d1f] leading-snug">"{idea.hook}"</p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="pill">{idea.format}</span>
                    <span className="pill">{idea.platform}</span>
                    <span className="flex items-center gap-1">
                      <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: reachColors[idea.estimated_reach] || reachColors.medium }} />
                      <span className="text-micro">{idea.estimated_reach} reach</span>
                    </span>
                  </div>
                  <p className="text-[13px] italic text-[#86868b] mt-2">{idea.why_now}</p>
                  <p className="text-[13px] mt-1" style={{ color: pillarConfig.color }}>{idea.filming_tip}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link to={`/studio?hook=${encodeURIComponent(idea.hook)}`} className="btn-ghost text-[11px] py-1 px-3 flex items-center gap-1">
                    Write Script <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Form method="post">
                    <input type="hidden" name="intent" value="use-idea" />
                    <input type="hidden" name="hook" value={idea.hook} />
                    <input type="hidden" name="pillar" value={todayCadence.pillar} />
                    <button type="submit" className="btn-ghost text-[11px] py-1 px-3 w-full">Add to Calendar</button>
                  </Form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Content Research */}
      {trends.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#0a84ff]" />
            <p className="text-section" style={{ color: "#86868b" }}>What's Working Right Now</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {trends.map((t, i) => (
              <div key={i} className="card-static min-w-[300px] max-w-[340px] shrink-0">
                <p className="text-[14px] font-medium text-[#1d1d1f] leading-snug">{t.trend}</p>
                <p className="text-[12px] text-[#86868b] mt-2">{t.why_it_works}</p>
                <p className="text-[13px] mt-2 text-[#0a84ff]">{t.how_garrett_can_use_it}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Health */}
      <div>
        <p className="text-section mb-4">Platform Health</p>
        <div className="grid grid-cols-3 gap-3">
          {platformStats.map((p) => {
            const Icon = platformIcons[p.platform];
            return (
              <div key={p.platform} className="card-static">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" style={{ color: p.color }} />}
                    <span className="text-[13px] text-[#86868b]">{p.label}</span>
                  </div>
                  {p.connected ? (
                    <span className="text-[10px] text-[#30d158] bg-[rgba(48,209,88,0.12)] px-2 py-0.5 rounded-full">Connected</span>
                  ) : (
                    <a href={`/auth/${p.platform}`} className="text-[11px] text-[#0a84ff]">Connect</a>
                  )}
                </div>
                <p className="text-stat">{formatNumber(p.followers)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Projects */}
      <div>
        <p className="text-section mb-4">Current Projects</p>
        <div className="grid md:grid-cols-2 gap-3">
          <Link to="/business" className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-[12px] bg-[rgba(48,209,88,0.12)] flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5 text-[#30d158]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#1d1d1f]">Atlas Hydration</p>
              <p className="text-[12px] text-[#86868b]">4 Flavors • Active{latestAtlas ? ` • $${latestAtlas.revenue.toLocaleString()} rev` : ""}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#30d158]" />
          </Link>
          <Link to="/business" className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-[12px] bg-[rgba(100,210,255,0.12)] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#64d2ff]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#1d1d1f]">SkyWay</p>
              <p className="text-[12px] text-[#86868b]">Flight tracking app • MVP Build</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#0a84ff]" />
          </Link>
        </div>
      </div>

      {/* Manager Directives */}
      <div className="card-static overflow-hidden !p-0">
        <button onClick={() => setDirectivesOpen(!directivesOpen)} className="w-full flex items-center justify-between p-5 text-left">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Manager Directives</span>
          {directivesOpen ? <ChevronUp className="w-4 h-4 text-[#aeaeb2]" /> : <ChevronDown className="w-4 h-4 text-[#aeaeb2]" />}
        </button>
        {directivesOpen && (
          <div className="px-5 pb-5 space-y-1">
            {MANAGER_DIRECTIVES.map((d, i) => (
              <label key={i} className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.06)] last:border-0 cursor-pointer group">
                <div className="w-5 h-5 rounded-[6px] border border-[rgba(0,0,0,0.12)] group-hover:border-[rgba(0,0,0,0.2)] flex items-center justify-center shrink-0 transition-colors">
                  <input type="checkbox" className="sr-only peer" />
                </div>
                <span className="text-[13px] text-[#86868b] group-hover:text-[#1d1d1f] transition-colors">{d}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
