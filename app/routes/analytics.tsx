import { useLoaderData, Form } from "react-router";
import {
  TrendingUp, Target, Plus
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
import { kvGet, kvAddItem } from "~/lib/kv.server";
import { PLATFORM_CONFIG, PLATFORMS, PILLAR_CONFIG, PILLARS } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import { cn } from "~/lib/utils";
import type { AnalyticsSnapshot, Goal, AtlasMetric, ContentItem, Platform } from "~/lib/types";
import type { Route } from "./+types/analytics";

export function meta() {
  return [{ title: "Analytics — FlyWithGarrett" }];
}

export async function loader() {
  const [snapshots, goals, atlasMetrics, contentItems] = await Promise.all([
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    kvGet<Goal[]>("analytics:goals"),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<ContentItem[]>("content:items"),
  ]);

  return {
    snapshots: snapshots ?? [],
    goals: goals ?? [],
    atlasMetrics: atlasMetrics ?? [],
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
  } else if (intent === "add-atlas-metric") {
    const metric: AtlasMetric = {
      id: generateId(),
      revenue: Number(formData.get("revenue")),
      unitsSold: Number(formData.get("unitsSold") || 0),
      websiteVisits: Number(formData.get("websiteVisits") || 0),
      recordedMonth: formData.get("recordedMonth") as string,
      notes: formData.get("notes") as string || "",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("atlas:metrics", metric);
  }

  return { ok: true };
}

const chartColors: Record<Platform, string> = {
  instagram: "#E1306C",
  tiktok: "#00f2ea",
  youtube: "#FF0000",
  threads: "#000000",
  x: "#1DA1F2",
};

export default function AnalyticsPage() {
  const { snapshots, goals, atlasMetrics, contentItems } = useLoaderData<typeof loader>();

  // Get latest followers per platform
  const latestByPlatform = PLATFORMS.map((p) => {
    const platformSnaps = snapshots.filter((s) => s.platform === p).sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    return { platform: p, ...platformSnaps[0] };
  });

  // Growth chart data — group by date, show followers per platform
  const growthData = (() => {
    const dateMap = new Map<string, Record<string, number>>();
    snapshots.forEach((s) => {
      const date = s.recordedAt.split("T")[0];
      if (!dateMap.has(date)) dateMap.set(date, {});
      const entry = dateMap.get(date)!;
      entry[s.platform] = s.followers;
    });
    return Array.from(dateMap.entries())
      .map(([date, platforms]) => ({ date, ...platforms }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Engagement by pillar
  const pillarEngagement = PILLARS.map((p) => {
    const pillarItems = contentItems.filter((i) => i.pillar === p && i.status === "posted");
    return { pillar: PILLAR_CONFIG[p].label, count: pillarItems.length, color: PILLAR_CONFIG[p].color };
  });

  // Total followers
  const totalFollowers = latestByPlatform.reduce((sum, p) => sum + (p.followers ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track growth across all platforms</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Log Stats</Button>
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
              <Input name="reach" type="number" placeholder="Reach (optional)" />
              <Input name="engagementRate" type="number" step="0.01" placeholder="Engagement Rate % (optional)" />
              <Input name="topPostTitle" placeholder="Top post title (optional)" />
              <DialogClose asChild>
                <Button type="submit" className="w-full">Save</Button>
              </DialogClose>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {latestByPlatform.map(({ platform, followers }) => (
          <Card key={platform}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground capitalize">{PLATFORM_CONFIG[platform].label}</p>
              <p className="text-xl font-bold mt-1">{formatNumber(followers ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Audience</p>
          <p className="text-3xl font-bold mt-1">{formatNumber(totalFollowers)}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="growth">
        <TabsList>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="pillars">Pillars</TabsTrigger>
          <TabsTrigger value="atlas">Atlas</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        {/* Growth Chart */}
        <TabsContent value="growth">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Follower Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              {growthData.length < 2 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Log at least 2 snapshots to see growth trends.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1E293B", borderRadius: "8px" }} />
                    <Legend />
                    {PLATFORMS.map((p) => (
                      <Line key={p} type="monotone" dataKey={p} stroke={chartColors[p]} strokeWidth={2} dot={false} name={PLATFORM_CONFIG[p].label} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pillar Performance */}
        <TabsContent value="pillars">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content by Pillar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pillarEngagement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="pillar" stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1E293B", borderRadius: "8px" }} />
                  <Bar dataKey="count" name="Posts" radius={[4, 4, 0, 0]}>
                    {pillarEngagement.map((entry, i) => (
                      <rect key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Atlas Metrics */}
        <TabsContent value="atlas">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Log Atlas</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Atlas Metrics</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-atlas-metric" />
                  <Input name="recordedMonth" type="month" required />
                  <Input name="revenue" type="number" placeholder="Revenue ($)" required />
                  <Input name="unitsSold" type="number" placeholder="Units Sold" />
                  <Input name="websiteVisits" type="number" placeholder="Website Visits" />
                  <Input name="notes" placeholder="Notes (optional)" />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atlas Hydration Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {atlasMetrics.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No Atlas metrics logged yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={atlasMetrics.sort((a, b) => a.recordedMonth.localeCompare(b.recordedMonth))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="recordedMonth" stroke="#64748B" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748B" />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1E293B", borderRadius: "8px" }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals */}
        <TabsContent value="goals">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Goal</Button>
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
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {goals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              No goals set yet. Set monthly targets to track progress.
            </CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
                return (
                  <Card key={goal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{PLATFORM_CONFIG[goal.platform].label} — {goal.metric}</span>
                        <span className="text-xs text-muted-foreground">{goal.month}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{formatNumber(goal.current)}</span>
                        <span>{formatNumber(goal.target)}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% complete</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
