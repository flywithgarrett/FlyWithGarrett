import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import { Droplets, Smartphone, DollarSign, Plus, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { kvGet, kvAddItem, kvUpdateItem } from "~/lib/kv.server";
import { ATLAS_PRODUCTS } from "~/lib/constants";
import { generateId, formatCurrency } from "~/lib/utils";
import type { AtlasMetric, SkywayFeature, IncomeEntry, FeatureStatus } from "~/lib/types";
import type { Route } from "./+types/business";

export function meta() { return [{ title: "Business Hub — FlyWithGarrett" }]; }

export async function loader() {
  const [atlasMetrics, atlasProducts, skywayFeatures, income] = await Promise.all([
    kvGet<AtlasMetric[]>("atlas:metrics"),
    kvGet<{ id: string; name: string; description: string; color: string; inStock: boolean }[]>("atlas:products"),
    kvGet<SkywayFeature[]>("skyway:features"),
    kvGet<IncomeEntry[]>("business:income"),
  ]);
  return { atlasMetrics: atlasMetrics ?? [], atlasProducts: atlasProducts ?? [], skywayFeatures: skywayFeatures ?? [], income: income ?? [] };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  if (intent === "add-skyway-feature") {
    await kvAddItem("skyway:features", { id: generateId(), title: formData.get("title") as string, description: formData.get("description") as string || "", status: (formData.get("status") as FeatureStatus) || "backlog", priority: Number(formData.get("priority") || 5), createdAt: new Date().toISOString() } satisfies SkywayFeature);
  } else if (intent === "update-feature-status") {
    await kvUpdateItem<SkywayFeature>("skyway:features", formData.get("id") as string, { status: formData.get("status") as FeatureStatus });
  } else if (intent === "add-income") {
    await kvAddItem("business:income", { id: generateId(), month: formData.get("month") as string, pilotIncome: Number(formData.get("pilotIncome") || 0), creatorIncome: Number(formData.get("creatorIncome") || 0), atlasRevenue: Number(formData.get("atlasRevenue") || 0), brandDeals: Number(formData.get("brandDeals") || 0), expenses: Number(formData.get("expenses") || 0), createdAt: new Date().toISOString() } satisfies IncomeEntry);
  } else if (intent === "add-atlas-metric") {
    await kvAddItem("atlas:metrics", { id: generateId(), revenue: Number(formData.get("revenue")), unitsSold: Number(formData.get("unitsSold") || 0), websiteVisits: Number(formData.get("websiteVisits") || 0), recordedMonth: formData.get("recordedMonth") as string, notes: formData.get("notes") as string || "", createdAt: new Date().toISOString() } satisfies AtlasMetric);
  }
  return { ok: true };
}

const statusConfig: Record<FeatureStatus, { label: string; color: string }> = { backlog: { label: "Backlog", color: "#ffffff30" }, in_dev: { label: "In Dev", color: "#0a84ff" }, shipped: { label: "Shipped", color: "#30d158" } };
const tooltipStyle = { backgroundColor: "#111114", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", fontSize: "12px" };

export default function BusinessPage() {
  const { atlasMetrics, atlasProducts, skywayFeatures, income } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<"atlas" | "skyway" | "income">("atlas");
  const [showForm, setShowForm] = useState(false);

  const sortedAtlas = [...atlasMetrics].sort((a, b) => a.recordedMonth.localeCompare(b.recordedMonth));
  const incomeData = [...income].sort((a, b) => a.month.localeCompare(b.month)).map((e) => ({
    month: e.month, pilot: e.pilotIncome, creator: e.creatorIncome, atlas: e.atlasRevenue, brands: e.brandDeals,
    total: e.pilotIncome + e.creatorIncome + e.atlasRevenue + e.brandDeals,
    net: e.pilotIncome + e.creatorIncome + e.atlasRevenue + e.brandDeals - e.expenses,
  }));
  const featuresByStatus: Record<FeatureStatus, SkywayFeature[]> = {
    backlog: skywayFeatures.filter((f) => f.status === "backlog"),
    in_dev: skywayFeatures.filter((f) => f.status === "in_dev"),
    shipped: skywayFeatures.filter((f) => f.status === "shipped"),
  };

  const tabs = [
    { key: "atlas", label: "Atlas Hydration", icon: Droplets },
    { key: "skyway", label: "SkyWay", icon: Smartphone },
    { key: "income", label: "Income", icon: DollarSign },
  ] as const;

  return (
    <div className="space-y-8">
      <h1 className="text-title">Business Hub</h1>

      <div className="flex gap-1 p-1 rounded-[12px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-medium transition-all ${tab === t.key ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#ffffff40] hover:text-[#ffffff70]"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === "atlas" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-static p-5">
            <p className="text-section mb-3">Product Catalog</p>
            {atlasProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <div className="flex-1"><p className="text-[13px] text-white">{p.name}</p><p className="text-[11px] text-[#ffffff40]">{p.description}</p></div>
                <span className="text-[10px]" style={{ color: p.inStock ? "#30d158" : "#ff453a" }}>{p.inStock ? "In Stock" : "Out"}</span>
              </div>
            ))}
          </div>
          <div className="card-static p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-section">Revenue</p>
              <button onClick={() => setShowForm(!showForm)} className="btn-ghost text-[11px] py-1 px-2"><Plus className="w-3 h-3 inline" /> Log</button>
            </div>
            {showForm && (
              <Form method="post" className="space-y-2 mb-4" onSubmit={() => setShowForm(false)}>
                <input type="hidden" name="intent" value="add-atlas-metric" />
                <input name="recordedMonth" type="month" required className="input-field text-[12px]" />
                <input name="revenue" type="number" placeholder="Revenue ($)" required className="input-field text-[12px]" />
                <button type="submit" className="btn-primary text-[12px]">Save</button>
              </Form>
            )}
            {sortedAtlas.length === 0 ? <p className="text-micro text-center py-6">No data yet</p> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sortedAtlas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="recordedMonth" stroke="#ffffff30" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#ffffff30" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="revenue" fill="#30d158" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab === "skyway" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowForm(!showForm)} className="btn-ghost flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Feature</button>
          </div>
          {showForm && (
            <Form method="post" className="card-static p-5 space-y-3 mb-4" onSubmit={() => setShowForm(false)}>
              <input type="hidden" name="intent" value="add-skyway-feature" />
              <input name="title" placeholder="Feature title" required className="input-field" />
              <textarea name="description" placeholder="Description" rows={2} className="input-field" />
              <select name="status" defaultValue="backlog" className="input-field"><option value="backlog">Backlog</option><option value="in_dev">In Dev</option><option value="shipped">Shipped</option></select>
              <button type="submit" className="btn-primary">Save</button>
            </Form>
          )}
          <div className="grid md:grid-cols-3 gap-4">
            {(["backlog", "in_dev", "shipped"] as FeatureStatus[]).map((status) => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="pill" style={{ color: statusConfig[status].color }}>{statusConfig[status].label}</span>
                  <span className="text-micro">({featuresByStatus[status].length})</span>
                </div>
                <div className="space-y-2 min-h-[200px] p-2 rounded-[12px] bg-[rgba(255,255,255,0.02)]">
                  {featuresByStatus[status].length === 0 ? <p className="text-micro text-center py-8">Empty</p> : featuresByStatus[status].sort((a, b) => a.priority - b.priority).map((f) => (
                    <div key={f.id} className="card-static p-3">
                      <p className="text-[13px] font-medium text-white">{f.title}</p>
                      {f.description && <p className="text-[11px] text-[#ffffff40] mt-1">{f.description}</p>}
                      <div className="flex gap-1 mt-2">
                        {status !== "backlog" && <Form method="post"><input type="hidden" name="intent" value="update-feature-status" /><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value={status === "in_dev" ? "backlog" : "in_dev"} /><button type="submit" className="text-[10px] text-[#ffffff40] hover:text-white">← Back</button></Form>}
                        {status !== "shipped" && <Form method="post"><input type="hidden" name="intent" value="update-feature-status" /><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value={status === "backlog" ? "in_dev" : "shipped"} /><button type="submit" className="text-[10px] text-[#ffffff40] hover:text-white">Next →</button></Form>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "income" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)} className="btn-ghost flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Log Income</button>
          </div>
          {showForm && (
            <Form method="post" className="card-static p-5 space-y-3" onSubmit={() => setShowForm(false)}>
              <input type="hidden" name="intent" value="add-income" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <input name="month" type="month" required className="input-field" />
                <input name="pilotIncome" type="number" placeholder="Pilot ($)" className="input-field" />
                <input name="creatorIncome" type="number" placeholder="Creator ($)" className="input-field" />
                <input name="atlasRevenue" type="number" placeholder="Atlas ($)" className="input-field" />
                <input name="brandDeals" type="number" placeholder="Brand Deals ($)" className="input-field" />
                <input name="expenses" type="number" placeholder="Expenses ($)" className="input-field" />
              </div>
              <button type="submit" className="btn-primary">Save</button>
            </Form>
          )}
          {income.length === 0 ? (
            <div className="card-static p-10 text-center"><DollarSign className="w-6 h-6 text-[#ffffff15] mx-auto mb-2" /><p className="text-[13px] text-[#ffffff50]">No income data yet.</p></div>
          ) : (
            <>
              <div className="card-static p-6">
                <p className="text-[14px] font-medium text-white mb-4">Monthly P&L</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={incomeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" stroke="#ffffff30" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#ffffff30" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="pilot" name="Pilot" fill="#0a84ff" stackId="a" />
                    <Bar dataKey="creator" name="Creator" fill="#bf5af2" stackId="a" />
                    <Bar dataKey="atlas" name="Atlas" fill="#30d158" stackId="a" />
                    <Bar dataKey="brands" name="Deals" fill="#ffd60a" stackId="a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {incomeData.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="card-static p-5 text-center">
                    <p className="text-micro mb-1">Total Revenue</p>
                    <p className="text-stat-sm text-[#30d158]">{formatCurrency(incomeData[incomeData.length - 1].total)}</p>
                  </div>
                  <div className="card-static p-5 text-center">
                    <p className="text-micro mb-1">Net Income</p>
                    <p className="text-stat-sm" style={{ color: incomeData[incomeData.length - 1].net >= 0 ? "#30d158" : "#ff453a" }}>{formatCurrency(incomeData[incomeData.length - 1].net)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
