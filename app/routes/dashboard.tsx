import { useState } from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import { Camera, Play, Music2, Plus, Droplets, Smartphone, ChevronDown, ChevronUp, Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { getConnectionStatus } from "~/lib/analytics.server";
import { generateDailyIdeas } from "~/lib/ai.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG, MANAGER_DIRECTIVES } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import type { ContentItem, AnalyticsSnapshot, Idea, AtlasMetric } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export function meta() { return [{ title: "Command Center — FlyWithGarrett" }]; }

export async function loader() {
  const [contentItems, snapshots, connections, atlasMetrics, dailyIdeas] = await Promise.all([
    kvGet<ContentItem[]>("content:items"),
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    getConnectionStatus(),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<{ ideas: { hook: string; format: string; platform: string; score: number }[]; date: string; pillar: string }>("daily:ideas"),
  ]);

  const todayDow = new Date().getDay();
  const todayCadence = WEEKLY_CADENCE[todayDow];
  const today = new Date().toISOString().split("T")[0];
  const todayContent = (contentItems ?? []).filter((i) => i.scheduledAt?.startsWith(today));

  const platformStats = (["instagram", "youtube", "tiktok"] as const).map((p) => {
    const latest = (snapshots ?? []).filter((s) => s.platform === p).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return { platform: p, followers: latest?.followers ?? 0, connected: connections[p], label: PLATFORM_CONFIG[p].label, color: PLATFORM_CONFIG[p].color };
  });

  const latestAtlas = (atlasMetrics ?? []).sort((a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime())[0] ?? null;

  return { todayCadence, todayContent, platformStats, latestAtlas, dailyIdeas: dailyIdeas?.date === today ? dailyIdeas : null };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate-daily") {
    const pillar = formData.get("pillar") as string;
    const desc = formData.get("description") as string;
    const ideas = await generateDailyIdeas(pillar, desc);
    const today = new Date().toISOString().split("T")[0];
    await kvSet("daily:ideas", { ideas, date: today, pillar });
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

export default function Dashboard() {
  const { todayCadence, todayContent, platformStats, latestAtlas, dailyIdeas } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [directivesOpen, setDirectivesOpen] = useState(false);
  const pillarConfig = PILLAR_CONFIG[todayCadence.pillar];
  const isGenerating = fetcher.state !== "idle";

  return (
    <div className="space-y-10">
      {/* Date + Focus */}
      <div>
        <p className="text-title">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pillarConfig.color }} />
          <p className="text-[14px] font-medium" style={{ color: pillarConfig.color }}>{todayCadence.label}</p>
        </div>
      </div>

      {/* Today's Content Brief */}
      <div className="card-static p-6" style={{ borderLeft: `2px solid ${pillarConfig.color}` }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: pillarConfig.color }} />
            <p className="text-[15px] font-medium text-white">Today's Content Brief</p>
          </div>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="generate-daily" />
            <input type="hidden" name="pillar" value={todayCadence.label} />
            <input type="hidden" name="description" value={pillarConfig.description} />
            <button type="submit" disabled={isGenerating} className="btn-ghost flex items-center gap-1.5 text-[12px]">
              <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "Generating..." : dailyIdeas ? "Regenerate" : "Generate Ideas"}
            </button>
          </fetcher.Form>
        </div>

        {!dailyIdeas ? (
          <div className="text-center py-10">
            <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: `${pillarConfig.color}30` }} />
            <p className="text-[14px] text-white mb-1">No ideas generated yet for today</p>
            <p className="text-micro">Click "Generate Ideas" to get 3 AI-powered content ideas for {todayCadence.label}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyIdeas.ideas.map((idea, i) => (
              <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-[12px] bg-[rgba(255,255,255,0.03)]">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-white leading-snug">"{idea.hook}"</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="pill">{idea.format}</span>
                    <span className="pill">{idea.platform}</span>
                    <span className="text-micro">Score: {idea.score}/100</span>
                  </div>
                </div>
                <Form method="post">
                  <input type="hidden" name="intent" value="use-idea" />
                  <input type="hidden" name="hook" value={idea.hook} />
                  <input type="hidden" name="pillar" value={todayCadence.pillar} />
                  <button type="submit" className="btn-ghost text-[11px] flex items-center gap-1 shrink-0">
                    Use This <ArrowRight className="w-3 h-3" />
                  </button>
                </Form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Health */}
      <div>
        <p className="text-section mb-4">Platform Health</p>
        <div className="grid grid-cols-3 gap-3">
          {platformStats.map((p) => {
            const Icon = platformIcons[p.platform];
            return (
              <div key={p.platform} className="card-static p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" style={{ color: p.color }} />}
                    <span className="text-[13px] text-[#ffffff60]">{p.label}</span>
                  </div>
                  {p.connected ? (
                    <span className="text-[10px] text-[#30d158] bg-[#30d15815] px-2 py-0.5 rounded-full">Connected</span>
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
          <div className="card-static p-5">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-[#30d158]" />
              <span className="text-[14px] font-medium text-white">Atlas Hydration</span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#ffffff50]">Status</span><span className="text-[#30d158]">Active</span></div>
              <div className="flex justify-between"><span className="text-[#ffffff50]">Products</span><span className="text-white">4 Flavors</span></div>
              {latestAtlas && <div className="flex justify-between"><span className="text-[#ffffff50]">Revenue</span><span className="text-white">${latestAtlas.revenue.toLocaleString()}</span></div>}
            </div>
          </div>
          <div className="card-static p-5">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-[#64d2ff]" />
              <span className="text-[14px] font-medium text-white">SkyWay</span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#ffffff50]">Status</span><span className="text-[#0a84ff]">In Dev</span></div>
              <div className="flex justify-between"><span className="text-[#ffffff50]">Phase</span><span className="text-white">MVP Build</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Manager Directives */}
      <div className="card-static overflow-hidden">
        <button onClick={() => setDirectivesOpen(!directivesOpen)} className="w-full flex items-center justify-between p-5 text-left">
          <span className="text-[14px] font-medium text-white">Manager Directives</span>
          {directivesOpen ? <ChevronUp className="w-4 h-4 text-[#ffffff30]" /> : <ChevronDown className="w-4 h-4 text-[#ffffff30]" />}
        </button>
        {directivesOpen && (
          <div className="px-5 pb-5 space-y-2.5">
            {MANAGER_DIRECTIVES.map((d, i) => (
              <label key={i} className="flex items-start gap-3 text-[13px] cursor-pointer group">
                <input type="checkbox" className="mt-0.5 rounded border-[rgba(255,255,255,0.2)] bg-transparent" />
                <span className="text-[#ffffffaa] group-hover:text-white transition-colors">{d}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
