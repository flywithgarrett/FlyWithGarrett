import { useState } from "react";
import { useLoaderData, Form, useFetcher, Link } from "react-router";
import { Camera, Play, Music2, Droplets, Smartphone, ChevronDown, ChevronUp, Sparkles, RefreshCw, ArrowRight, TrendingUp, Target, Dumbbell, Plane, Calendar } from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { getConnectionStatus } from "~/lib/analytics.server";
import { generateDailyBrief, generateMorningBriefing, fetchTrendingContent } from "~/lib/ai.server";
import type { DailyIdea, TrendInsight, DailyBriefing } from "~/lib/ai.server";
import { getNYCWeather } from "~/lib/weather.server";
import { fetchTodayEvents, isGoogleCalendarConnected } from "~/lib/google-calendar.server";
import type { CalendarEvent } from "~/lib/google-calendar.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG, MANAGER_DIRECTIVES } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import type { Idea, AnalyticsSnapshot, AtlasMetric } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export function meta() { return [{ title: "Daily Brief — FlyWithGarrett Life OS" }]; }

export async function loader() {
  const today = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();
  const todayCadence = WEEKLY_CADENCE[todayDow];
  const pillarConfig = PILLAR_CONFIG[todayCadence.pillar];

  const [snapshots, connections, atlasMetrics, weather, gcalConnected, pilotSchedule, fitnessToday] = await Promise.all([
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    getConnectionStatus(),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    getNYCWeather(),
    isGoogleCalendarConnected(),
    kvGet<{ type: string; details: string } | null>(`pilot:${today}`),
    kvGet<{ name: string; duration: string; muscles: string } | null>("fitness:today"),
  ]);

  // Fetch calendar events if connected
  let calendarEvents: CalendarEvent[] = [];
  if (gcalConnected) { try { calendarEvents = await fetchTodayEvents(); } catch {} }

  // Auto-generate daily content brief
  let dailyIdeas: DailyIdea[] = [];
  try { dailyIdeas = await generateDailyBrief(todayCadence.label, pillarConfig.description, today); } catch {}

  // Auto-generate morning AI briefing
  let morningBriefing: DailyBriefing | null = null;
  try {
    morningBriefing = await generateMorningBriefing({
      date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      pillar: todayCadence.label,
      pilotStatus: pilotSchedule?.type || "Day off",
      calendarEvents: calendarEvents.map((e) => `${e.title} at ${e.start}`).join(", ") || "No events",
      workout: fitnessToday?.name || "Check fitness plan",
      atlasStatus: atlasMetrics?.length ? `Revenue: $${atlasMetrics[0].revenue}` : "Active",
      skywayStatus: "MVP Build phase",
    });
  } catch {}

  // Trends
  let trends: TrendInsight[] = [];
  try { trends = await fetchTrendingContent(); } catch {}

  const platformStats = (["instagram", "youtube", "tiktok"] as const).map((p) => {
    const latest = (snapshots ?? []).filter((s) => s.platform === p).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return { platform: p, followers: latest?.followers ?? 0, connected: connections[p], label: PLATFORM_CONFIG[p].label, color: PLATFORM_CONFIG[p].color };
  });

  const latestAtlas = (atlasMetrics ?? []).sort((a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime())[0] ?? null;

  return {
    todayCadence, pillarConfig: { color: pillarConfig.color, description: pillarConfig.description },
    platformStats, latestAtlas, dailyIdeas, morningBriefing, trends, weather, calendarEvents, gcalConnected,
    pilotStatus: pilotSchedule?.type || "Off today", fitnessToday, hasApiKey: !!process.env.ANTHROPIC_API_KEY,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "regenerate-brief") {
    const today = new Date().toISOString().split("T")[0];
    await kvSet(`cache:brief:${today}`, null);
    await kvSet(`cache:morning:${today}`, null);
    return { ok: true };
  }
  if (intent === "use-idea") {
    await kvAddItem("ideas:bank", {
      id: generateId(), title: formData.get("hook") as string,
      pillar: formData.get("pillar") as Idea["pillar"],
      hookDraft: formData.get("hook") as string, notes: "", status: "raw",
      createdAt: new Date().toISOString(),
    } satisfies Idea);
    return { saved: true };
  }
  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };
const reachColors: Record<string, string> = { high: "#34c759", medium: "#ff9500", low: "#aeaeb2" };
const catColors: Record<string, string> = { personal: "#007aff", flying: "#5ac8fa", content: "#ff9f0a", business: "#af52de", fitness: "#34c759" };

export default function DailyBrief() {
  const d = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [directivesOpen, setDirectivesOpen] = useState(false);
  const isRegenerating = fetcher.state !== "idle";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Greeting + Weather */}
      <div>
        <p className="text-title">{greeting}, Garrett.</p>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[14px] text-[#86868b]">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <span className="text-[14px] text-[#86868b]">·</span>
          <p className="text-[14px] text-[#86868b]">{d.weather.icon} {d.weather.temperature}°F in NYC · {d.weather.description}</p>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium"
            style={{ backgroundColor: d.pillarConfig.color + "15", color: d.pillarConfig.color }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: d.pillarConfig.color }} />
            {d.todayCadence.label}
          </span>
        </div>
      </div>

      {/* AI Morning Briefing */}
      {d.morningBriefing && (
        <div className="card-static !bg-gradient-to-r from-[#f5f5f7] to-[#eef2ff]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-[#007aff]" />
            <p className="text-[13px] font-semibold text-[#007aff] uppercase tracking-wider">Today at a Glance</p>
          </div>
          <p className="text-[15px] text-[#1d1d1f] leading-relaxed">{d.morningBriefing.summary}</p>
          <div className="mt-4 p-3 rounded-[12px] bg-white/60">
            <p className="text-[11px] font-semibold text-[#ff9500] uppercase tracking-wider mb-1">Priority</p>
            <p className="text-[14px] font-medium text-[#1d1d1f]">{d.morningBriefing.priority}</p>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#007aff]" />
            <p className="text-[14px] font-medium text-[#1d1d1f]">Today's Schedule</p>
          </div>
          {!d.gcalConnected && <a href="/auth/google-calendar" className="text-[12px] text-[#007aff]">Connect Google Calendar</a>}
        </div>
        {d.calendarEvents.length === 0 ? (
          <p className="text-[13px] text-[#86868b] py-2">No meetings today — full creative day</p>
        ) : (
          <div className="space-y-1.5">
            {d.calendarEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: catColors[e.category] || "#007aff" }} />
                <div>
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{e.title}</p>
                  <p className="text-[11px] text-[#86868b]">{e.allDay ? "All day" : new Date(e.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Mission */}
      <div className="card-static" style={{ borderLeft: `3px solid ${d.pillarConfig.color}`, background: `linear-gradient(135deg, #f5f5f7 0%, ${d.pillarConfig.color}08 100%)` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: d.pillarConfig.color }} />
            <p className="text-[15px] font-medium text-[#1d1d1f]">Content Mission</p>
          </div>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="regenerate-brief" />
            <button type="submit" disabled={isRegenerating} className="btn-ghost text-[12px] flex items-center gap-1.5">
              <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} /> Regenerate
            </button>
          </fetcher.Form>
        </div>
        {!d.hasApiKey && <div className="mb-3 p-2.5 rounded-[10px] bg-[#fff3cd]"><p className="text-[11px] text-[#856404]">Add ANTHROPIC_API_KEY in Vercel for AI ideas</p></div>}
        <div className="space-y-2.5">
          {d.dailyIdeas.map((idea, i) => (
            <div key={i} className="p-4 rounded-[14px] bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#1d1d1f] leading-snug">"{idea.hook}"</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="pill text-[10px]">{idea.format}</span>
                    <span className="pill text-[10px]">{idea.platform}</span>
                    <span className="flex items-center gap-1"><span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: reachColors[idea.estimated_reach] }} /><span className="text-[10px] text-[#86868b]">{idea.estimated_reach}</span></span>
                  </div>
                  <p className="text-[12px] italic text-[#86868b] mt-1.5">{idea.why_now}</p>
                  <p className="text-[12px] mt-1" style={{ color: d.pillarConfig.color }}>{idea.filming_tip}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link to={`/studio`} className="btn-ghost text-[11px] py-1 px-3">Write Script <ArrowRight className="w-3 h-3 inline ml-0.5" /></Link>
                  <Form method="post"><input type="hidden" name="intent" value="use-idea" /><input type="hidden" name="hook" value={idea.hook} /><input type="hidden" name="pillar" value={d.todayCadence.pillar} /><button type="submit" className="btn-ghost text-[11px] py-1 px-3 w-full">Save Idea</button></Form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pilot + Fitness Row */}
      <div className="grid md:grid-cols-2 gap-3">
        <Link to="/pilot" className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-[#5ac8fa15] flex items-center justify-center"><Plane className="w-5 h-5 text-[#5ac8fa]" /></div>
          <div><p className="text-[14px] font-medium text-[#1d1d1f]">Pilot Status</p><p className="text-[12px] text-[#86868b]">{d.pilotStatus}</p></div>
        </Link>
        <Link to="/fitness" className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-[#34c75915] flex items-center justify-center"><Dumbbell className="w-5 h-5 text-[#34c759]" /></div>
          <div><p className="text-[14px] font-medium text-[#1d1d1f]">Today's Workout</p><p className="text-[12px] text-[#86868b]">{d.fitnessToday?.name || "Check fitness plan"}</p></div>
        </Link>
      </div>

      {/* Trending */}
      {d.trends.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-[#007aff]" /><p className="text-section">What's Working Right Now</p></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {d.trends.map((t, i) => (
              <div key={i} className="card-static min-w-[280px] max-w-[320px] shrink-0">
                <p className="text-[13px] font-medium text-[#1d1d1f]">{t.trend}</p>
                <p className="text-[11px] text-[#86868b] mt-1.5">{t.why_it_works}</p>
                <p className="text-[12px] mt-1.5 text-[#007aff]">{t.how_garrett_can_use_it}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Pulse */}
      <div>
        <p className="text-section mb-3">Business Pulse</p>
        <div className="grid grid-cols-3 gap-3">
          {d.platformStats.map((p) => {
            const Icon = platformIcons[p.platform];
            return (
              <div key={p.platform} className="card-static">
                <div className="flex items-center gap-2 mb-3">
                  {Icon && <Icon className="w-3.5 h-3.5" style={{ color: p.color }} />}
                  <span className="text-[12px] text-[#86868b]">{p.label}</span>
                </div>
                <p className="text-stat-sm">{formatNumber(p.followers)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Projects */}
      <div className="grid md:grid-cols-2 gap-3">
        <Link to="/atlas" className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-[#34c75915] flex items-center justify-center"><Droplets className="w-5 h-5 text-[#34c759]" /></div>
          <div className="flex-1"><p className="text-[14px] font-medium text-[#1d1d1f]">Atlas Hydration</p><p className="text-[12px] text-[#86868b]">Active · 4 flavors{d.latestAtlas ? ` · $${d.latestAtlas.revenue.toLocaleString()}` : ""}</p></div>
          <div className="w-2 h-2 rounded-full bg-[#34c759]" />
        </Link>
        <Link to="/skyway" className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-[#007aff15] flex items-center justify-center"><Smartphone className="w-5 h-5 text-[#007aff]" /></div>
          <div className="flex-1"><p className="text-[14px] font-medium text-[#1d1d1f]">SkyWay</p><p className="text-[12px] text-[#86868b]">MVP Build · Flight tracker</p></div>
          <div className="w-2 h-2 rounded-full bg-[#007aff]" />
        </Link>
      </div>

      {/* AI Priority */}
      {d.morningBriefing && (
        <div className="card-static !bg-[#1d1d1f] text-white">
          <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-[#ff9f0a]" /><p className="text-[11px] font-semibold text-[#ff9f0a] uppercase tracking-wider">Today's #1 Priority</p></div>
          <p className="text-[15px] font-medium leading-relaxed">{d.morningBriefing.priority}</p>
        </div>
      )}

      {/* Manager Directives */}
      <div className="card-static overflow-hidden !p-0">
        <button onClick={() => setDirectivesOpen(!directivesOpen)} className="w-full flex items-center justify-between p-5 text-left">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Manager Directives</span>
          {directivesOpen ? <ChevronUp className="w-4 h-4 text-[#aeaeb2]" /> : <ChevronDown className="w-4 h-4 text-[#aeaeb2]" />}
        </button>
        {directivesOpen && (
          <div className="px-5 pb-5 space-y-0.5">
            {MANAGER_DIRECTIVES.map((d, i) => (
              <label key={i} className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[rgba(0,0,0,0.15)] accent-[#007aff]" />
                <span className="text-[13px] text-[#3a3a3c]">{d}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
