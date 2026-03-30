import { useState } from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import {
  Target, Plus, Camera, Play, Music2,
  Link2, RefreshCw, Sparkles, X, CheckCircle, AlertCircle,
  Lightbulb, Rocket, Crosshair
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "~/components/ui/dialog";
import { getAggregatedAnalytics } from "~/lib/analytics.server";
import { generateAnalysis, getAnalysisHistory } from "~/lib/analysis.server";
import { kvGet, kvAddItem } from "~/lib/kv.server";
import { PLATFORM_CONFIG, PLATFORMS, PILLAR_CONFIG, PILLARS } from "~/lib/constants";
import { formatNumber, generateId, cn } from "~/lib/utils";
import type { AnalyticsSnapshot, Goal, AtlasMetric, ContentItem, Platform, AnalysisResult } from "~/lib/types";
import type { Route } from "./+types/analytics";

export function meta() {
  return [{ title: "Analytics — FlyWithGarrett" }];
}

export async function loader() {
  const [analytics, snapshots, goals, atlasMetrics, contentItems, analysisHistory] = await Promise.all([
    getAggregatedAnalytics(),
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    kvGet<Goal[]>("analytics:goals"),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<ContentItem[]>("content:items"),
    getAnalysisHistory("all"),
  ]);

  return {
    analytics,
    snapshots: snapshots ?? [],
    goals: goals ?? [],
    atlasMetrics: atlasMetrics ?? [],
    contentItems: contentItems ?? [],
    analysisHistory,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-snapshot") {
    const snapshot: AnalyticsSnapshot = {
      id: generateId(),
      platform: formData.get("platform") as Platform,
      followers: Number(formData.get("followers")),
      views: Number(formData.get("views") || 0),
      reach: Number(formData.get("reach") || 0),
      engagementRate: Number(formData.get("engagementRate") || 0),
      topPostTitle: formData.get("topPostTitle") as string || "",
      recordedAt: new Date().toISOString(),
    };
    await kvAddItem("analytics:snapshots", snapshot);
  } else if (intent === "add-goal") {
    const goal: Goal = {
      id: generateId(),
      platform: formData.get("platform") as Platform,
      metric: formData.get("metric") as string,
      target: Number(formData.get("target")),
      current: Number(formData.get("current") || 0),
      month: formData.get("month") as string,
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("analytics:goals", goal);
  } else if (intent === "run-analysis") {
    const platform = (formData.get("platform") as Platform | "all") || "all";
    const analytics = await getAggregatedAnalytics();
    const allTopPosts = [
      ...analytics.platforms.instagram.topPosts,
      ...analytics.platforms.youtube.topPosts,
      ...analytics.platforms.tiktok.topPosts,
    ];
    const result = await generateAnalysis(platform, null, allTopPosts);
    return { analysis: result };
  }

  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera, youtube: Play, tiktok: Music2,
};

const chartColors: Record<string, string> = {
  instagram: "#E1306C", tiktok: "#00F2EA", youtube: "#FF0000",
};

export default function AnalyticsPage() {
  const { analytics, snapshots, goals, atlasMetrics, contentItems, analysisHistory } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);

  const isAnalyzing = fetcher.state !== "idle";

  // When analysis completes
  const analysisResult = (fetcher.data as any)?.analysis;
  if (analysisResult && !activeAnalysis) {
    setActiveAnalysis(analysisResult);
    setAnalysisOpen(true);
  }

  const platformCards = (["instagram", "youtube", "tiktok"] as Platform[]).map((p) => {
    const data = analytics.platforms[p];
    return { platform: p, ...data, label: PLATFORM_CONFIG[p].label, color: chartColors[p] };
  });

  // Growth chart
  const growthData = (() => {
    const dateMap = new Map<string, Record<string, number>>();
    snapshots.forEach((s) => {
      if (s.platform === "threads" || s.platform === "x") return;
      const date = s.recordedAt.split("T")[0];
      if (!dateMap.has(date)) dateMap.set(date, {});
      dateMap.get(date)![s.platform] = s.followers;
    });
    return Array.from(dateMap.entries()).map(([date, p]) => ({ date, ...p })).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const pillarEngagement = PILLARS.map((p) => ({
    pillar: PILLAR_CONFIG[p].label.split(" ")[0],
    count: contentItems.filter((i) => i.pillar === p && i.status === "posted").length,
    color: PILLAR_CONFIG[p].color,
  }));

  const runAnalysis = (platform: string) => {
    setActiveAnalysis(null);
    fetcher.submit({ intent: "run-analysis", platform }, { method: "post" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-title text-white">Analytics</h1>
          <p className="text-[13px] text-[#71717A] mt-1">Platform performance & AI insights</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => runAnalysis("all")} disabled={isAnalyzing}
            className="gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            {isAnalyzing ? "Analyzing..." : "AI Analysis"}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]">
                <Plus className="w-4 h-4" /> Log Stats
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Platform Stats</DialogTitle></DialogHeader>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="add-snapshot" />
                <Select name="platform" defaultValue="instagram">
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}
                </Select>
                <Input name="followers" type="number" placeholder="Followers" required />
                <Input name="views" type="number" placeholder="Views (optional)" />
                <Input name="engagementRate" type="number" step="0.01" placeholder="Engagement Rate %" />
                <DialogClose asChild><Button type="submit" className="w-full bg-white text-[#08090A]">Save</Button></DialogClose>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {platformCards.map((p) => {
          const Icon = platformIcons[p.platform];
          return (
            <div key={p.platform} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4" style={{ color: p.color }} />}
                  <span className="text-[13px] font-medium text-white">{p.label}</span>
                </div>
                {p.connected ? (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Connected</span>
                ) : (
                  <a href={`/auth/${p.platform}`} className="text-[11px] text-blue-400 flex items-center gap-1 hover:text-blue-300">
                    <Link2 className="w-3 h-3" /> Connect
                  </a>
                )}
              </div>
              <p className="text-stat text-white">{formatNumber(p.stats?.followers ?? 0)}</p>
              <p className="text-[12px] text-[#71717A] mt-1">followers</p>
              {p.stats?.lastSynced && (
                <p className="text-[10px] text-[#52525B] mt-2">
                  Synced {new Date(p.stats.lastSynced).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              )}
              {p.topPosts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  <p className="text-[11px] text-[#71717A] mb-1">Top recent content</p>
                  <p className="text-[12px] text-[#A1A1AA] truncate">{p.topPosts[0].title}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Audience */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-5 text-center">
        <p className="text-section mb-2">Total Audience</p>
        <p className="text-[40px] font-semibold text-white tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatNumber(analytics.totalFollowers || platformCards.reduce((s, p) => s + (p.stats?.followers ?? 0), 0))}
        </p>
      </div>

      <Tabs defaultValue="growth">
        <TabsList className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="pillars">Pillars</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-5">
            <p className="text-[14px] font-medium text-white mb-4">Follower Growth</p>
            {growthData.length < 2 ? (
              <div className="text-center py-12 text-[13px] text-[#71717A]">Log at least 2 snapshots to see trends.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="#52525B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#52525B" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#111213", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend />
                  {PLATFORMS.map((p) => <Line key={p} type="monotone" dataKey={p} stroke={chartColors[p]} strokeWidth={2} dot={false} name={PLATFORM_CONFIG[p].label} />)}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pillars">
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-5">
            <p className="text-[14px] font-medium text-white mb-4">Content by Pillar</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pillarEngagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="pillar" stroke="#52525B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#52525B" />
                <Tooltip contentStyle={{ backgroundColor: "#111213", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" }} />
                <Bar dataKey="count" name="Posts" radius={[4, 4, 0, 0]}>
                  {pillarEngagement.map((e, i) => <rect key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]">
                  <Plus className="w-4 h-4" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-goal" />
                  <Select name="platform" defaultValue="instagram">
                    {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}
                  </Select>
                  <Input name="metric" placeholder="Metric (e.g. Followers)" required />
                  <Input name="target" type="number" placeholder="Target" required />
                  <Input name="current" type="number" placeholder="Current" />
                  <Input name="month" type="month" required />
                  <DialogClose asChild><Button type="submit" className="w-full bg-white text-[#08090A]">Save</Button></DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {goals.length === 0 ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-12 text-center">
              <Target className="w-6 h-6 text-[#71717A] mx-auto mb-2" />
              <p className="text-[13px] text-[#71717A]">No goals set yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {goals.map((goal) => {
                const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
                return (
                  <div key={goal.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-white">{PLATFORM_CONFIG[goal.platform].label} — {goal.metric}</span>
                      <span className="text-[11px] text-[#71717A]">{goal.month}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#71717A] mb-1">
                      <span>{formatNumber(goal.current)}</span>
                      <span>{formatNumber(goal.target)}</span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                      <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Analysis Slide-over */}
      {analysisOpen && activeAnalysis && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAnalysisOpen(false)} />
          <div className="relative w-full max-w-[600px] bg-[#0D0E0F] border-l border-[rgba(255,255,255,0.06)] overflow-y-auto slide-in-right">
            <div className="sticky top-0 bg-[#0D0E0F] border-b border-[rgba(255,255,255,0.06)] p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-[14px] font-medium text-white">AI Analysis</p>
                  <p className="text-[11px] text-[#71717A]">{new Date(activeAnalysis.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[13px] font-semibold",
                  activeAnalysis.overallScore >= 7 ? "bg-emerald-500/15 text-emerald-400" :
                  activeAnalysis.overallScore >= 4 ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"
                )}>
                  {activeAnalysis.overallScore}/10
                </div>
                <button onClick={() => setAnalysisOpen(false)} className="p-1 hover:bg-white/[0.06] rounded">
                  <X className="w-4 h-4 text-[#71717A]" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Score Summary */}
              <div className="rounded-lg bg-white/[0.03] p-4">
                <p className="text-[13px] text-[#A1A1AA]">{activeAnalysis.scoreSummary}</p>
              </div>

              {/* Weekly Focus */}
              <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                  <span className="text-[13px] font-medium text-emerald-400">This Week's Focus</span>
                </div>
                <p className="text-[13px] text-[#ECECED]">{activeAnalysis.weeklyFocus}</p>
              </div>

              {/* What's Working */}
              {activeAnalysis.whatsWorking.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-section text-emerald-400">What's Working</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.whatsWorking.map((item, i) => (
                      <div key={i} className="rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10 p-3">
                        <p className="text-[13px] font-medium text-white">{item.insight}</p>
                        <p className="text-[12px] text-[#71717A] mt-1">{item.evidence}</p>
                        <p className="text-[12px] text-emerald-400 mt-1">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What's Not Working */}
              {activeAnalysis.whatsNotWorking.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <span className="text-section text-orange-400">Needs Improvement</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.whatsNotWorking.map((item, i) => (
                      <div key={i} className="rounded-lg bg-orange-500/[0.04] border border-orange-500/10 p-3">
                        <p className="text-[13px] font-medium text-white">{item.insight}</p>
                        <p className="text-[12px] text-[#71717A] mt-1">{item.evidence}</p>
                        <p className="text-[12px] text-orange-400 mt-1">{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Gaps */}
              {activeAnalysis.contentGaps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-purple-400" />
                    <span className="text-section text-purple-400">Content Gaps</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.contentGaps.map((item, i) => (
                      <div key={i} className="rounded-lg bg-purple-500/[0.04] border border-purple-500/10 p-3">
                        <p className="text-[13px] font-medium text-white">{item.pillar}: {item.gap}</p>
                        <p className="text-[12px] text-purple-400 mt-1">{item.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {activeAnalysis.topOpportunities.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="w-4 h-4 text-blue-400" />
                    <span className="text-section text-blue-400">Top Opportunities</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.topOpportunities.map((item, i) => (
                      <div key={i} className="rounded-lg bg-blue-500/[0.04] border border-blue-500/10 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[13px] font-medium text-white">{item.opportunity}</p>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                            item.priority === "high" ? "bg-red-500/15 text-red-400" :
                            item.priority === "medium" ? "bg-amber-500/15 text-amber-400" :
                            "bg-zinc-500/15 text-zinc-400"
                          )}>{item.priority}</span>
                        </div>
                        <p className="text-[12px] text-[#71717A]">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => { setAnalysisOpen(false); runAnalysis("all"); }}
                className="w-full bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerate Analysis
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
