import { useLoaderData, Form } from "react-router";
import {
  Plane, Camera, Play, Music2,
  Flame, Target, Plus, Droplets, Smartphone,
  Calendar, CheckCircle2, ChevronDown, ChevronUp, FileText, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { kvGet, kvAddItem } from "~/lib/kv.server";
import { getConnectionStatus } from "~/lib/analytics.server";
import { fetchYouTubeStats } from "~/lib/youtube.server";
import { fetchInstagramStats } from "~/lib/instagram.server";
import { fetchTikTokStats } from "~/lib/tiktok.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG, MANAGER_DIRECTIVES } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import { cn } from "~/lib/utils";
import type { ContentItem, AnalyticsSnapshot, Idea, AtlasMetric } from "~/lib/types";
import type { Route } from "./+types/dashboard";
import { useState } from "react";

export function meta() {
  return [{ title: "Command Center — FlyWithGarrett" }];
}

export async function loader() {
  const [contentItems, snapshots, ideas, atlasMetrics, connections] = await Promise.all([
    kvGet<ContentItem[]>("content:items"),
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    kvGet<Idea[]>("ideas:bank"),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    getConnectionStatus(),
  ]);

  // Get live platform data from cache
  const [igData, ytData, ttData] = await Promise.all([
    connections.instagram ? fetchInstagramStats() : null,
    connections.youtube ? fetchYouTubeStats() : null,
    connections.tiktok ? fetchTikTokStats() : null,
  ]);

  const today = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();
  const todayCadence = WEEKLY_CADENCE[todayDow];

  const postedItems = (contentItems ?? []).filter((i) => i.status === "posted" && i.postedAt);
  const streak = calculateStreak(postedItems);

  const startOfWeek = getStartOfWeek(new Date());
  const weekItems = (contentItems ?? []).filter((i) => {
    const d = i.scheduledAt ? new Date(i.scheduledAt) : null;
    return d && d >= startOfWeek;
  });

  const todayContent = (contentItems ?? []).filter((i) => i.scheduledAt?.startsWith(today));

  // Platform stats — prefer live data, fallback to manual snapshots
  const platformStats = [
    {
      platform: "instagram" as const,
      label: "Instagram",
      followers: igData?.stats?.followers ?? getLatest(snapshots ?? [], "instagram"),
      connected: connections.instagram,
      color: "#E1306C",
    },
    {
      platform: "youtube" as const,
      label: "YouTube",
      followers: ytData?.stats?.followers ?? getLatest(snapshots ?? [], "youtube"),
      connected: connections.youtube,
      color: "#FF0000",
    },
    {
      platform: "tiktok" as const,
      label: "TikTok",
      followers: ttData?.stats?.followers ?? getLatest(snapshots ?? [], "tiktok"),
      connected: connections.tiktok,
      color: "#00F2EA",
    },
  ];

  const latestAtlas = (atlasMetrics ?? []).sort(
    (a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime()
  )[0] ?? null;

  return {
    todayContent,
    todayCadence,
    streak,
    weekPlanned: weekItems.length,
    weekPosted: weekItems.filter((i) => i.status === "posted").length,
    platformStats,
    latestAtlas,
    ideasCount: (ideas ?? []).length,
    connections,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  if (formData.get("intent") === "add-idea") {
    const idea: Idea = {
      id: generateId(),
      title: formData.get("title") as string,
      pillar: formData.get("pillar") as Idea["pillar"],
      hookDraft: formData.get("hookDraft") as string || "",
      notes: "",
      status: "raw",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("ideas:bank", idea);
  }
  return { ok: true };
}

function calculateStreak(items: ContentItem[]): number {
  if (!items.length) return 0;
  const dates = [...new Set(items.map((i) => i.postedAt!.split("T")[0]))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toISOString().split("T")[0]) streak++;
    else break;
  }
  return streak;
}

function getStartOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function getLatest(snapshots: AnalyticsSnapshot[], platform: string): number {
  const s = snapshots.filter((x) => x.platform === platform).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  return s?.followers ?? 0;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  tiktok: Music2,
  youtube: Play,
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const [strategyOpen, setStrategyOpen] = useState(false);
  const weekProgress = data.weekPlanned > 0 ? (data.weekPosted / data.weekPlanned) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title text-white">Command Center</h1>
          <p className="text-[13px] text-[#71717A] mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" — "}
            <span style={{ color: PILLAR_CONFIG[data.todayCadence.pillar].color }}>
              {data.todayCadence.label}
            </span>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]">
              <Plus className="w-4 h-4" /> Quick Idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Capture Idea</DialogTitle></DialogHeader>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="add-idea" />
              <Input name="title" placeholder="Idea title" required />
              <Select name="pillar" defaultValue="lifestyle">
                {Object.entries(PILLAR_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
              <Textarea name="hookDraft" placeholder="Hook draft (optional)" rows={3} />
              <Button type="submit" className="w-full bg-white text-[#08090A] hover:bg-white/90">Save Idea</Button>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-section">Streak</span>
          </div>
          <p className="text-stat">{data.streak}</p>
          <p className="text-[12px] text-[#71717A] mt-1">days consecutive</p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-section">Weekly</span>
          </div>
          <p className="text-stat">{data.weekPosted}<span className="text-[20px] text-[#71717A]">/{data.weekPlanned}</span></p>
          <p className="text-[12px] text-[#71717A] mt-1">posts completed</p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-section">Ideas</span>
          </div>
          <p className="text-stat">{data.ideasCount}</p>
          <p className="text-[12px] text-[#71717A] mt-1">banked ideas</p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-section">Progress</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-2 mt-3 mb-2">
            <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${weekProgress}%` }} />
          </div>
          <p className="text-[12px] text-[#71717A]">{Math.round(weekProgress)}% weekly goal</p>
        </div>
      </div>

      {/* Platform Health */}
      <div>
        <p className="text-section mb-3">Platform Health</p>
        <div className="grid grid-cols-3 gap-3">
          {data.platformStats.map((p) => {
            const Icon = platformIcons[p.platform];
            return (
              <div key={p.platform} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" style={{ color: p.color }} />}
                    <span className="text-[13px] text-[#A1A1AA]">{p.label}</span>
                  </div>
                  {p.connected ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Live</span>
                  ) : (
                    <a href={`/auth/${p.platform}`} className="text-[10px] text-blue-400 hover:text-blue-300">Connect</a>
                  )}
                </div>
                <p className="text-stat-sm text-white">{formatNumber(p.followers)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Agenda */}
        <div className="lg:col-span-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#F97316]" />
            <span className="text-[14px] font-medium text-white">Today's Agenda</span>
          </div>
          {data.todayContent.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-6 h-6 text-[#71717A] mx-auto mb-2" />
              <p className="text-[13px] text-[#71717A]">No content scheduled for today.</p>
              <p className="text-[12px] text-[#52525B] mt-1">
                Focus: <span style={{ color: PILLAR_CONFIG[data.todayCadence.pillar].color }}>{data.todayCadence.label}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.todayContent.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03]">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PILLAR_CONFIG[item.pillar].color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: PILLAR_CONFIG[item.pillar].color }}>{PILLAR_CONFIG[item.pillar].label}</span>
                      {item.platforms.map((p) => {
                        const Icon = platformIcons[p];
                        return Icon ? <Icon key={p} className="w-3 h-3 text-[#71717A]" /> : null;
                      })}
                    </div>
                  </div>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded", item.status === "posted" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Currently Building */}
        <div className="space-y-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-emerald-400" />
              <span className="text-[13px] font-medium text-white">Atlas Hydration</span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#71717A]">Status</span><span className="text-emerald-400">Active</span></div>
              <div className="flex justify-between"><span className="text-[#71717A]">Products</span><span className="text-white">4 Flavors</span></div>
              {data.latestAtlas && (
                <div className="flex justify-between"><span className="text-[#71717A]">Revenue</span><span className="text-white">${data.latestAtlas.revenue.toLocaleString()}</span></div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span className="text-[13px] font-medium text-white">SkyWay App</span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#71717A]">Status</span><span className="text-blue-400">In Dev</span></div>
              <div className="flex justify-between"><span className="text-[#71717A]">Phase</span><span className="text-white">MVP Build</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Manager Strategy Card */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213]">
        <button
          onClick={() => setStrategyOpen(!strategyOpen)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#F97316]" />
            <span className="text-[14px] font-medium text-white">Manager Strategy Directives</span>
          </div>
          {strategyOpen ? <ChevronUp className="w-4 h-4 text-[#71717A]" /> : <ChevronDown className="w-4 h-4 text-[#71717A]" />}
        </button>
        {strategyOpen && (
          <div className="px-4 pb-4 space-y-2">
            {MANAGER_DIRECTIVES.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px]">
                <span className="text-[#71717A] mt-0.5">•</span>
                <span className="text-[#A1A1AA]">{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
