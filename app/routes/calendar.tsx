import { useState } from "react";
import { useLoaderData, Form, useSubmit } from "react-router";
import {
  ChevronLeft, ChevronRight, Plus,
  Camera, Play, Music2, X,
} from "lucide-react";
import { kvGet, kvAddItem, kvUpdateItem, kvDeleteItem } from "~/lib/kv.server";
import { PILLAR_CONFIG, STATUS_CONFIG, PLATFORMS, PILLARS, WEEKLY_CADENCE, PLATFORM_CONFIG } from "~/lib/constants";
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
  const [view, setView] = useState<"month" | "week">("month");
  const [showCreate, setShowCreate] = useState(false);

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
          <h1 className="text-title">Content Calendar</h1>
          <p className="text-micro mt-1">{filteredItems.length} content items</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterPillar}
            onChange={(e) => setFilterPillar(e.target.value)}
            className="input-field h-9 text-[13px] px-3"
          >
            <option value="all">All Pillars</option>
            {PILLARS.map((p) => (
              <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field h-9 text-[13px] px-3"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary h-9 px-4 text-[13px] font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Content
          </button>
        </div>
      </div>

      {/* View Toggle + Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-[10px] bg-[rgba(0,0,0,0.03)] p-1">
          <button
            onClick={() => setView("month")}
            className={cn(
              "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors",
              view === "month" ? "bg-[rgba(0,0,0,0.05)] text-[#1d1d1f]" : "text-[#aeaeb2] hover:text-[#1d1d1f]"
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView("week")}
            className={cn(
              "px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors",
              view === "week" ? "bg-[rgba(0,0,0,0.05)] text-[#1d1d1f]" : "text-[#aeaeb2] hover:text-[#1d1d1f]"
            )}
          >
            Week
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="btn-ghost p-2">
            <ChevronLeft className="w-4 h-4 text-[#1d1d1f]" />
          </button>
          <span className="text-section">{monthName.toUpperCase()}</span>
          <button onClick={() => navigateMonth(1)} className="btn-ghost p-2">
            <ChevronRight className="w-4 h-4 text-[#1d1d1f]" />
          </button>
        </div>
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="grid grid-cols-7 gap-px rounded-2xl overflow-hidden" style={{ backgroundColor: "transparent" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-[#f5f5f7] p-2 text-center text-micro">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[100px] p-1" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayItems = getItemsForDay(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const dow = new Date(year, month, day).getDay();
            const cadence = WEEKLY_CADENCE[dow];

            return (
              <div
                key={day}
                className={cn(
                  "card-static min-h-[100px] p-1.5 !rounded-none",
                  isToday && "ring-1 ring-black/10 ring-inset"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[11px] font-medium", isToday ? "text-[#1d1d1f]" : "text-[#aeaeb2]")}>{day}</span>
                  {cadence && (
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: PILLAR_CONFIG[cadence.pillar].color }}
                    >
                      {PILLAR_CONFIG[cadence.pillar].label.split("/")[0].substring(0, 3)}
                    </span>
                  )}
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
                    <span className="text-[10px] text-[#aeaeb2] px-1">+{dayItems.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
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
                  "card-static",
                  isToday && "ring-1 ring-black/10"
                )}
              >
                <div className="p-3 pb-1">
                  <div className="text-micro">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className={cn("text-sm font-semibold", isToday ? "text-[#1d1d1f]" : "text-[#86868b]")}>
                    {day.getDate()}
                  </div>
                  {cadence && (
                    <span
                      className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${PILLAR_CONFIG[cadence.pillar].color}20`,
                        color: PILLAR_CONFIG[cadence.pillar].color,
                      }}
                    >
                      {cadence.label}
                    </span>
                  )}
                </div>
                <div className="p-3 pt-0 space-y-2">
                  {dayItems.length === 0 ? (
                    <p className="text-micro text-center py-4">Empty</p>
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
                            return Icon ? <Icon key={p} className="w-3 h-3 text-[#aeaeb2]" /> : null;
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
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#1d1d1f]">New Content Item</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded">
                <X className="w-4 h-4 text-[#aeaeb2]" />
              </button>
            </div>
            <Form method="post" className="space-y-4" onSubmit={() => setShowCreate(false)}>
              <input type="hidden" name="intent" value="create" />
              <input name="title" placeholder="Content title" required className="input-field w-full" />
              <select name="pillar" defaultValue="lifestyle" className="input-field w-full">
                {PILLARS.map((p) => (
                  <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
                ))}
              </select>
              <div>
                <label className="text-micro mb-2 block">Platforms</label>
                <div className="flex flex-wrap gap-3">
                  {PLATFORMS.map((p) => {
                    const Icon = platformIcons[p];
                    return (
                      <label key={p} className="flex items-center gap-1.5 text-[13px] text-[#86868b]">
                        <input type="checkbox" name="platforms" value={p} defaultChecked={p === "instagram"} className="rounded" />
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {PLATFORM_CONFIG[p].label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <select name="status" defaultValue="idea" className="input-field w-full">
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <input name="scheduledAt" type="datetime-local" className="input-field w-full" />
              <textarea name="hook" placeholder="Hook text" rows={2} className="input-field w-full" />
              <textarea name="notes" placeholder="Notes" rows={2} className="input-field w-full" />
              <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">
                Create
              </button>
            </Form>
          </div>
        </div>
      )}

      {/* Item Detail Dialog */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedItem(null)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-medium text-[#1d1d1f]">{selectedItem.title}</h2>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-[rgba(0,0,0,0.05)] rounded">
                <X className="w-4 h-4 text-[#aeaeb2]" />
              </button>
            </div>
            <div className="space-y-4">
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
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: `${STATUS_CONFIG[selectedItem.status].color}20`,
                    color: STATUS_CONFIG[selectedItem.status].color,
                  }}
                >
                  {STATUS_CONFIG[selectedItem.status].label}
                </span>
              </div>
              {selectedItem.hook && (
                <div>
                  <p className="text-micro mb-1">Hook</p>
                  <p className="text-body text-sm">{selectedItem.hook}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <p className="text-micro">Platforms:</p>
                {selectedItem.platforms.map((p) => {
                  const Icon = platformIcons[p];
                  return (
                    <span key={p} className="flex items-center gap-1 text-xs text-[#86868b]">
                      {Icon && <Icon className="w-3 h-3" />}
                      {PLATFORM_CONFIG[p].label}
                    </span>
                  );
                })}
              </div>
              <div className="divider" />
              <div className="flex gap-2">
                <Form method="post" className="flex-1">
                  <input type="hidden" name="intent" value="update-status" />
                  <input type="hidden" name="id" value={selectedItem.id} />
                  <select
                    name="status"
                    defaultValue={selectedItem.status}
                    className="input-field w-full"
                    onChange={(e) => {
                      const form = e.target.closest("form");
                      if (form) submit(form);
                      setSelectedItem(null);
                    }}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="id" value={selectedItem.id} />
                  <button
                    type="submit"
                    onClick={() => setSelectedItem(null)}
                    className="h-10 px-4 text-[13px] font-medium rounded-[10px] bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20 hover:bg-[#ff453a]/20 transition-colors"
                  >
                    Delete
                  </button>
                </Form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
