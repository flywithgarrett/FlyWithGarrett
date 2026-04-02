import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  Droplets, DollarSign, Package, TrendingUp, Plus, X,
  Video, Heart, GripVertical, Trash2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { kvGet, kvSet, kvAddItem, kvUpdateItem, kvDeleteItem } from "~/lib/kv.server";
import { generateId, formatCurrency } from "~/lib/utils";
import type { Route } from "./+types/atlas";

interface AtlasMetric {
  id: string;
  revenue: number;
  unitsSold: number;
  bestFlavor: string;
  recordedMonth: string;
  createdAt: string;
}

interface AtlasTask {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
}

interface ContentSaleEntry {
  id: string;
  videoTitle: string;
  platform: string;
  clicksGenerated: number;
  salesAttributed: number;
  date: string;
  createdAt: string;
}

interface MissionStats {
  totalDonated: number;
  communitiesHelped: number;
}

const PRODUCTS = [
  { name: "Grapefruit", color: "#F97316", inventory: "In Stock", unitsSold: 0 },
  { name: "Mixed Berry", color: "#8B5CF6", inventory: "In Stock", unitsSold: 0 },
  { name: "Strawberry Lemonade", color: "#EC4899", inventory: "In Stock", unitsSold: 0 },
  { name: "Lemon Lime", color: "#10B981", inventory: "In Stock", unitsSold: 0 },
];

const DEFAULT_TASKS: AtlasTask[] = [
  { id: "seed-1", title: "Develop new flavor", status: "todo", createdAt: new Date().toISOString() },
  { id: "seed-2", title: "Set up email list", status: "todo", createdAt: new Date().toISOString() },
  { id: "seed-3", title: "Create ambassador program", status: "todo", createdAt: new Date().toISOString() },
  { id: "seed-4", title: "Film 5 Atlas BTS videos", status: "in_progress", createdAt: new Date().toISOString() },
  { id: "seed-5", title: "Optimize Shopify pages", status: "in_progress", createdAt: new Date().toISOString() },
  { id: "seed-6", title: "Run first paid ad", status: "todo", createdAt: new Date().toISOString() },
];

const TASK_COLUMNS: { key: AtlasTask["status"]; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "#86868b" },
  { key: "in_progress", label: "In Progress", color: "#007aff" },
  { key: "done", label: "Done", color: "#34c759" },
];

const chartTooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: "12px",
  fontSize: "12px",
};

export function meta() {
  return [{ title: "Atlas Hydration — FlyWithGarrett" }];
}

export async function loader() {
  let tasks = await kvGet<AtlasTask[]>("atlas:tasks");
  if (!tasks || tasks.length === 0) {
    tasks = DEFAULT_TASKS;
    await kvSet("atlas:tasks", tasks);
  }

  const [metrics, contentSales, mission] = await Promise.all([
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<ContentSaleEntry[]>("atlas:content-sales"),
    kvGet<MissionStats>("atlas:mission"),
  ]);

  return {
    metrics: metrics ?? [],
    tasks,
    contentSales: contentSales ?? [],
    mission: mission ?? { totalDonated: 0, communitiesHelped: 0 },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-task") {
    const task: AtlasTask = {
      id: generateId(),
      title: formData.get("title") as string,
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("atlas:tasks", task);
  } else if (intent === "move-task") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as AtlasTask["status"];
    await kvUpdateItem<AtlasTask>("atlas:tasks", id, { status });
  } else if (intent === "delete-task") {
    const id = formData.get("id") as string;
    await kvDeleteItem<AtlasTask>("atlas:tasks", id);
  } else if (intent === "log-metric") {
    const metric: AtlasMetric = {
      id: generateId(),
      revenue: Number(formData.get("revenue") || 0),
      unitsSold: Number(formData.get("unitsSold") || 0),
      bestFlavor: formData.get("bestFlavor") as string || "",
      recordedMonth: formData.get("recordedMonth") as string,
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("atlas:metrics", metric);
  } else if (intent === "log-content-sale") {
    const entry: ContentSaleEntry = {
      id: generateId(),
      videoTitle: formData.get("videoTitle") as string,
      platform: formData.get("platform") as string,
      clicksGenerated: Number(formData.get("clicksGenerated") || 0),
      salesAttributed: Number(formData.get("salesAttributed") || 0),
      date: formData.get("date") as string,
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("atlas:content-sales", entry);
  } else if (intent === "update-mission") {
    const mission: MissionStats = {
      totalDonated: Number(formData.get("totalDonated") || 0),
      communitiesHelped: Number(formData.get("communitiesHelped") || 0),
    };
    await kvSet("atlas:mission", mission);
  }

  return { ok: true };
}

export default function AtlasPage() {
  const { metrics, tasks, contentSales, mission } = useLoaderData<typeof loader>();
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showContentForm, setShowContentForm] = useState(false);
  const [showMissionForm, setShowMissionForm] = useState(false);

  const sortedMetrics = [...metrics].sort((a, b) =>
    a.recordedMonth.localeCompare(b.recordedMonth)
  );
  const latestMetric = [...metrics].sort((a, b) =>
    b.recordedMonth.localeCompare(a.recordedMonth)
  )[0] ?? null;

  const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
  const totalUnits = metrics.reduce((sum, m) => sum + m.unitsSold, 0);

  const tasksByStatus = (status: AtlasTask["status"]) =>
    tasks.filter((t) => t.status === status);

  const nextStatus = (current: AtlasTask["status"]): AtlasTask["status"] | null => {
    if (current === "todo") return "in_progress";
    if (current === "in_progress") return "done";
    return null;
  };

  const prevStatus = (current: AtlasTask["status"]): AtlasTask["status"] | null => {
    if (current === "done") return "in_progress";
    if (current === "in_progress") return "todo";
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-title">Atlas Hydration</p>
        <p className="text-[14px] text-[#86868b] mt-1">
          Command center for Atlas Hydration Co.
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-static text-center">
          <p className="text-micro text-[#86868b]">Revenue This Month</p>
          <p className="text-stat mt-1" style={{ color: "#34c759" }}>
            {latestMetric ? formatCurrency(latestMetric.revenue) : "$0"}
          </p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[#86868b]">Units Sold</p>
          <p className="text-stat mt-1">{latestMetric?.unitsSold ?? 0}</p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[#86868b]">Best Selling Flavor</p>
          <p className="text-stat-sm mt-1">
            {latestMetric?.bestFlavor || "—"}
          </p>
        </div>
      </div>

      {/* Product Cards */}
      <div>
        <p className="text-section mb-3">Products</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRODUCTS.map((product) => (
            <div key={product.name} className="card-static">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: product.color }}
                />
                <p className="text-[14px] font-medium text-[#1d1d1f]">
                  {product.name}
                </p>
              </div>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: "rgba(48,209,88,0.15)",
                  color: "#34c759",
                }}
              >
                {product.inventory}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Revenue</p>
          <button
            onClick={() => setShowMetricForm(!showMetricForm)}
            className="btn-primary text-[13px] flex items-center gap-1.5"
          >
            {showMetricForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showMetricForm ? "Cancel" : "Log Revenue"}
          </button>
        </div>

        {showMetricForm && (
          <Form
            method="post"
            className="card-static mb-4 space-y-4"
            onSubmit={() => setShowMetricForm(false)}
          >
            <input type="hidden" name="intent" value="log-metric" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Month
                </label>
                <input
                  type="month"
                  name="recordedMonth"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Revenue ($)
                </label>
                <input
                  type="number"
                  name="revenue"
                  required
                  placeholder="0"
                  className="input-field"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Units Sold
                </label>
                <input
                  type="number"
                  name="unitsSold"
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Best Selling Flavor
                </label>
                <select name="bestFlavor" className="input-field">
                  <option value="">Select...</option>
                  {PRODUCTS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary text-[13px] w-full">
              Save Revenue Data
            </button>
          </Form>
        )}

        <div className="card-static">
          {sortedMetrics.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-8 h-8 text-[#aeaeb2] mx-auto mb-2" />
              <p className="text-[14px] text-[#86868b]">No revenue data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sortedMetrics}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                />
                <XAxis
                  dataKey="recordedMonth"
                  stroke="rgba(0,0,0,0.1)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="rgba(0,0,0,0.1)"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#34c759"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Task Board (Kanban) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Task Board</p>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="btn-ghost text-[13px] flex items-center gap-1.5"
          >
            {showTaskForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showTaskForm ? "Cancel" : "Add Task"}
          </button>
        </div>

        {showTaskForm && (
          <Form
            method="post"
            className="card-static mb-4 flex gap-3"
            onSubmit={() => setShowTaskForm(false)}
          >
            <input type="hidden" name="intent" value="add-task" />
            <input
              type="text"
              name="title"
              required
              placeholder="New task..."
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary text-[13px]">
              Add
            </button>
          </Form>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {TASK_COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[12px] font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: col.color + "18",
                    color: col.color,
                  }}
                >
                  {col.label}
                </span>
                <span className="text-micro">
                  ({tasksByStatus(col.key).length})
                </span>
              </div>
              <div className="space-y-2 min-h-[120px] p-2 rounded-[14px] bg-[rgba(0,0,0,0.03)]">
                {tasksByStatus(col.key).length === 0 ? (
                  <p className="text-micro text-center py-6">No tasks</p>
                ) : (
                  tasksByStatus(col.key).map((task) => (
                    <div key={task.id} className="card-static !p-3">
                      <p className="text-[13px] font-medium text-[#1d1d1f]">
                        {task.title}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {prevStatus(task.status) && (
                          <Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="move-task"
                            />
                            <input type="hidden" name="id" value={task.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={prevStatus(task.status)!}
                            />
                            <button
                              type="submit"
                              className="btn-ghost h-6 px-2 text-[11px]"
                            >
                              &larr; Back
                            </button>
                          </Form>
                        )}
                        {nextStatus(task.status) && (
                          <Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="move-task"
                            />
                            <input type="hidden" name="id" value={task.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={nextStatus(task.status)!}
                            />
                            <button
                              type="submit"
                              className="btn-ghost h-6 px-2 text-[11px]"
                            >
                              Next &rarr;
                            </button>
                          </Form>
                        )}
                        <Form method="post" className="ml-auto">
                          <input
                            type="hidden"
                            name="intent"
                            value="delete-task"
                          />
                          <input type="hidden" name="id" value={task.id} />
                          <button
                            type="submit"
                            className="btn-ghost h-6 px-1.5 text-[#aeaeb2] hover:text-[#ff3b30]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Form>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content-to-Sales Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Content-to-Sales</p>
          <button
            onClick={() => setShowContentForm(!showContentForm)}
            className="btn-ghost text-[13px] flex items-center gap-1.5"
          >
            {showContentForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showContentForm ? "Cancel" : "Log Entry"}
          </button>
        </div>

        {showContentForm && (
          <Form
            method="post"
            className="card-static mb-4 space-y-4"
            onSubmit={() => setShowContentForm(false)}
          >
            <input type="hidden" name="intent" value="log-content-sale" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Video Title
                </label>
                <input
                  type="text"
                  name="videoTitle"
                  required
                  placeholder="Video title..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Platform
                </label>
                <select name="platform" className="input-field">
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Clicks
                </label>
                <input
                  type="number"
                  name="clicksGenerated"
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Sales
                </label>
                <input
                  type="number"
                  name="salesAttributed"
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Date
                </label>
                <input type="date" name="date" required className="input-field" />
              </div>
            </div>
            <button type="submit" className="btn-primary text-[13px] w-full">
              Save Entry
            </button>
          </Form>
        )}

        <div className="space-y-2">
          {contentSales.length === 0 ? (
            <div className="card-static text-center py-8">
              <Video className="w-8 h-8 text-[#aeaeb2] mx-auto mb-2" />
              <p className="text-[14px] text-[#86868b]">
                No content-to-sales data yet
              </p>
              <p className="text-[12px] text-[#aeaeb2] mt-1">
                Track which videos drive traffic and sales
              </p>
            </div>
          ) : (
            [...contentSales]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="card-static flex items-center gap-3"
                >
                  <Video className="w-4 h-4 text-[#86868b] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] truncate">
                      {entry.videoTitle}
                    </p>
                    <p className="text-[11px] text-[#86868b]">
                      {entry.platform} &middot; {entry.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className="text-[11px] text-[#aeaeb2]">Clicks</p>
                      <p className="text-[13px] font-medium text-[#1d1d1f]">
                        {entry.clicksGenerated}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-[#aeaeb2]">Sales</p>
                      <p className="text-[13px] font-medium text-[#34c759]">
                        {entry.salesAttributed}
                      </p>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Clean Water Mission */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Clean Water Mission</p>
          <button
            onClick={() => setShowMissionForm(!showMissionForm)}
            className="btn-ghost text-[13px] flex items-center gap-1.5"
          >
            {showMissionForm ? "Cancel" : "Update"}
          </button>
        </div>

        {showMissionForm && (
          <Form
            method="post"
            className="card-static mb-4 space-y-4"
            onSubmit={() => setShowMissionForm(false)}
          >
            <input type="hidden" name="intent" value="update-mission" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Total Donated ($)
                </label>
                <input
                  type="number"
                  name="totalDonated"
                  defaultValue={mission.totalDonated}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-[#86868b] mb-1 block">
                  Communities Helped
                </label>
                <input
                  type="number"
                  name="communitiesHelped"
                  defaultValue={mission.communitiesHelped}
                  className="input-field"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary text-[13px] w-full">
              Update Mission Stats
            </button>
          </Form>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="card-static text-center">
            <Heart className="w-5 h-5 text-[#007aff] mx-auto mb-2" />
            <p className="text-micro text-[#86868b]">Total Donated</p>
            <p className="text-stat-sm mt-1" style={{ color: "#007aff" }}>
              {formatCurrency(mission.totalDonated)}
            </p>
          </div>
          <div className="card-static text-center">
            <Droplets className="w-5 h-5 text-[#5ac8fa] mx-auto mb-2" />
            <p className="text-micro text-[#86868b]">Communities Helped</p>
            <p className="text-stat-sm mt-1" style={{ color: "#5ac8fa" }}>
              {mission.communitiesHelped}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
