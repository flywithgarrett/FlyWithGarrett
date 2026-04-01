import { useState } from "react";
import { useLoaderData, Form, useFetcher, Link } from "react-router";
import { Camera, Play, Music2, Droplets, Smartphone, Sparkles, RefreshCw, ArrowRight, TrendingUp, Target, Dumbbell, Plane, Calendar, Check, Flame, AlertTriangle } from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { getConnectionStatus } from "~/lib/analytics.server";
import { generateDailyBrief, generateMorningBriefing, fetchTrendingContent } from "~/lib/ai.server";
import type { DailyIdea, TrendInsight, DailyBriefing } from "~/lib/ai.server";
import { getNYCWeather } from "~/lib/weather.server";
import { fetchTodayEvents, isGoogleCalendarConnected } from "~/lib/google-calendar.server";
import type { CalendarEvent } from "~/lib/google-calendar.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import type { Idea, AnalyticsSnapshot, AtlasMetric, ContentItem } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export function meta() { return [{ title: "Daily Brief — Life OS" }]; }

export async function loader() {
  const today = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();
  const todayCadence = WEEKLY_CADENCE[todayDow];
  const pillarCfg = PILLAR_CONFIG[todayCadence.pillar];

  const [snapshots, connections, atlasMetrics, contentItems, weather, gcalConnected, pilotSchedule, fitnessToday, completedToday] = await Promise.all([
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    getConnectionStatus(),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<ContentItem[]>("content:items"),
    getNYCWeather(),
    isGoogleCalendarConnected(),
    kvGet<{ type: string; details: string } | null>(`pilot:${today}`),
    kvGet<{ name: string; duration: string; muscles: string } | null>("fitness:today"),
    kvGet<string[]>(`completed:${today}`),
  ]);

  let calendarEvents: CalendarEvent[] = [];
  if (gcalConnected) { try { calendarEvents = await fetchTodayEvents(); } catch {} }

  let dailyIdeas: DailyIdea[] = [];
  try { dailyIdeas = await generateDailyBrief(todayCadence.label, pillarCfg.description, today); } catch {}

  let briefing: DailyBriefing | null = null;
  try {
    briefing = await generateMorningBriefing({
      date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      pillar: todayCadence.label,
      pilotStatus: pilotSchedule?.type || "Day off",
      calendarEvents: calendarEvents.map((e) => `${e.title} at ${e.start}`).join(", ") || "No events",
      workout: fitnessToday?.name || "Check fitness plan",
      atlasStatus: atlasMetrics?.length ? `Revenue: $${atlasMetrics[0].revenue}` : "Active",
      skywayStatus: "MVP Build phase",
    });
  } catch {}

  let trends: TrendInsight[] = [];
  try { trends = await fetchTrendingContent(); } catch {}

  // Calculate days since last content post
  const postedItems = (contentItems ?? []).filter((i) => i.status === "posted" && i.postedAt).sort((a, b) => new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime());
  const daysSincePost = postedItems.length > 0 ? Math.floor((Date.now() - new Date(postedItems[0].postedAt!).getTime()) / 86400000) : 99;

  const platformStats = (["instagram", "youtube", "tiktok"] as const).map((p) => {
    const latest = (snapshots ?? []).filter((s) => s.platform === p).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return { platform: p, followers: latest?.followers ?? 0, connected: connections[p], label: PLATFORM_CONFIG[p].label, color: PLATFORM_CONFIG[p].color };
  });

  const latestAtlas = (atlasMetrics ?? []).sort((a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime())[0] ?? null;

  return {
    todayCadence, pillarCfg: { color: pillarCfg.color, description: pillarCfg.description, label: pillarCfg.label },
    platformStats, latestAtlas, dailyIdeas, briefing, trends, weather, calendarEvents, gcalConnected,
    pilotStatus: pilotSchedule?.type || "Off today", fitnessToday, hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    daysSincePost, completedToday: completedToday ?? [],
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

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };
const reachDot: Record<string, string> = { high: "#10B981", medium: "#F59E0B", low: "rgba(245,245,245,0.2)" };
const catColor: Record<string, string> = { personal: "#3B82F6", flying: "#06B6D4", content: "#FF6B35", business: "#8B5CF6", fitness: "#10B981" };

export default function DailyBrief() {
  const d = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const priorities = [
    ...(d.dailyIdeas.length > 0 ? [{ id: "content-1", icon: "🎬", label: d.dailyIdeas[0].hook, context: `${d.todayCadence.label} — ${d.daysSincePost > 3 ? `overdue ${d.daysSincePost} days` : "on schedule"}`, badge: d.daysSincePost > 3 ? "urgent" : "today", cat: "Content" }] : []),
    ...(d.fitnessToday ? [{ id: "fitness", icon: "💪", label: `${d.fitnessToday.name}${d.fitnessToday.duration ? ` — ${d.fitnessToday.duration}` : ""}`, context: d.fitnessToday.muscles || "Fitness", badge: "today", cat: "Fitness" }] : [{ id: "fitness", icon: "💪", label: "Plan today's workout", context: "No workout set", badge: "today", cat: "Fitness" }]),
    { id: "stories", icon: "📱", label: "Post 4-8 Instagram Stories", context: "Daily requirement from manager strategy", badge: "ongoing", cat: "Content" },
    { id: "atlas", icon: "📦", label: d.briefing?.atlasAction || "Review Atlas Hydration status", context: d.latestAtlas ? `$${d.latestAtlas.revenue.toLocaleString()} this month` : "Check metrics", badge: "today", cat: "Atlas" },
    { id: "skyway", icon: "💻", label: d.briefing?.skywayAction || "Check SkyWay progress", context: "MVP Build phase", badge: "ongoing", cat: "SkyWay" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-title">{greeting}, Garrett.</p>
        <p className="text-[13px] text-[rgba(245,245,245,0.4)] mt-1.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {d.weather.icon} {d.weather.temperature}°F · {d.weather.description}
        </p>
        <div className="mt-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold" style={{ backgroundColor: d.pillarCfg.color + "18", color: d.pillarCfg.color }}>
            <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: d.pillarCfg.color }} />
            {d.todayCadence.label}
          </span>
          {d.daysSincePost > 3 && <span className="badge-urgent ml-2">{d.daysSincePost}d since last post</span>}
        </div>
      </div>

      {/* AI Briefing */}
      {d.briefing && (
        <div className="card-priority" style={{ borderLeftColor: "#FF6B35" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-[#FF6B35] uppercase tracking-[0.08em]">Your Briefing</p>
            <fetcher.Form method="post"><input type="hidden" name="intent" value="regenerate" /><button type="submit" className="btn-ghost text-[11px] py-1 px-2"><RefreshCw className={`w-3 h-3 inline mr-1 ${fetcher.state !== "idle" ? "animate-spin" : ""}`} />Refresh</button></fetcher.Form>
          </div>
          <p className="text-[14px] text-[#f5f5f5] leading-relaxed">{d.briefing.summary}</p>
          {d.briefing.bestFilmTime && <p className="text-[12px] text-[rgba(245,245,245,0.4)] mt-2">📍 Best time to film: {d.briefing.bestFilmTime}</p>}
        </div>
      )}

      {/* Priorities */}
      <div>
        <p className="text-section mb-3">Today's Priorities</p>
        <div className="space-y-[2px]">
          {priorities.map((p, i) => {
            const done = d.completedToday.includes(p.id);
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-[10px] ${done ? "opacity-40" : "bg-[#1e1e1e]"}`}>
                <Form method="post" className="shrink-0">
                  <input type="hidden" name="intent" value="complete-task" />
                  <input type="hidden" name="taskId" value={p.id} />
                  <button type="submit" className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all ${done ? "bg-[#10B981]" : "border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)]"}`}>
                    {done && <Check className="w-3 h-3 text-white" />}
                  </button>
                </Form>
                <span className="text-[16px] shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${done ? "line-through text-[rgba(245,245,245,0.3)]" : "text-[#f5f5f5]"}`}>{p.label}</p>
                  <p className="text-[11px] text-[rgba(245,245,245,0.3)]">{p.context}</p>
                </div>
                <span className={p.badge === "urgent" ? "badge-urgent" : p.badge === "today" ? "badge-today" : "badge-ongoing"}>{p.badge}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-[rgba(245,245,245,0.15)] mt-2">{d.completedToday.length}/{priorities.length} completed today</p>
      </div>

      {/* Schedule */}
      <div>
        <p className="text-section mb-3">Schedule</p>
        <div className="card-static">
          {d.calendarEvents.length === 0 && !d.gcalConnected ? (
            <div className="flex items-center justify-between">
              <p className="text-body">No calendar connected</p>
              <a href="/auth/google-calendar" className="text-[12px] text-[#3B82F6]">Connect Google Calendar →</a>
            </div>
          ) : d.calendarEvents.length === 0 ? (
            <p className="text-body">No meetings today — full creative day</p>
          ) : (
            <div className="space-y-2">
              {d.calendarEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="text-[12px] text-[rgba(245,245,245,0.3)] w-16 shrink-0 tabular-nums">{e.allDay ? "All day" : new Date(e.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: catColor[e.category] || "#3B82F6" }} />
                  <span className="text-[13px] text-[#f5f5f5]">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Three Business Pulses */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/studio" className="card-static hover:bg-[#262626] transition-colors">
          <p className="text-[10px] font-semibold text-[#FF6B35] uppercase tracking-[0.08em] mb-2">Content</p>
          <p className="text-[13px] text-[#f5f5f5]">Last post: <span className={d.daysSincePost > 3 ? "text-[#ef4444]" : d.daysSincePost > 1 ? "text-[#f59e0b]" : "text-[#10b981]"}>{d.daysSincePost === 0 ? "Today" : `${d.daysSincePost}d ago`}</span></p>
          <p className="text-[11px] text-[rgba(245,245,245,0.3)] mt-1">Pillar: {d.todayCadence.label}</p>
        </Link>
        <Link to="/atlas" className="card-static hover:bg-[#262626] transition-colors">
          <p className="text-[10px] font-semibold text-[#10B981] uppercase tracking-[0.08em] mb-2">Atlas</p>
          <p className="text-stat-sm">{d.latestAtlas ? `$${(d.latestAtlas.revenue / 1000).toFixed(1)}K` : "—"}</p>
          <p className="text-[11px] text-[rgba(245,245,245,0.3)] mt-1">Revenue this month</p>
        </Link>
        <Link to="/skyway" className="card-static hover:bg-[#262626] transition-colors">
          <p className="text-[10px] font-semibold text-[#06B6D4] uppercase tracking-[0.08em] mb-2">SkyWay</p>
          <p className="text-[13px] text-[#f5f5f5]">MVP Build</p>
          <p className="text-[11px] text-[rgba(245,245,245,0.3)] mt-1">Phase active</p>
        </Link>
      </div>

      {/* Content Mission */}
      <div>
        <p className="text-section mb-3">Content Mission</p>
        {!d.hasApiKey && <div className="mb-2 px-3 py-2 rounded-[8px] bg-[rgba(245,158,11,0.08)]"><p className="text-[11px] text-[#f59e0b]">Add ANTHROPIC_API_KEY for AI-powered ideas</p></div>}
        <div className="space-y-2">
          {d.dailyIdeas.map((idea, i) => (
            <div key={i} className="card-static" style={{ borderLeft: `2px solid ${d.pillarCfg.color}30` }}>
              <p className="text-[14px] font-medium text-[#f5f5f5] leading-snug">"{idea.hook}"</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="pill text-[10px]">{idea.format}</span>
                <span className="pill text-[10px]">{idea.platform}</span>
                <span className="flex items-center gap-1"><span className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: reachDot[idea.estimated_reach] }} /><span className="text-[10px] text-[rgba(245,245,245,0.3)]">{idea.estimated_reach}</span></span>
              </div>
              <p className="text-[12px] text-[rgba(245,245,245,0.3)] mt-1.5 italic">{idea.why_now}</p>
              <p className="text-[12px] mt-1" style={{ color: d.pillarCfg.color }}>{idea.filming_tip}</p>
              <div className="flex gap-1.5 mt-3">
                <Link to="/studio" className="btn-ghost text-[11px] py-1 px-2.5">Write Script <ArrowRight className="w-3 h-3 inline ml-0.5" /></Link>
                <Form method="post"><input type="hidden" name="intent" value="use-idea" /><input type="hidden" name="hook" value={idea.hook} /><input type="hidden" name="pillar" value={d.todayCadence.pillar} /><button type="submit" className="btn-ghost text-[11px] py-1 px-2.5">Save</button></Form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pilot + Fitness */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/pilot" className="card flex items-center gap-3">
          <Plane className="w-4 h-4 text-[#06B6D4] shrink-0" />
          <div><p className="text-[13px] font-medium text-[#f5f5f5]">Pilot</p><p className="text-[11px] text-[rgba(245,245,245,0.3)]">{d.pilotStatus}</p></div>
        </Link>
        <Link to="/fitness" className="card flex items-center gap-3">
          <Dumbbell className="w-4 h-4 text-[#10B981] shrink-0" />
          <div><p className="text-[13px] font-medium text-[#f5f5f5]">Fitness</p><p className="text-[11px] text-[rgba(245,245,245,0.3)]">{d.fitnessToday?.name || "Plan workout"}</p></div>
        </Link>
      </div>

      {/* Trending */}
      {d.trends.length > 0 && (
        <div>
          <p className="text-section mb-3">Trending Now</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {d.trends.map((t, i) => (
              <div key={i} className="card-static min-w-[260px] max-w-[300px] shrink-0 !p-4">
                <p className="text-[13px] font-medium text-[#f5f5f5]">{t.trend}</p>
                <p className="text-[11px] text-[rgba(245,245,245,0.3)] mt-1">{t.why_it_works}</p>
                <p className="text-[11px] text-[#3B82F6] mt-1">{t.how_garrett_can_use_it}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Stats */}
      <div>
        <p className="text-section mb-3">Audience</p>
        <div className="grid grid-cols-3 gap-2">
          {d.platformStats.map((p) => {
            const Icon = platformIcons[p.platform];
            return (
              <div key={p.platform} className="card-static !p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  {Icon && <Icon className="w-3.5 h-3.5" style={{ color: p.color }} />}
                  <span className="text-[11px] text-[rgba(245,245,245,0.3)]">{p.label}</span>
                </div>
                <p className="text-stat-sm">{formatNumber(p.followers)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
