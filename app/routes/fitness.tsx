import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  Dumbbell, Check, Plus, X, Moon, Sun, Zap,
  Scale, BedDouble, Battery,
} from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { generateId } from "~/lib/utils";
import type { Route } from "./+types/fitness";

interface WorkoutDay {
  day: string;
  name: string;
  duration: string;
  muscles: string;
}

interface WorkoutLog {
  id: string;
  day: string;
  name: string;
  completedAt: string;
}

interface BiometricEntry {
  id: string;
  date: string;
  weight: number;
  sleepHours: number;
  energy: number;
  createdAt: string;
}

const DEFAULT_PLAN: WorkoutDay[] = [
  { day: "Monday", name: "Push", duration: "60 min", muscles: "Chest, Shoulders, Triceps" },
  { day: "Tuesday", name: "Pull", duration: "60 min", muscles: "Back, Biceps, Rear Delts" },
  { day: "Wednesday", name: "Legs", duration: "55 min", muscles: "Quads, Hamstrings, Glutes, Calves" },
  { day: "Thursday", name: "Push", duration: "60 min", muscles: "Chest, Shoulders, Triceps" },
  { day: "Friday", name: "Pull", duration: "60 min", muscles: "Back, Biceps, Rear Delts" },
  { day: "Saturday", name: "Paddle / Active", duration: "45 min", muscles: "Core, Shoulders, Cardio" },
  { day: "Sunday", name: "Rest", duration: "—", muscles: "Recovery & Stretching" },
];

const SUPPLEMENT_STACK = [
  {
    time: "Morning",
    icon: Sun,
    color: "#ff9f0a",
    items: ["Atlas electrolytes", "Creatine (5g)", "Vitamin D (5000 IU)"],
  },
  {
    time: "Pre-workout",
    icon: Zap,
    color: "#ff375f",
    items: ["Pre-workout blend", "Atlas hydration"],
  },
  {
    time: "Post-workout",
    icon: Dumbbell,
    color: "#007aff",
    items: ["Protein shake (30g)", "Atlas recovery"],
  },
  {
    time: "Evening",
    icon: Moon,
    color: "#bf5af2",
    items: ["Magnesium (400mg)", "Omega-3 (2g)"],
  },
];

const DAY_COLORS: Record<string, string> = {
  Push: "#007aff",
  Pull: "#bf5af2",
  Legs: "#ff6723",
  "Paddle / Active": "#5ac8fa",
  Rest: "#8e8e93",
};

export function meta() {
  return [{ title: "Fitness — FlyWithGarrett" }];
}

export async function loader() {
  let plan = await kvGet<WorkoutDay[]>("fitness:plan");
  if (!plan || plan.length === 0) {
    plan = DEFAULT_PLAN;
    await kvSet("fitness:plan", plan);
  }

  const [log, biometrics] = await Promise.all([
    kvGet<WorkoutLog[]>("fitness:log"),
    kvGet<BiometricEntry[]>("fitness:biometrics"),
  ]);

  return {
    plan,
    log: log ?? [],
    biometrics: biometrics ?? [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "log-workout") {
    const entry: WorkoutLog = {
      id: generateId(),
      day: formData.get("day") as string,
      name: formData.get("name") as string,
      completedAt: new Date().toISOString(),
    };
    await kvAddItem("fitness:log", entry);
  } else if (intent === "log-biometric") {
    const entry: BiometricEntry = {
      id: generateId(),
      date: formData.get("date") as string,
      weight: Number(formData.get("weight") || 0),
      sleepHours: Number(formData.get("sleepHours") || 0),
      energy: Number(formData.get("energy") || 5),
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("fitness:biometrics", entry);
  }

  return { ok: true };
}

export default function FitnessPage() {
  const { plan, log, biometrics } = useLoaderData<typeof loader>();
  const [showBiometricForm, setShowBiometricForm] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekStart = startOfWeek.toISOString().split("T")[0];

  const thisWeekLogs = log.filter((l) => l.completedAt >= weekStart);

  const isCompleted = (day: string) =>
    thisWeekLogs.some((l) => l.day === day);

  const latestBiometric =
    [...biometrics].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-title">Fitness & Performance</p>
        <p className="text-[14px] text-[rgba(245,245,245,0.55)] mt-1">
          Weekly training plan, supplements & biometrics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Workouts This Week</p>
          <p className="text-stat mt-1">{thisWeekLogs.length}/6</p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Weight</p>
          <p className="text-stat-sm mt-1">
            {latestBiometric ? `${latestBiometric.weight} lbs` : "—"}
          </p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Energy</p>
          <p className="text-stat-sm mt-1">
            {latestBiometric ? `${latestBiometric.energy}/10` : "—"}
          </p>
        </div>
      </div>

      {/* Weekly Workout Plan */}
      <div>
        <p className="text-section mb-3">Weekly Plan</p>
        <div className="grid gap-2">
          {plan.map((day) => {
            const completed = isCompleted(day.day);
            const color = DAY_COLORS[day.name] || "#8e8e93";
            return (
              <div
                key={day.day}
                className={`card-static flex items-center gap-4 ${
                  completed ? "opacity-60" : ""
                }`}
              >
                <div
                  className="w-1.5 h-12 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium text-[#f5f5f5]">
                      {day.day}
                    </p>
                    <span
                      className="pill text-[11px]"
                      style={{
                        backgroundColor: color + "18",
                        color: color,
                      }}
                    >
                      {day.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[12px] text-[rgba(245,245,245,0.55)]">
                      {day.duration}
                    </span>
                    <span className="text-[12px] text-[rgba(245,245,245,0.3)]">
                      {day.muscles}
                    </span>
                  </div>
                </div>
                {day.name !== "Rest" &&
                  (completed ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#34c75918]">
                      <Check className="w-3.5 h-3.5 text-[#34c759]" />
                      <span className="text-[12px] font-medium text-[#34c759]">
                        Done
                      </span>
                    </div>
                  ) : (
                    <Form method="post">
                      <input type="hidden" name="intent" value="log-workout" />
                      <input type="hidden" name="day" value={day.day} />
                      <input type="hidden" name="name" value={day.name} />
                      <button
                        type="submit"
                        className="btn-ghost text-[12px] flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Log
                      </button>
                    </Form>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Supplement Stack */}
      <div>
        <p className="text-section mb-3">Supplement Stack</p>
        <div className="grid md:grid-cols-2 gap-3">
          {SUPPLEMENT_STACK.map((stack) => {
            const Icon = stack.icon;
            return (
              <div key={stack.time} className="card-static">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                    style={{ backgroundColor: stack.color + "15" }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: stack.color }}
                    />
                  </div>
                  <p className="text-[14px] font-medium text-[#f5f5f5]">
                    {stack.time}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {stack.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-[13px] text-[rgba(245,245,245,0.55)]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: stack.color }}
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Biometric Tracker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Biometrics</p>
          <button
            onClick={() => setShowBiometricForm(!showBiometricForm)}
            className="btn-primary text-[13px] flex items-center gap-1.5"
          >
            {showBiometricForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showBiometricForm ? "Cancel" : "Log Entry"}
          </button>
        </div>

        {showBiometricForm && (
          <Form
            method="post"
            className="card-static mb-4 space-y-4"
            onSubmit={() => setShowBiometricForm(false)}
          >
            <input type="hidden" name="intent" value="log-biometric" />
            <div>
              <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                Date
              </label>
              <input
                type="date"
                name="date"
                defaultValue={todayStr}
                required
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                  <Scale className="w-3 h-3 inline mr-1" />
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  name="weight"
                  step="0.1"
                  placeholder="185"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                  <BedDouble className="w-3 h-3 inline mr-1" />
                  Sleep (hrs)
                </label>
                <input
                  type="number"
                  name="sleepHours"
                  step="0.5"
                  placeholder="7.5"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                  <Battery className="w-3 h-3 inline mr-1" />
                  Energy (1-10)
                </label>
                <input
                  type="number"
                  name="energy"
                  min="1"
                  max="10"
                  placeholder="7"
                  className="input-field"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary text-[13px] w-full">
              Save Biometric Entry
            </button>
          </Form>
        )}

        {/* Recent Biometric Entries */}
        <div className="space-y-2">
          {biometrics.length === 0 ? (
            <div className="card-static text-center py-8">
              <Scale className="w-8 h-8 text-[rgba(245,245,245,0.3)] mx-auto mb-2" />
              <p className="text-[14px] text-[rgba(245,245,245,0.55)]">No biometric data yet</p>
              <p className="text-[12px] text-[rgba(245,245,245,0.3)] mt-1">
                Log your weight, sleep & energy above
              </p>
            </div>
          ) : (
            [...biometrics]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 7)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="card-static flex items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[#f5f5f5]">
                      {new Date(entry.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" }
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {entry.weight > 0 && (
                      <div className="text-center">
                        <p className="text-[11px] text-[rgba(245,245,245,0.3)]">Weight</p>
                        <p className="text-[13px] font-medium text-[#f5f5f5]">
                          {entry.weight}
                        </p>
                      </div>
                    )}
                    {entry.sleepHours > 0 && (
                      <div className="text-center">
                        <p className="text-[11px] text-[rgba(245,245,245,0.3)]">Sleep</p>
                        <p className="text-[13px] font-medium text-[#f5f5f5]">
                          {entry.sleepHours}h
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-[11px] text-[rgba(245,245,245,0.3)]">Energy</p>
                      <p className="text-[13px] font-medium text-[#f5f5f5]">
                        {entry.energy}/10
                      </p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
