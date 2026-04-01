import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  Droplets, Smartphone, DollarSign, Plus,
  Package, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { kvGet, kvAddItem, kvUpdateItem } from "~/lib/kv.server";
import { ATLAS_PRODUCTS } from "~/lib/constants";
import { cn, generateId, formatCurrency } from "~/lib/utils";
import type { AtlasMetric, SkywayFeature, IncomeEntry, FeatureStatus } from "~/lib/types";
import type { Route } from "./+types/business";

export function meta() {
  return [{ title: "Business Hub — FlyWithGarrett" }];
}

export async function loader() {
  const [atlasMetrics, atlasProducts, skywayFeatures, income] = await Promise.all([
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<{ id: string; name: string; description: string; color: string; inStock: boolean }[]>("atlas:products"),
    kvGet<SkywayFeature[]>("skyway:features"),
    kvGet<IncomeEntry[]>("business:income"),
  ]);
  return {
    atlasMetrics: atlasMetrics ?? [],
    atlasProducts: atlasProducts ?? [],
    skywayFeatures: skywayFeatures ?? [],
    income: income ?? [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-skyway-feature") {
    const feature: SkywayFeature = {
      id: generateId(),
      title: formData.get("title") as string,
      description: formData.get("description") as string || "",
      status: formData.get("status") as FeatureStatus || "backlog",
      priority: Number(formData.get("priority") || 0),
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("skyway:features", feature);
  } else if (intent === "update-feature-status") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as FeatureStatus;
    await kvUpdateItem<SkywayFeature>("skyway:features", id, { status });
  } else if (intent === "add-income") {
    const entry: IncomeEntry = {
      id: generateId(),
      month: formData.get("month") as string,
      pilotIncome: Number(formData.get("pilotIncome") || 0),
      creatorIncome: Number(formData.get("creatorIncome") || 0),
      atlasRevenue: Number(formData.get("atlasRevenue") || 0),
      brandDeals: Number(formData.get("brandDeals") || 0),
      expenses: Number(formData.get("expenses") || 0),
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("business:income", entry);
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

const featureStatusConfig: Record<FeatureStatus, { label: string; bg: string; text: string }> = {
  backlog: { label: "Backlog", bg: "rgba(255,255,255,0.06)", text: "rgba(245,245,245,0.4)" },
  in_dev: { label: "In Dev", bg: "rgba(10,132,255,0.15)", text: "#0a84ff" },
  shipped: { label: "Shipped", bg: "rgba(48,209,88,0.15)", text: "#30d158" },
};

const chartTooltipStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "12px",
  fontSize: "12px",
};

type TabKey = "atlas" | "skyway" | "income";

const tabItems: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "atlas", label: "Atlas", icon: Droplets },
  { key: "skyway", label: "SkyWay", icon: Smartphone },
  { key: "income", label: "Income", icon: DollarSign },
];

export default function BusinessPage() {
  const { atlasMetrics, atlasProducts, skywayFeatures, income } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<TabKey>("atlas");
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showLogRevenue, setShowLogRevenue] = useState(false);
  const [showLogIncome, setShowLogIncome] = useState(false);

  const sortedAtlas = [...atlasMetrics].sort((a, b) => a.recordedMonth.localeCompare(b.recordedMonth));

  // Income chart data
  const incomeData = [...income].sort((a, b) => a.month.localeCompare(b.month)).map((e) => ({
    month: e.month,
    pilot: e.pilotIncome,
    creator: e.creatorIncome,
    atlas: e.atlasRevenue,
    brands: e.brandDeals,
    total: e.pilotIncome + e.creatorIncome + e.atlasRevenue + e.brandDeals,
    net: e.pilotIncome + e.creatorIncome + e.atlasRevenue + e.brandDeals - e.expenses,
  }));

  // Feature kanban columns
  const featuresByStatus: Record<FeatureStatus, SkywayFeature[]> = {
    backlog: skywayFeatures.filter((f) => f.status === "backlog"),
    in_dev: skywayFeatures.filter((f) => f.status === "in_dev"),
    shipped: skywayFeatures.filter((f) => f.status === "shipped"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Business Hub</h1>
        <p className="text-micro mt-1">Atlas Hydration, SkyWay & finances</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-[10px] bg-[rgba(255,255,255,0.04)] p-1 w-fit">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors",
                activeTab === tab.key ? "bg-[rgba(255,255,255,0.06)] text-[#f5f5f5]" : "text-[rgba(245,245,245,0.3)] hover:text-[#f5f5f5]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Atlas Tab */}
      {activeTab === "atlas" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Products */}
          <div className="card-static p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4" style={{ color: "#30d158" }} />
              <h3 className="text-section">PRODUCT CATALOG</h3>
            </div>
            <div className="space-y-2">
              {atlasProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.04)]">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: product.color }} />
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-[#f5f5f5]">{product.name}</p>
                    <p className="text-micro">{product.description}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: product.inStock ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
                      color: product.inStock ? "#30d158" : "#ff453a",
                    }}
                  >
                    {product.inStock ? "In Stock" : "Out"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue */}
          <div className="card-static p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-section">REVENUE</h3>
              <button onClick={() => setShowLogRevenue(true)} className="btn-ghost h-7 px-2 text-[12px] font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Log
              </button>
            </div>
            {sortedAtlas.length === 0 ? (
              <p className="text-micro text-center py-6">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sortedAtlas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="recordedMonth" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="revenue" name="Revenue" fill="#30d158" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* SkyWay Tab */}
      {activeTab === "skyway" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddFeature(true)} className="btn-primary h-9 px-4 text-[13px] font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Feature
            </button>
          </div>

          {/* Kanban Board */}
          <div className="grid md:grid-cols-3 gap-4">
            {(["backlog", "in_dev", "shipped"] as FeatureStatus[]).map((status) => {
              const config = featureStatusConfig[status];
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: config.bg, color: config.text }}>
                      {config.label}
                    </span>
                    <span className="text-micro">({featuresByStatus[status].length})</span>
                  </div>
                  <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
                    {featuresByStatus[status].length === 0 ? (
                      <p className="text-micro text-center py-8">Empty</p>
                    ) : (
                      featuresByStatus[status]
                        .sort((a, b) => a.priority - b.priority)
                        .map((feature) => (
                          <div key={feature.id} className="card-static p-3">
                            <p className="text-sm font-medium text-[#f5f5f5]">{feature.title}</p>
                            {feature.description && (
                              <p className="text-micro mt-1">{feature.description}</p>
                            )}
                            <div className="flex gap-1 mt-2">
                              {status !== "backlog" && (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="update-feature-status" />
                                  <input type="hidden" name="id" value={feature.id} />
                                  <input type="hidden" name="status" value={status === "in_dev" ? "backlog" : "in_dev"} />
                                  <button type="submit" className="btn-ghost h-6 px-2 text-[11px] font-medium">
                                    &larr; Back
                                  </button>
                                </Form>
                              )}
                              {status !== "shipped" && (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="update-feature-status" />
                                  <input type="hidden" name="id" value={feature.id} />
                                  <input type="hidden" name="status" value={status === "backlog" ? "in_dev" : "shipped"} />
                                  <button type="submit" className="btn-ghost h-6 px-2 text-[11px] font-medium">
                                    Next &rarr;
                                  </button>
                                </Form>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income Tab */}
      {activeTab === "income" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowLogIncome(true)} className="btn-primary h-9 px-4 text-[13px] font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Log Income
            </button>
          </div>

          {income.length === 0 ? (
            <div className="card-static p-12 text-center">
              <DollarSign className="w-8 h-8 text-[rgba(245,245,245,0.3)] mx-auto mb-2" />
              <p className="text-micro">No income data logged yet.</p>
            </div>
          ) : (
            <>
              <div className="card-static p-5 mb-6">
                <h3 className="text-[14px] font-medium text-[#f5f5f5] mb-4">Monthly P&L</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={incomeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend />
                    <Bar dataKey="pilot" name="Pilot" fill="#0a84ff" stackId="income" />
                    <Bar dataKey="creator" name="Creator" fill="#bf5af2" stackId="income" />
                    <Bar dataKey="atlas" name="Atlas" fill="#30d158" stackId="income" />
                    <Bar dataKey="brands" name="Brand Deals" fill="#ff9f0a" stackId="income" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {incomeData.slice(-1).map((entry) => (
                  <div key={`${entry.month}-stats`} className="contents">
                    <div className="card-static p-4 text-center">
                      <p className="text-micro">Total Revenue</p>
                      <p className="text-stat-sm" style={{ color: "#30d158" }}>{formatCurrency(entry.total)}</p>
                      <p className="text-micro">{entry.month}</p>
                    </div>
                    <div className="card-static p-4 text-center">
                      <p className="text-micro">Net Income</p>
                      <p className={cn("text-stat-sm", entry.net >= 0 ? "text-[#30d158]" : "text-[#ff453a]")}>
                        {formatCurrency(entry.net)}
                      </p>
                      <p className="text-micro">{entry.month}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Log Atlas Revenue Dialog */}
      {showLogRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLogRevenue(false)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#f5f5f5]">Log Atlas Revenue</h2>
              <button onClick={() => setShowLogRevenue(false)} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
                <X className="w-4 h-4 text-[rgba(245,245,245,0.3)]" />
              </button>
            </div>
            <Form method="post" className="space-y-4" onSubmit={() => setShowLogRevenue(false)}>
              <input type="hidden" name="intent" value="add-atlas-metric" />
              <input name="recordedMonth" type="month" required className="input-field w-full" />
              <input name="revenue" type="number" placeholder="Revenue ($)" required className="input-field w-full" />
              <input name="unitsSold" type="number" placeholder="Units Sold" className="input-field w-full" />
              <input name="websiteVisits" type="number" placeholder="Website Visits" className="input-field w-full" />
              <input name="notes" placeholder="Notes" className="input-field w-full" />
              <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">Save</button>
            </Form>
          </div>
        </div>
      )}

      {/* Add SkyWay Feature Dialog */}
      {showAddFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddFeature(false)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#f5f5f5]">New SkyWay Feature</h2>
              <button onClick={() => setShowAddFeature(false)} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
                <X className="w-4 h-4 text-[rgba(245,245,245,0.3)]" />
              </button>
            </div>
            <Form method="post" className="space-y-4" onSubmit={() => setShowAddFeature(false)}>
              <input type="hidden" name="intent" value="add-skyway-feature" />
              <input name="title" placeholder="Feature title" required className="input-field w-full" />
              <textarea name="description" placeholder="Description" rows={2} className="input-field w-full" />
              <select name="status" defaultValue="backlog" className="input-field w-full">
                <option value="backlog">Backlog</option>
                <option value="in_dev">In Development</option>
                <option value="shipped">Shipped</option>
              </select>
              <input name="priority" type="number" placeholder="Priority (1=highest)" defaultValue="5" className="input-field w-full" />
              <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">Save</button>
            </Form>
          </div>
        </div>
      )}

      {/* Log Income Dialog */}
      {showLogIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLogIncome(false)} />
          <div className="relative w-full max-w-md card-static p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-medium text-[#f5f5f5]">Log Monthly Income</h2>
              <button onClick={() => setShowLogIncome(false)} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
                <X className="w-4 h-4 text-[rgba(245,245,245,0.3)]" />
              </button>
            </div>
            <Form method="post" className="space-y-4" onSubmit={() => setShowLogIncome(false)}>
              <input type="hidden" name="intent" value="add-income" />
              <input name="month" type="month" required className="input-field w-full" />
              <input name="pilotIncome" type="number" placeholder="Pilot Income ($)" className="input-field w-full" />
              <input name="creatorIncome" type="number" placeholder="Creator Income ($)" className="input-field w-full" />
              <input name="atlasRevenue" type="number" placeholder="Atlas Revenue ($)" className="input-field w-full" />
              <input name="brandDeals" type="number" placeholder="Brand Deals ($)" className="input-field w-full" />
              <input name="expenses" type="number" placeholder="Total Expenses ($)" className="input-field w-full" />
              <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">Save</button>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
