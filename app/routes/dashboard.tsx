import { useLoaderData, Form, useSubmit } from "react-router";
import {
  Plane, Camera, Play, AtSign, Music2, MessageCircle,
  Flame, Target, Plus, Droplets, Smartphone, TrendingUp,
  Calendar, MapPin, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { kvGet, kvAddItem } from "~/lib/kv.server";
import { PILLAR_CONFIG, WEEKLY_CADENCE, PLATFORM_CONFIG } from "~/lib/constants";
import { formatNumber, generateId } from "~/lib/utils";
import { cn } from "~/lib/utils";
import type { ContentItem, AnalyticsSnapshot, Idea, AtlasMetric, ContentSeries } from "~/lib/types";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [{ title: "Command Center — FlyWithGarrett" }];
}

export async function loader() {
  const [contentItems, snapshots, ideas, atlasMetrics, series] = await Promise.all([
    kvGet<ContentItem[]>("content:items"),
    kvGet<AnalyticsSnapshot[]>("analytics:snapshots"),
    kvGet<Idea[]>("ideas:bank"),
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<ContentSeries[]>("content:series"),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();
  const todayCadence = WEEKLY_CADENCE[todayDow];

  // Calculate streak
  const postedItems = (contentItems ?? []).filter((i) => i.status === "posted" && i.postedAt);
  const streak = calculateStreak(postedItems);

  // This week's stats
  const startOfWeek = getStartOfWeek(new Date());
  const weekItems = (contentItems ?? []).filter((i) => {
    const d = i.scheduledAt ? new Date(i.scheduledAt) : null;
    return d && d >= startOfWeek;
  });
  const weekPlanned = weekItems.length;
  const weekPosted = weekItems.filter((i) => i.status === "posted").length;

  // Today's content
  const todayContent = (contentItems ?? []).filter((i) => {
    return i.scheduledAt?.startsWith(today);
  });

  // Latest followers per platform
  const latestFollowers = getLatestFollowers(snapshots ?? []);

  // Latest Atlas metrics
  const latestAtlas = (atlasMetrics ?? []).sort(
    (a, b) => new Date(b.recordedMonth).getTime() - new Date(a.recordedMonth).getTime()
  )[0] ?? null;

  return {
    todayContent,
    todayCadence,
    streak,
    weekPlanned,
    weekPosted,
    latestFollowers,
    latestAtlas,
    ideasCount: (ideas ?? []).length,
    seriesCount: (series ?? []).length,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add-idea") {
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
  if (items.length === 0) return 0;
  const dates = [...new Set(items.map((i) => i.postedAt!.split("T")[0]))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toISOString().split("T")[0]) {
      streak++;
    } else break;
  }
  return streak;
}

function getStartOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getLatestFollowers(snapshots: AnalyticsSnapshot[]) {
  const platforms = ["instagram", "tiktok", "youtube", "threads", "x"] as const;
  return platforms.map((p) => {
    const latest = snapshots
      .filter((s) => s.platform === p)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return { platform: p, followers: latest?.followers ?? 0 };
  });
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  tiktok: Music2,
  youtube: Play,
  threads: AtSign,
  x: MessageCircle,
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const weekProgress = data.weekPlanned > 0 ? (data.weekPosted / data.weekPlanned) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" — "}
            <span className={cn(PILLAR_CONFIG[data.todayCadence.pillar].textColor)}>
              {data.todayCadence.label}
            </span>
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Quick Idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Capture Idea</DialogTitle>
            </DialogHeader>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="add-idea" />
              <Input name="title" placeholder="Idea title" required />
              <Select name="pillar" defaultValue="aviation">
                {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </Select>
              <Textarea name="hookDraft" placeholder="Hook draft (optional)" rows={3} />
              <Button type="submit" className="w-full">Save Idea</Button>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.weekPosted}/{data.weekPlanned}</p>
              <p className="text-xs text-muted-foreground">Weekly Posts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.ideasCount}</p>
              <p className="text-xs text-muted-foreground">Ideas Banked</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="w-full bg-secondary rounded-full h-2 mb-1">
                <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${weekProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(weekProgress)}% Weekly Goal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Agenda */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Today's Agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.todayContent.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No content scheduled for today.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Today's cadence: <span className={cn(PILLAR_CONFIG[data.todayCadence.pillar].textColor)}>{data.todayCadence.label}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todayContent.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className={cn("w-2 h-2 rounded-full")} style={{ backgroundColor: PILLAR_CONFIG[item.pillar].color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={cn("text-xs", PILLAR_CONFIG[item.pillar].bgColor, PILLAR_CONFIG[item.pillar].textColor)}>
                          {PILLAR_CONFIG[item.pillar].label}
                        </Badge>
                        {item.platforms.map((p) => {
                          const Icon = platformIcons[p];
                          return Icon ? <Icon key={p} className="w-3.5 h-3.5 text-muted-foreground" /> : null;
                        })}
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn("text-xs", item.status === "posted" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Followers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Followers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.latestFollowers.map(({ platform, followers }) => {
                const Icon = platformIcons[platform];
                return (
                  <div key={platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm capitalize">{PLATFORM_CONFIG[platform].label}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatNumber(followers)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Building */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emerald-400" />
              Atlas Hydration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Products</span>
                <span className="text-sm font-medium">4 Flavors</span>
              </div>
              {data.latestAtlas && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Revenue (latest)</span>
                    <span className="text-sm font-medium">${data.latestAtlas.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Units Sold</span>
                    <span className="text-sm font-medium">{data.latestAtlas.unitsSold.toLocaleString()}</span>
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">Clean, zero-sugar, vitamin-infused electrolytes. Clean water mission.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              SkyWay App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">In Development</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phase</span>
                <span className="text-sm font-medium">Building MVP</span>
              </div>
              <p className="text-xs text-muted-foreground">Pilot lifestyle planning app. Scheduling, trips, and crew coordination.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Travel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            Upcoming Flights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Plane className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming flights logged yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add flights from the Business Hub.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
