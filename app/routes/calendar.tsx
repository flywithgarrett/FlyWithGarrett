import { useState } from "react";
import { useLoaderData, Form, useSubmit } from "react-router";
import {
  ChevronLeft, ChevronRight, Plus,
  Camera, Play, Music2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { kvGet, kvAddItem, kvUpdateItem, kvDeleteItem } from "~/lib/kv.server";
import { PILLAR_CONFIG, STATUS_CONFIG, PLATFORMS, PILLARS, WEEKLY_CADENCE } from "~/lib/constants";
import { cn, generateId } from "~/lib/utils";
import type { ContentItem, Pillar, Platform, ContentStatus } from "~/lib/types";
import type { Route } from "./+types/calendar";

export function meta() {
  return [{ title: "Content Calendar — FlyWithGarrett" }];
}

export async function loader() {
  const items = await kvGet<ContentItem[]>("content:items") ?? [];
  return { items };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const platforms = formData.getAll("platforms") as Platform[];
    const item: ContentItem = {
      id: generateId(),
      title: formData.get("title") as string,
      pillar: formData.get("pillar") as Pillar,
      platforms: platforms.length > 0 ? platforms : ["instagram"],
      status: formData.get("status") as ContentStatus || "idea",
      hook: formData.get("hook") as string || "",
      caption: "",
      hashtags: [],
      scheduledAt: formData.get("scheduledAt") as string || null,
      postedAt: null,
      notes: formData.get("notes") as string || "",
      seriesId: null,
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("content:items", item);
  } else if (intent === "update-status") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as ContentStatus;
    await kvUpdateItem<ContentItem>("content:items", id, {
      status,
      ...(status === "posted" ? { postedAt: new Date().toISOString() } : {}),
    });
  } else if (intent === "reschedule") {
    const id = formData.get("id") as string;
    const scheduledAt = formData.get("scheduledAt") as string;
    await kvUpdateItem<ContentItem>("content:items", id, { scheduledAt });
  } else if (intent === "delete") {
    const id = formData.get("id") as string;
    await kvDeleteItem<ContentItem>("content:items", id);
  }

  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  youtube: Play,
  tiktok: Music2,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { items } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const filteredItems = items.filter((item) => {
    if (filterPillar !== "all" && item.pillar !== filterPillar) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  const getItemsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredItems.filter((item) => item.scheduledAt?.startsWith(dateStr));
  };

  const navigateMonth = (delta: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + delta);
    setCurrentDate(next);
  };

  // Week view
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-title text-white">Content Calendar</h1>
          <p className="text-sm text-[#71717A] mt-1">{filteredItems.length} content items</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filterPillar}
            onChange={(e) => setFilterPillar(e.target.value)}
            className="w-36 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white"
          >
            <option value="all">All Pillars</option>
            {PILLARS.map((p) => (
              <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
            ))}
          </Select>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-32 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-white text-[#08090A] hover:bg-white/90">
                <Plus className="w-4 h-4" /> New Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <DialogHeader>
                <DialogTitle className="text-white">New Content Item</DialogTitle>
              </DialogHeader>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create" />
                <Input name="title" placeholder="Content title" required className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                <Select name="pillar" defaultValue="lifestyle" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white">
                  {PILLARS.map((p) => (
                    <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
                  ))}
                </Select>
                <div>
                  <label className="text-sm text-[#71717A] mb-1 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm text-[#A1A1AA]">
                        <input type="checkbox" name="platforms" value={p} defaultChecked={p === "instagram"} className="rounded" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <Select name="status" defaultValue="idea" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white">
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </Select>
                <Input name="scheduledAt" type="datetime-local" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white" />
                <Textarea name="hook" placeholder="Hook text" rows={2} className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                <Textarea name="notes" placeholder="Notes" rows={2} className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                <DialogClose asChild>
                  <Button type="submit" className="w-full bg-white text-[#08090A] hover:bg-white/90">Create</Button>
                </DialogClose>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="month">
        <TabsList className="bg-white/[0.06] border border-[rgba(255,255,255,0.06)]">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-lg bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-section text-white">{monthName}</h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-lg bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-[#111213] p-2 text-center text-xs font-medium text-[#71717A]">
                {d}
              </div>
            ))}
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-[#08090A] min-h-[100px] p-1" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = getItemsForDay(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const dow = new Date(year, month, day).getDay();
              const cadence = WEEKLY_CADENCE[dow];

              return (
                <div key={day} className={cn("bg-[#111213] min-h-[100px] p-1.5", isToday && "ring-1 ring-white/20 ring-inset")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-medium", isToday ? "text-white" : "text-[#71717A]")}>{day}</span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: PILLAR_CONFIG[cadence.pillar].color }}
                    >
                      {PILLAR_CONFIG[cadence.pillar].label.split("/")[0].substring(0, 3)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate cursor-pointer font-medium"
                        style={{
                          backgroundColor: `${PILLAR_CONFIG[item.pillar].color}20`,
                          color: PILLAR_CONFIG[item.pillar].color,
                        }}
                      >
                        {item.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-[#71717A] px-1">+{dayItems.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="week">
          <div className="grid grid-cols-7 gap-3">
            {getWeekDays().map((day) => {
              const dateStr = day.toISOString().split("T")[0];
              const dayItems = filteredItems.filter((item) => item.scheduledAt?.startsWith(dateStr));
              const isToday = dateStr === new Date().toISOString().split("T")[0];
              const dow = day.getDay();
              const cadence = WEEKLY_CADENCE[dow];

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "rounded-xl bg-[#111213] border border-[rgba(255,255,255,0.06)]",
                    isToday && "ring-1 ring-white/20"
                  )}
                >
                  <div className="p-3 pb-1">
                    <div className="text-xs text-[#71717A]">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className={cn("text-sm font-semibold", isToday ? "text-white" : "text-[#A1A1AA]")}>
                      {day.getDate()}
                    </div>
                    <span
                      className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${PILLAR_CONFIG[cadence.pillar].color}20`,
                        color: PILLAR_CONFIG[cadence.pillar].color,
                      }}
                    >
                      {PILLAR_CONFIG[cadence.pillar].label}
                    </span>
                  </div>
                  <div className="p-3 pt-0 space-y-2">
                    {dayItems.length === 0 ? (
                      <p className="text-xs text-[#71717A] text-center py-4">Empty</p>
                    ) : (
                      dayItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="w-full text-left text-xs p-2 rounded-lg cursor-pointer"
                          style={{ backgroundColor: `${PILLAR_CONFIG[item.pillar].color}15` }}
                        >
                          <p className="font-medium truncate" style={{ color: PILLAR_CONFIG[item.pillar].color }}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {item.platforms.map((p) => {
                              const Icon = platformIcons[p];
                              return Icon ? <Icon key={p} className="w-3 h-3 text-[#71717A]" /> : null;
                            })}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">{selectedItem.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: `${PILLAR_CONFIG[selectedItem.pillar].color}20`,
                      color: PILLAR_CONFIG[selectedItem.pillar].color,
                    }}
                  >
                    {PILLAR_CONFIG[selectedItem.pillar].label}
                  </span>
                  <Badge className={cn(STATUS_CONFIG[selectedItem.status].color)}>
                    {STATUS_CONFIG[selectedItem.status].label}
                  </Badge>
                </div>
                {selectedItem.hook && (
                  <div>
                    <p className="text-xs text-[#71717A] mb-1">Hook</p>
                    <p className="text-sm text-[#A1A1AA]">{selectedItem.hook}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[#71717A]">Platforms:</p>
                  {selectedItem.platforms.map((p) => (
                    <span key={p} className="text-xs capitalize text-[#A1A1AA]">{p}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Form method="post" className="flex-1">
                    <input type="hidden" name="intent" value="update-status" />
                    <input type="hidden" name="id" value={selectedItem.id} />
                    <Select
                      name="status"
                      defaultValue={selectedItem.status}
                      className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white"
                      onChange={(e) => {
                        const form = e.target.closest("form");
                        if (form) submit(form);
                        setSelectedItem(null);
                      }}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </Select>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={selectedItem.id} />
                    <Button variant="destructive" size="sm" type="submit" onClick={() => setSelectedItem(null)}>
                      Delete
                    </Button>
                  </Form>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
