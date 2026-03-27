import { useState } from "react";
import { useLoaderData, Form, useSubmit } from "react-router";
import {
  ChevronLeft, ChevronRight, Plus,
  Camera, Play, AtSign, Music2, MessageCircle,
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
  tiktok: Music2,
  youtube: Play,
  threads: AtSign,
  x: MessageCircle,
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
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredItems.length} content items</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="w-36">
            <option value="all">All Pillars</option>
            {PILLARS.map((p) => (
              <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
            ))}
          </Select>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-32">
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> New Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Content Item</DialogTitle>
              </DialogHeader>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create" />
                <Input name="title" placeholder="Content title" required />
                <Select name="pillar" defaultValue="aviation">
                  {PILLARS.map((p) => (
                    <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
                  ))}
                </Select>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" name="platforms" value={p} defaultChecked={p === "instagram"} className="rounded" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <Select name="status" defaultValue="idea">
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </Select>
                <Input name="scheduledAt" type="datetime-local" />
                <Textarea name="hook" placeholder="Hook text" rows={2} />
                <Textarea name="notes" placeholder="Notes" rows={2} />
                <DialogClose asChild>
                  <Button type="submit" className="w-full">Create</Button>
                </DialogClose>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="month">
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-card p-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card/50 min-h-[100px] p-1" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = getItemsForDay(day);
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const dow = new Date(year, month, day).getDay();
              const cadence = WEEKLY_CADENCE[dow];

              return (
                <div key={day} className={cn("bg-card min-h-[100px] p-1.5", isToday && "ring-1 ring-primary ring-inset")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{day}</span>
                    <span className={cn("text-[10px]", PILLAR_CONFIG[cadence.pillar].textColor)}>
                      {PILLAR_CONFIG[cadence.pillar].label.split("/")[0].substring(0, 3)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          "w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate cursor-pointer",
                          PILLAR_CONFIG[item.pillar].bgColor,
                          PILLAR_CONFIG[item.pillar].textColor
                        )}
                      >
                        {item.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</span>
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
                <Card key={dateStr} className={cn(isToday && "ring-1 ring-primary")}>
                  <CardHeader className="p-3 pb-1">
                    <div className="text-xs text-muted-foreground">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className={cn("text-sm font-semibold", isToday && "text-primary")}>
                      {day.getDate()}
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] w-fit", PILLAR_CONFIG[cadence.pillar].bgColor, PILLAR_CONFIG[cadence.pillar].textColor)}>
                      {PILLAR_CONFIG[cadence.pillar].label}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {dayItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Empty</p>
                    ) : (
                      dayItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={cn(
                            "w-full text-left text-xs p-2 rounded-lg cursor-pointer",
                            PILLAR_CONFIG[item.pillar].bgColor
                          )}
                        >
                          <p className={cn("font-medium truncate", PILLAR_CONFIG[item.pillar].textColor)}>{item.title}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {item.platforms.map((p) => {
                              const Icon = platformIcons[p];
                              return Icon ? <Icon key={p} className="w-3 h-3 text-muted-foreground" /> : null;
                            })}
                          </div>
                        </button>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent>
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={cn(PILLAR_CONFIG[selectedItem.pillar].bgColor, PILLAR_CONFIG[selectedItem.pillar].textColor)}>
                    {PILLAR_CONFIG[selectedItem.pillar].label}
                  </Badge>
                  <Badge className={cn(STATUS_CONFIG[selectedItem.status].color)}>
                    {STATUS_CONFIG[selectedItem.status].label}
                  </Badge>
                </div>
                {selectedItem.hook && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Hook</p>
                    <p className="text-sm">{selectedItem.hook}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Platforms:</p>
                  {selectedItem.platforms.map((p) => (
                    <span key={p} className="text-xs capitalize">{p}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Form method="post" className="flex-1">
                    <input type="hidden" name="intent" value="update-status" />
                    <input type="hidden" name="id" value={selectedItem.id} />
                    <Select name="status" defaultValue={selectedItem.status} onChange={(e) => {
                      const form = e.target.closest("form");
                      if (form) submit(form);
                      setSelectedItem(null);
                    }}>
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
