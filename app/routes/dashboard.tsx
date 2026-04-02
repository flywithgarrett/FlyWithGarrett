import { useState } from "react";
import { useLoaderData, Form, useFetcher, Link } from "react-router";
import { Camera, Play, Music2, Droplets, Smartphone, Sparkles, RefreshCw, ArrowRight, TrendingUp, Dumbbell, Plane, Calendar, Check } from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { getConnectionStatus } from "~/lib/analytics.server";
import { generateDailyBrief, generateMorningBriefing, fetchTrendingContent } from "~/lib/ai.server";
import type { DailyIdea, TrendInsight, DailyBriefing } from "~/lib/ai.server";
import { getNYCWeather } from "~/lib/weather.server";
import { fetchTodayEvents, isGoogleCalendarConnected } from "~/lib/google-calendar.server";
import type { CalendarEvent } from "~/lib/google-calendar.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import type { Idea, AnalyticsSnapshot, AtlasMetric } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export function meta() { return [{ title: "Daily Brief — FlyWithGarrett" }]; }

export async function loader() {
  const today = new Date().toISOString().split("T")[0];
  const todayCadence = WEEKLY_CADENCE[new Date().getDay()];
  const pillarCfg = PILLAR_CONFIG[todayCadence.pillar];

  const [snapshots, connections, atlasMetrics, weather, gcalConnected, fitnessToday, completedToday] = await Promise.all([
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    getConnectionStatus(),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    getNYCWeather(),
    isGoogleCalendarConnected(),
    kvGet<{ name: string; duration: string; muscles: string } | null>("fitness:today"),
    kvGet<string[]>(`completed:${today}`),
  ]);

  let calendarEvents: CalendarEvent[] = [];
  if (gcalConnected) { try { calendarEvents = await fetchTodayEvents(); } catch {} }

  let dailyIdeas: DailyIdea[] = [];
  try { dailyIdeas = await generateDailyBrief(todayCadence.label, pillarCfg.description, today); } catch {}

  let briefing: DailyBriefing | null = null;
  try { briefing = await generateMorningBriefing({ date: today, pillar: todayCadence.label, workout: fitnessToday?.name }); } catch {}

  let trends: TrendInsight[] = [];
  try { trends = await fetchTrendingContent(); } catch {}

  const platformStats = (["instagram", "youtube", "tiktok"] as const).map((p) => {
    const latest = (snapshots ?? []).filter((s) => s.platform === p).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return { platform: p, followers: latest?.followers ?? 0, connected: connections[p], label: PLATFORM_CONFIG[p].label, color: PLATFORM_CONFIG[p].color };
  });

  const latestAtlas = (atlasMetrics ?? []).sort((a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime())[0] ?? null;

  return {
    todayCadence, pillarCfg: { color: pillarCfg.color, description: pillarCfg.description },
    platformStats, latestAtlas, dailyIdeas, briefing, trends, weather, calendarEvents, gcalConnected,
    fitnessToday, hasApiKey: !!process.env.ANTHROPIC_API_KEY, completedToday: completedToday ?? [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const today = new Date().toISOString().split("T")[0];
  if (intent === "regenerate") { await kvSet(`cache:brief:${today}`, null); await kvSet(`cache:morning:${today}`, null); }
  if (intent === "use-idea") {
    await kvAddItem("ideas:bank", { id: generateId(), title: formData.get("hook") as string, pillar: formData.get("pillar") as Idea["pillar"], hookDraft: formData.get("hook") as string, notes: "", status: "raw", createdAt: new Date().toISOString() } satisfies Idea);
  }
  if (intent === "complete-task") {
    const taskId = formData.get("taskId") as string;
    const completed = await kvGet<string[]>(`completed:${today}`) ?? [];
    if (!completed.includes(taskId)) { completed.push(taskId); await kvSet(`completed:${today}`, completed); }
  }
  return { ok: true };
}

const pIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };

export default function DailyBrief() {
  const d = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const priorities = [
    ...(d.dailyIdeas.length > 0 ? [{ id: "film", icon: "🎬", text: d.dailyIdeas[0].hook, sub: d.todayCadence.label, tag: "today" }] : []),
    ...(d.fitnessToday ? [{ id: "gym", icon: "💪", text: d.fitnessToday.name, sub: d.fitnessToday.muscles || "", tag: "today" }] : []),
    { id: "stories", icon: "📱", text: "Post 4–8 Instagram Stories", sub: "Daily habit", tag: "ongoing" },
    { id: "atlas", icon: "💧", text: d.briefing?.atlasAction || "Check Atlas Hydration", sub: "Business", tag: "today" },
    { id: "skyway", icon: "🛩", text: d.briefing?.skywayAction || "Review SkyWay progress", sub: "Product", tag: "ongoing" },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-title">{greeting}, Garrett.</h1>
        <p className="text-[14px] text-[#86868b] mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {d.weather.icon} {d.weather.temperature}°F · {d.weather.description}
        </p>
        <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: d.pillarCfg.color + "12", color: d.pillarCfg.color }}>
          <span className="w-[5px] h-[5px] rounded-full" style={{ background: d.pillarCfg.color }} />
          {d.todayCadence.label}
        </span>
      </div>

      {/* AI Briefing */}
      {d.briefing && (
        <div className="card-static" style={{ borderLeft: `3px solid #007aff` }}>
          <p className="text-[11px] font-semibold text-[#007aff] uppercase tracking-wide mb-2">Your Briefing</p>
          <p className="text-[15px] text-[#1d1d1f] leading-relaxed">{d.briefing.summary}</p>
          <p className="text-[13px] text-[#86868b] mt-2 italic">{d.briefing.bestFilmTime && `Best time to film: ${d.briefing.bestFilmTime}`}</p>
        </div>
      )}

      {/* Priorities */}
      <div>
        <p className="text-section mb-3">Today's Priorities</p>
        <div className="divide-y divide-[rgba(0,0,0,0.06)]">
          {priorities.map((p) => {
            const done = d.completedToday.includes(p.id);
            return (
              <div key={p.id} className={`flex items-center gap-3 py-3 ${done ? "opacity-40" : ""}`}>
                <Form method="post" className="shrink-0">
                  <input type="hidden" name="intent" value="complete-task" />
                  <input type="hidden" name="taskId" value={p.id} />
                  <button type="submit" className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all ${done ? "bg-[#34c759]" : "border-2 border-[rgba(0,0,0,0.15)] hover:border-[#007aff]"}`}>
                    {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                </Form>
                <span className="text-[18px] leading-none">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium ${done ? "line-through text-[#86868b]" : "text-[#1d1d1f]"}`}>{p.text}</p>
                  {p.sub && <p className="text-[12px] text-[#86868b]">{p.sub}</p>}
                </div>
                <span className={p.tag === "today" ? "badge-today" : "badge-ongoing"}>{p.tag}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <div>
        <p className="text-section mb-3">Schedule</p>
        <div className="card-static">
          {!d.gcalConnected ? (
            <div className="flex items-center justify-between">
              <p className="text-[14px] text-[#86868b]">Connect your calendar to see today's events</p>
              <a href="/auth/google-calendar" className="text-[13px] text-[#007aff] font-medium">Connect →</a>
            </div>
          ) : d.calendarEvents.length === 0 ? (
            <p className="text-[14px] text-[#86868b]">No events today — open schedule</p>
          ) : (
            <div className="space-y-2">
              {d.calendarEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="text-[13px] text-[#86868b] w-16 shrink-0 tabular-nums">{e.allDay ? "All day" : new Date(e.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                  <p className="text-[14px] text-[#1d1d1f]">{e.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Business at a Glance */}
      <div>
        <p className="text-section mb-3">Business</p>
        <div className="grid grid-cols-3 gap-3">
          <Link to="/atlas" className="card">
            <Droplets className="w-4 h-4 text-[#34c759] mb-2" />
            <p className="text-[13px] font-semibold text-[#1d1d1f]">Atlas Hydration</p>
            <p className="text-[12px] text-[#86868b] mt-0.5">{d.latestAtlas ? `$${d.latestAtlas.revenue.toLocaleString()} rev` : "4 flavors · Active"}</p>
          </Link>
          <Link to="/skyway" className="card">
            <Smartphone className="w-4 h-4 text-[#007aff] mb-2" />
            <p className="text-[13px] font-semibold text-[#1d1d1f]">SkyWay</p>
            <p className="text-[12px] text-[#86868b] mt-0.5">MVP Build</p>
          </Link>
          <Link to="/business" className="card">
            <TrendingUp className="w-4 h-4 text-[#ff9500] mb-2" />
            <p className="text-[13px] font-semibold text-[#1d1d1f]">Financials</p>
            <p className="text-[12px] text-[#86868b] mt-0.5">View P&L</p>
          </Link>
        </div>
      </div>

      {/* Content Ideas */}
      {d.dailyIdeas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-section">Content Ideas</p>
            <fetcher.Form method="post"><input type="hidden" name="intent" value="regenerate" /><button type="submit" className="text-[12px] text-[#007aff] font-medium flex items-center gap-1"><RefreshCw className={`w-3 h-3 ${fetcher.state !== "idle" ? "animate-spin" : ""}`} /> Refresh</button></fetcher.Form>
          </div>
          <div className="space-y-3">
            {d.dailyIdeas.map((idea, i) => (
              <div key={i} className="card-static" style={{ borderLeft: `3px solid ${d.pillarCfg.color}` }}>
                <p className="text-[15px] font-medium text-[#1d1d1f]">"{idea.hook}"</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="pill">{idea.format}</span>
                  <span className="pill">{idea.platform}</span>
                </div>
                {idea.why_now !== "Evergreen content" && <p className="text-[12px] text-[#86868b] mt-2 italic">{idea.why_now}</p>}
                {idea.filming_tip !== "Film in natural light" && <p className="text-[12px] mt-1" style={{ color: d.pillarCfg.color }}>{idea.filming_tip}</p>}
                <div className="flex gap-2 mt-3">
                  <Link to="/studio" className="btn-ghost text-[12px]">Write Script <ArrowRight className="w-3 h-3 inline ml-0.5" /></Link>
                  <Form method="post"><input type="hidden" name="intent" value="use-idea" /><input type="hidden" name="hook" value={idea.hook} /><input type="hidden" name="pillar" value={d.todayCadence.pillar} /><button type="submit" className="btn-ghost text-[12px]">Save</button></Form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/pilot" className="card flex items-center gap-3">
          <Plane className="w-4 h-4 text-[#007aff]" /><span className="text-[13px] font-medium text-[#1d1d1f]">Flight Schedule</span>
        </Link>
        <Link to="/fitness" className="card flex items-center gap-3">
          <Dumbbell className="w-4 h-4 text-[#34c759]" /><span className="text-[13px] font-medium text-[#1d1d1f]">Fitness</span>
        </Link>
      </div>

      {/* Audience */}
      <div>
        <p className="text-section mb-3">Audience</p>
        <div className="grid grid-cols-3 gap-3">
          {d.platformStats.map((p) => {
            const Icon = pIcons[p.platform];
            return (
              <div key={p.platform} className="card-static text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  {Icon && <Icon className="w-3.5 h-3.5" style={{ color: p.color }} />}
                  <span className="text-[12px] text-[#86868b]">{p.label}</span>
                </div>
                <p className="text-stat">{formatNumber(p.followers)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending */}
      {d.trends.length > 0 && (
        <div>
          <p className="text-section mb-3">Trending</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {d.trends.map((t, i) => (
              <div key={i} className="card-static min-w-[260px] max-w-[300px] shrink-0">
                <p className="text-[13px] font-medium text-[#1d1d1f]">{t.trend}</p>
                <p className="text-[12px] text-[#86868b] mt-1">{t.why_it_works}</p>
                <p className="text-[12px] text-[#007aff] mt-1">{t.how_garrett_can_use_it}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
