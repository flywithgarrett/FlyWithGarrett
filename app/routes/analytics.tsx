import { useState, useEffect } from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import {
  Target, Plus, Camera, Play, Music2,
  Link2, RefreshCw, Sparkles, X, CheckCircle, AlertCircle,
  Lightbulb, Rocket, Crosshair,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { getAggregatedAnalytics } from "~/lib/analytics.server";
import { generateAnalysis } from "~/lib/ai.server";
import { kvGet, kvAddItem } from "~/lib/kv.server";
import { PLATFORM_CONFIG, PLATFORMS, PILLAR_CONFIG, PILLARS } from "~/lib/constants";
import { formatNumber, generateId, cn } from "~/lib/utils";
import type { AnalyticsSnapshot, Goal, ContentItem, Platform, AnalysisResult } from "~/lib/types";
import type { Route } from "./+types/analytics";

export function meta() {
  return [{ title: "Analytics — FlyWithGarrett" }];
}

export async function loader() {
  const [analytics, snapshots, goals, contentItems] = await Promise.all([
    getAggregatedAnalytics(),
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    kvGet<Goal[]>("analytics:goals"),
    kvGet<ContentItem[]>("content:items"),
  ]);

  return {
    analytics,
    snapshots: snapshots ?? [],
    goals: goals ?? [],
    contentItems: contentItems ?? [],
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
    const snapshots = await kvGet<AnalyticsSnapshot[]>("analytics:snapshots") ?? [];
    const contentItems = await kvGet<ContentItem[]>("content:items") ?? [];
    const dataPayload = JSON.stringify({ snapshots: snapshots.slice(-20), contentItems: contentItems.slice(-20) });
    const resultText = await generateAnalysis(dataPayload);
    if (resultText) {
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const result: AnalysisResult = {
            id: generateId(),
            platform: "all",
            createdAt: new Date().toISOString(),
            overallScore: parsed.overallScore || 5,
            scoreSummary: parsed.scoreSummary || "",
            weeklyFocus: parsed.weeklyFocus || "",
            whatsWorking: parsed.whatsWorking || [],
            whatsNotWorking: parsed.whatsNotWorking || [],
            contentGaps: parsed.contentGaps || [],
            topOpportunities: parsed.topOpportunities || [],
          };
          return { analysis: result };
        }
      } catch {
        // parse error
      }
    }
    return { analysis: null };
  }

  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera, youtube: Play, tiktok: Music2,
};

const chartColors: Record<string, string> = {
  instagram: "#E1306C", tiktok: "#00F2EA", youtube: "#FF0000",
};

const chartTooltipStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "12px",
  fontSize: "12px",
};

export default function AnalyticsPage() {
  const { analytics, snapshots, goals, contentItems } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [showLogStats, setShowLogStats] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const isAnalyzing = fetcher.state !== "idle";

  // When analysis completes
  const analysisResult = (fetcher.data as any)?.analysis;
  useEffect(() => {
    if (analysisResult && !activeAnalysis) {
      setActiveAnalysis(analysisResult);
      setAnalysisOpen(true);
    }
  }, [analysisResult]);

  const platformCards = (["instagram", "youtube", "tiktok"] as Platform[]).map((p) => {
    const data = analytics.platforms[p];
    return { platform: p, ...data, label: PLATFORM_CONFIG[p].label, color: chartColors[p] };
  });

  // Growth chart
  const growthData = (() => {
    const dateMap = new Map<string, Record<string, number>>();
    snapshots.forEach((s) => {
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

  const runAnalysis = () => {
    setActiveAnalysis(null);
    fetcher.submit({ intent: "run-analysis" }, { method: "post" });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-title">Analytics</h1>
          <p className="text-micro mt-1">Platform performance & AI insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="btn-ghost h-9 px-4 text-[13px] font-medium flex items-center gap-2"
            style={{ borderColor: "rgba(48,209,88,0.3)", color: "#30d158" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
          </button>
          <button
            onClick={() => setShowLogStats(true)}
            className="btn-ghost h-9 px-4 text-[13px] font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Log Stats
          </button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {platformCards.map((p) => {
          const Icon = platformIcons[p.platform];
          return (
            <div key={p.platform} className="card-static p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4" style={{ color: p.color }} />}
                  <span className="text-[13px] font-medium text-[#f5f5f5]">{p.label}</span>
                </div>
                {p.connected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(48,209,88,0.1)", color: "#30d158" }}>Connected</span>
                ) : (
                  <a href={`/auth/${p.platform}`} className="text-[11px] flex items-center gap-1 hover:opacity-80" style={{ color: "#0a84ff" }}>
                    <Link2 className="w-3 h-3" /> Connect
                  </a>
                )}
              </div>
              <p className="text-stat">{formatNumber(p.stats?.followers ?? 0)}</p>
              <p className="text-micro mt-1">followers</p>
              {p.stats?.lastSynced && (
                <p className="text-[10px] text-[rgba(245,245,245,0.2)] mt-2">
                  Synced {new Date(p.stats.lastSynced).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              )}
              {p.topPosts.length > 0 && (
                <div className="mt-3 pt-3 divider">
                  <p className="text-micro mb-1">Top recent content</p>
                  <p className="text-[12px] text-[rgba(245,245,245,0.55)] truncate">{p.topPosts[0].title}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Audience */}
      <div className="card-static p-5 text-center">
        <p className="text-section mb-2">TOTAL AUDIENCE</p>
        <p className="text-stat" style={{ fontSize: "40px" }}>
          {formatNumber(analytics.totalFollowers || platformCards.reduce((s, p) => s + (p.stats?.followers ?? 0), 0))}
        </p>
      </div>

      {/* Follower Growth Chart */}
      <div className="card-static p-5">
        <p className="text-[14px] font-medium text-[#f5f5f5] mb-4">Follower Growth</p>
        {growthData.length < 2 ? (
          <div className="text-center py-12 text-micro">Log at least 2 snapshots to see trends.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              {PLATFORMS.map((p) => (
                <Line key={p} type="monotone" dataKey={p} stroke={chartColors[p]} strokeWidth={2} dot={false} name={PLATFORM_CONFIG[p].label} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Content by Pillar Chart */}
      <div className="card-static p-5">
        <p className="text-[14px] font-medium text-[#f5f5f5] mb-4">Content by Pillar</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={pillarEngagement}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="pillar" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
            <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" name="Posts" radius={[4, 4, 0, 0]}>
              {pillarEngagement.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Goals Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-section">GOALS</h2>
          <button onClick={() => setShowAddGoal(true)} className="btn-ghost h-8 px-3 text-[13px] font-medium flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Goal
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="card-static p-12 text-center">
            <Target className="w-6 h-6 text-[rgba(245,245,245,0.3)] mx-auto mb-2" />
            <p className="text-micro">No goals set yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {goals.map((goal) => {
              const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
              return (
                <div key={goal.id} className="card-static p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-[#f5f5f5]">{PLATFORM_CONFIG[goal.platform].label} — {goal.metric}</span>
                    <span className="text-micro">{goal.month}</span>
                  </div>
                  <div className="flex items-center justify-between text-micro mb-1">
                    <span>{formatNumber(goal.current)}</span>
                    <span>{formatNumber(goal.target)}</span>
                  </div>
                  <div className="w-full bg-[rgba(255,255,255,0.04)] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: "#30d158" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Stats Dialog */}
      {showLogStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLogStats(false)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#f5f5f5]">Log Platform Stats</h2>
              <button onClick={() => setShowLogStats(false)} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
                <X className="w-4 h-4 text-[rgba(245,245,245,0.3)]" />
              </button>
            </div>
            <Form method="post" className="space-y-4" onSubmit={() => setShowLogStats(false)}>
              <input type="hidden" name="intent" value="add-snapshot" />
              <select name="platform" defaultValue="instagram" className="input-field w-full">
                {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}
              </select>
              <input name="followers" type="number" placeholder="Followers" required className="input-field w-full" />
              <input name="views" type="number" placeholder="Views (optional)" className="input-field w-full" />
              <input name="engagementRate" type="number" step="0.01" placeholder="Engagement Rate %" className="input-field w-full" />
              <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">Save</button>
            </Form>
          </div>
        </div>
      )}

      {/* Add Goal Dialog */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddGoal(false)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#f5f5f5]">New Goal</h2>
              <button onClick={() => setShowAddGoal(false)} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
                <X className="w-4 h-4 text-[rgba(245,245,245,0.3)]" />
              </button>
            </div>
            <Form method="post" className="space-y-4" onSubmit={() => setShowAddGoal(false)}>
              <input type="hidden" name="intent" value="add-goal" />
              <select name="platform" defaultValue="instagram" className="input-field w-full">
                {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}
              </select>
              <input name="metric" placeholder="Metric (e.g. Followers)" required className="input-field w-full" />
              <input name="target" type="number" placeholder="Target" required className="input-field w-full" />
              <input name="current" type="number" placeholder="Current" className="input-field w-full" />
              <input name="month" type="month" required className="input-field w-full" />
              <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">Save</button>
            </Form>
          </div>
        </div>
      )}

      {/* AI Analysis Slide-over */}
      {analysisOpen && activeAnalysis && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAnalysisOpen(false)} />
          <div className="relative w-full max-w-[600px] bg-[#1e1e1e] border-l border-[rgba(255,255,255,0.06)] overflow-y-auto">
            <div className="sticky top-0 bg-[#1e1e1e] border-b border-[rgba(255,255,255,0.06)] p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" style={{ color: "#30d158" }} />
                <div>
                  <p className="text-[14px] font-medium text-[#f5f5f5]">AI Analysis</p>
                  <p className="text-micro">{new Date(activeAnalysis.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[13px] font-semibold",
                  activeAnalysis.overallScore >= 7 ? "text-[#30d158]" :
                  activeAnalysis.overallScore >= 4 ? "text-[#ffd60a]" :
                  "text-[#ff453a]"
                )} style={{
                  backgroundColor: activeAnalysis.overallScore >= 7 ? "rgba(48,209,88,0.15)" :
                    activeAnalysis.overallScore >= 4 ? "rgba(255,214,10,0.15)" :
                    "rgba(255,69,58,0.15)"
                }}>
                  {activeAnalysis.overallScore}/10
                </div>
                <button onClick={() => setAnalysisOpen(false)} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
                  <X className="w-4 h-4 text-[rgba(245,245,245,0.3)]" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Score Summary */}
              <div className="rounded-lg bg-[rgba(255,255,255,0.04)] p-4">
                <p className="text-body">{activeAnalysis.scoreSummary}</p>
              </div>

              {/* Weekly Focus */}
              <div className="rounded-lg p-4" style={{ backgroundColor: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-4 h-4" style={{ color: "#30d158" }} />
                  <span className="text-[13px] font-medium" style={{ color: "#30d158" }}>This Week&apos;s Focus</span>
                </div>
                <p className="text-body">{activeAnalysis.weeklyFocus}</p>
              </div>

              {/* What's Working */}
              {activeAnalysis.whatsWorking.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" style={{ color: "#30d158" }} />
                    <span className="text-section" style={{ color: "#30d158" }}>WHAT&apos;S WORKING</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.whatsWorking.map((item, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "rgba(48,209,88,0.04)", border: "1px solid rgba(48,209,88,0.1)" }}>
                        <p className="text-[13px] font-medium text-[#f5f5f5]">{item.insight}</p>
                        <p className="text-micro mt-1">{item.evidence}</p>
                        <p className="text-[12px] mt-1" style={{ color: "#30d158" }}>{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What's Not Working */}
              {activeAnalysis.whatsNotWorking.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4" style={{ color: "#ff9f0a" }} />
                    <span className="text-section" style={{ color: "#ff9f0a" }}>NEEDS IMPROVEMENT</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.whatsNotWorking.map((item, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,159,10,0.04)", border: "1px solid rgba(255,159,10,0.1)" }}>
                        <p className="text-[13px] font-medium text-[#f5f5f5]">{item.insight}</p>
                        <p className="text-micro mt-1">{item.evidence}</p>
                        <p className="text-[12px] mt-1" style={{ color: "#ff9f0a" }}>{item.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Gaps */}
              {activeAnalysis.contentGaps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4" style={{ color: "#bf5af2" }} />
                    <span className="text-section" style={{ color: "#bf5af2" }}>CONTENT GAPS</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.contentGaps.map((item, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "rgba(191,90,242,0.04)", border: "1px solid rgba(191,90,242,0.1)" }}>
                        <p className="text-[13px] font-medium text-[#f5f5f5]">{item.pillar}: {item.gap}</p>
                        <p className="text-[12px] mt-1" style={{ color: "#bf5af2" }}>{item.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {activeAnalysis.topOpportunities && activeAnalysis.topOpportunities.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="w-4 h-4" style={{ color: "#0a84ff" }} />
                    <span className="text-section" style={{ color: "#0a84ff" }}>TOP OPPORTUNITIES</span>
                  </div>
                  <div className="space-y-2">
                    {activeAnalysis.topOpportunities.map((item, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "rgba(10,132,255,0.04)", border: "1px solid rgba(10,132,255,0.1)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[13px] font-medium text-[#f5f5f5]">{item.opportunity}</p>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                            item.priority === "high" ? "text-[#ff453a]" :
                            item.priority === "medium" ? "text-[#ffd60a]" :
                            "text-[rgba(245,245,245,0.3)]"
                          )} style={{
                            backgroundColor: item.priority === "high" ? "rgba(255,69,58,0.15)" :
                              item.priority === "medium" ? "rgba(255,214,10,0.15)" :
                              "rgba(255,255,255,0.04)"
                          }}>{item.priority}</span>
                        </div>
                        <p className="text-micro">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setAnalysisOpen(false); runAnalysis(); }}
                className="btn-ghost w-full h-10 text-[13px] font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
