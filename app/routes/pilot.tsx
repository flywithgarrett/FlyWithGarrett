import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  Plane, ChevronLeft, ChevronRight, Plus, X, Trash2,
  Clock, MapPin, Calendar,
} from "lucide-react";
import { kvGet, kvAddItem, kvDeleteItem } from "~/lib/kv.server";
import { generateId } from "~/lib/utils";
import type { Route } from "./+types/pilot";

interface ScheduleEntry {
  id: string;
  date: string;
  type: "Line Flying" | "Reserve" | "Day Off" | "Training" | "Vacation";
  departure?: string;
  destination?: string;
  departureTime?: string;
  returnTime?: string;
  layoverCity?: string;
  reserveType?: "Short Call" | "Long Call";
  reserveWindow?: string;
}

const TYPE_COLORS: Record<string, string> = {
  "Line Flying": "#007aff",
  Reserve: "#ff9f0a",
  "Day Off": "#8e8e93",
  Training: "#ff6723",
  Vacation: "#34c759",
};

export function meta() {
  return [{ title: "Flight Schedule — FlyWithGarrett" }];
}

export async function loader() {
  const schedule = (await kvGet<ScheduleEntry[]>("pilot:schedule")) ?? [];
  return { schedule };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-entry") {
    const entry: ScheduleEntry = {
      id: generateId(),
      date: formData.get("date") as string,
      type: formData.get("type") as ScheduleEntry["type"],
      departure: (formData.get("departure") as string) || undefined,
      destination: (formData.get("destination") as string) || undefined,
      departureTime: (formData.get("departureTime") as string) || undefined,
      returnTime: (formData.get("returnTime") as string) || undefined,
      layoverCity: (formData.get("layoverCity") as string) || undefined,
      reserveType: (formData.get("reserveType") as ScheduleEntry["reserveType"]) || undefined,
      reserveWindow: (formData.get("reserveWindow") as string) || undefined,
    };
    await kvAddItem("pilot:schedule", entry);
  } else if (intent === "delete-entry") {
    const id = formData.get("id") as string;
    await kvDeleteItem<ScheduleEntry>("pilot:schedule", id);
  }

  return { ok: true };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function PilotSchedule() {
  const { schedule } = useLoaderData<typeof loader>();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<ScheduleEntry["type"]>("Line Flying");

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthEntries = schedule.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  const daysOff = monthEntries.filter((e) => e.type === "Day Off").length;

  const today = now.toISOString().split("T")[0];
  const nextTrip = schedule
    .filter((e) => e.type === "Line Flying" && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const entriesByDate = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEntries.filter((e) => e.date === dateStr);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-title">Flight Schedule</p>
        <p className="text-[14px] text-[rgba(245,245,245,0.55)] mt-1">Track your monthly flying schedule</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-static">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Days Off This Month</p>
          <p className="text-stat mt-1">{daysOff}</p>
        </div>
        <div className="card-static">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Next Trip</p>
          {nextTrip ? (
            <div className="mt-1">
              <p className="text-[15px] font-semibold text-[#f5f5f5]">
                {nextTrip.departure} → {nextTrip.destination}
              </p>
              <p className="text-[12px] text-[rgba(245,245,245,0.55)]">
                {new Date(nextTrip.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ) : (
            <p className="text-[14px] text-[rgba(245,245,245,0.3)] mt-1">No upcoming trips</p>
          )}
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[12px] text-[rgba(245,245,245,0.55)]">{type}</span>
          </div>
        ))}
      </div>

      {/* Calendar Navigation */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="btn-ghost p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-section">{monthLabel}</p>
          <button onClick={nextMonth} className="btn-ghost p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-[rgba(245,245,245,0.3)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const entries = entriesByDate(day);
            const isToday =
              day === now.getDate() &&
              viewMonth === now.getMonth() &&
              viewYear === now.getFullYear();
            return (
              <div
                key={day}
                className={`h-16 rounded-[10px] p-1 ${
                  isToday ? "bg-[#007aff10] ring-1 ring-[#007aff30]" : "bg-[#1e1e1e]"
                }`}
              >
                <p className={`text-[11px] font-medium ${isToday ? "text-[#007aff]" : "text-[#f5f5f5]"}`}>
                  {day}
                </p>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {entries.map((e) => (
                    <span
                      key={e.id}
                      className="w-full h-1.5 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[e.type] }}
                      title={e.type}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Entries for This Month */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Entries This Month</p>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-[13px] flex items-center gap-1.5">
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Cancel" : "Add Entry"}
          </button>
        </div>

        {/* Add Entry Form */}
        {showForm && (
          <Form method="post" className="card-static mb-4 space-y-4">
            <input type="hidden" name="intent" value="add-entry" />

            <div>
              <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Date</label>
              <input type="date" name="date" required className="input-field" />
            </div>

            <div>
              <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {(["Line Flying", "Reserve", "Day Off", "Training", "Vacation"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`pill text-[12px] ${
                      selectedType === t
                        ? "!bg-[#262626] !text-[#f5f5f5]"
                        : ""
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full mr-1.5 inline-block" style={{ backgroundColor: TYPE_COLORS[t] }} />
                    {t}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={selectedType} />
            </div>

            {/* Line Flying fields */}
            {selectedType === "Line Flying" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Departure City</label>
                    <input type="text" name="departure" placeholder="e.g. JFK" className="input-field" />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Destination</label>
                    <input type="text" name="destination" placeholder="e.g. LAX" className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Departure Time</label>
                    <input type="time" name="departureTime" className="input-field" />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Return Time</label>
                    <input type="time" name="returnTime" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Layover City</label>
                  <input type="text" name="layoverCity" placeholder="Optional" className="input-field" />
                </div>
              </div>
            )}

            {/* Reserve fields */}
            {selectedType === "Reserve" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Reserve Type</label>
                  <select name="reserveType" className="input-field">
                    <option value="Short Call">Short Call</option>
                    <option value="Long Call">Long Call</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">Window (e.g. 05:00-17:00)</label>
                  <input type="text" name="reserveWindow" placeholder="05:00-17:00" className="input-field" />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary text-[13px] w-full">
              Add Schedule Entry
            </button>
          </Form>
        )}

        {/* Entry List */}
        <div className="space-y-2">
          {monthEntries
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((entry) => (
              <div key={entry.id} className="card-static flex items-center gap-3">
                <div
                  className="w-1.5 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[entry.type] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[#f5f5f5]">{entry.type}</p>
                    <span className="text-[12px] text-[rgba(245,245,245,0.3)]">
                      {new Date(entry.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {entry.type === "Line Flying" && entry.departure && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-[rgba(245,245,245,0.55)]" />
                      <span className="text-[12px] text-[rgba(245,245,245,0.55)]">
                        {entry.departure} → {entry.destination}
                        {entry.layoverCity ? ` (via ${entry.layoverCity})` : ""}
                      </span>
                      {entry.departureTime && (
                        <>
                          <Clock className="w-3 h-3 text-[rgba(245,245,245,0.55)] ml-2" />
                          <span className="text-[12px] text-[rgba(245,245,245,0.55)]">
                            {entry.departureTime} - {entry.returnTime}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {entry.type === "Reserve" && entry.reserveType && (
                    <p className="text-[12px] text-[rgba(245,245,245,0.55)] mt-0.5">
                      {entry.reserveType} · {entry.reserveWindow}
                    </p>
                  )}
                </div>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete-entry" />
                  <input type="hidden" name="id" value={entry.id} />
                  <button type="submit" className="btn-ghost p-1.5 text-[rgba(245,245,245,0.3)] hover:text-[#ff3b30]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Form>
              </div>
            ))}
          {monthEntries.length === 0 && (
            <div className="card-static text-center py-8">
              <Calendar className="w-8 h-8 text-[rgba(245,245,245,0.3)] mx-auto mb-2" />
              <p className="text-[14px] text-[rgba(245,245,245,0.55)]">No entries for {monthLabel}</p>
              <p className="text-[12px] text-[rgba(245,245,245,0.3)] mt-1">Add your schedule above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
