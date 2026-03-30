import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  Droplets, Smartphone, DollarSign, Plus,
  Package
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "~/components/ui/dialog";
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

const featureStatusConfig: Record<FeatureStatus, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "bg-gray-500/20 text-gray-400" },
  in_dev: { label: "In Dev", color: "bg-blue-500/20 text-blue-400" },
  shipped: { label: "Shipped", color: "bg-emerald-500/20 text-emerald-400" },
};

const tooltipStyle = {
  backgroundColor: "#111213",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "8px",
};

export default function BusinessPage() {
  const { atlasMetrics, atlasProducts, skywayFeatures, income } = useLoaderData<typeof loader>();

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
        <h1 className="text-title text-white">Business Hub</h1>
        <p className="text-sm text-[#71717A] mt-1">Atlas Hydration, SkyWay & finances</p>
      </div>

      <Tabs defaultValue="atlas">
        <TabsList className="flex-wrap bg-white/[0.06] border border-[rgba(255,255,255,0.06)]">
          <TabsTrigger value="atlas" className="gap-1.5"><Droplets className="w-3.5 h-3.5" /> Atlas</TabsTrigger>
          <TabsTrigger value="skyway" className="gap-1.5"><Smartphone className="w-3.5 h-3.5" /> SkyWay</TabsTrigger>
          <TabsTrigger value="income" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Income</TabsTrigger>
        </TabsList>

        {/* Atlas Tab */}
        <TabsContent value="atlas">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Products */}
            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Product Catalog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {atlasProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.04]">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: product.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="text-xs text-[#71717A]">{product.description}</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-xs", product.inStock ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                      {product.inStock ? "In Stock" : "Out"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Revenue Summary */}
            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base text-white">Revenue</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]">
                      <Plus className="w-3 h-3" /> Log
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                    <DialogHeader><DialogTitle className="text-white">Log Atlas Revenue</DialogTitle></DialogHeader>
                    <Form method="post" className="space-y-4">
                      <input type="hidden" name="intent" value="add-atlas-metric" />
                      <Input name="recordedMonth" type="month" required className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white" />
                      <Input name="revenue" type="number" placeholder="Revenue ($)" required className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                      <Input name="unitsSold" type="number" placeholder="Units Sold" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                      <Input name="websiteVisits" type="number" placeholder="Website Visits" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                      <Input name="notes" placeholder="Notes" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                      <DialogClose asChild>
                        <Button type="submit" className="w-full bg-white text-[#08090A] hover:bg-white/90">Save</Button>
                      </DialogClose>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {sortedAtlas.length === 0 ? (
                  <p className="text-sm text-[#71717A] text-center py-6">No revenue data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sortedAtlas}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="recordedMonth" stroke="#71717A" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <YAxis stroke="#71717A" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SkyWay Tab */}
        <TabsContent value="skyway">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white text-[#08090A] hover:bg-white/90">
                  <Plus className="w-4 h-4" /> Add Feature
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                <DialogHeader><DialogTitle className="text-white">New SkyWay Feature</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-skyway-feature" />
                  <Input name="title" placeholder="Feature title" required className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Textarea name="description" placeholder="Description" rows={2} className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Select name="status" defaultValue="backlog" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white">
                    <option value="backlog">Backlog</option>
                    <option value="in_dev">In Development</option>
                    <option value="shipped">Shipped</option>
                  </Select>
                  <Input name="priority" type="number" placeholder="Priority (1=highest)" defaultValue="5" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full bg-white text-[#08090A] hover:bg-white/90">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Kanban Board */}
          <div className="grid md:grid-cols-3 gap-4">
            {(["backlog", "in_dev", "shipped"] as FeatureStatus[]).map((status) => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={cn("text-xs", featureStatusConfig[status].color)}>
                    {featureStatusConfig[status].label}
                  </Badge>
                  <span className="text-xs text-[#71717A]">({featuresByStatus[status].length})</span>
                </div>
                <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-white/[0.03] border border-[rgba(255,255,255,0.06)]">
                  {featuresByStatus[status].length === 0 ? (
                    <p className="text-xs text-[#71717A] text-center py-8">Empty</p>
                  ) : (
                    featuresByStatus[status]
                      .sort((a, b) => a.priority - b.priority)
                      .map((feature) => (
                        <Card key={feature.id} className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium text-white">{feature.title}</p>
                            {feature.description && (
                              <p className="text-xs text-[#71717A] mt-1">{feature.description}</p>
                            )}
                            <div className="flex gap-1 mt-2">
                              {status !== "backlog" && (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="update-feature-status" />
                                  <input type="hidden" name="id" value={feature.id} />
                                  <input type="hidden" name="status" value={status === "in_dev" ? "backlog" : "in_dev"} />
                                  <Button size="sm" className="h-6 text-xs px-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]" type="submit">
                                    ← Back
                                  </Button>
                                </Form>
                              )}
                              {status !== "shipped" && (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="update-feature-status" />
                                  <input type="hidden" name="id" value={feature.id} />
                                  <input type="hidden" name="status" value={status === "backlog" ? "in_dev" : "shipped"} />
                                  <Button size="sm" className="h-6 text-xs px-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]" type="submit">
                                    Next →
                                  </Button>
                                </Form>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white text-[#08090A] hover:bg-white/90">
                  <Plus className="w-4 h-4" /> Log Income
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                <DialogHeader><DialogTitle className="text-white">Log Monthly Income</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-income" />
                  <Input name="month" type="month" required className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white" />
                  <Input name="pilotIncome" type="number" placeholder="Pilot Income ($)" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Input name="creatorIncome" type="number" placeholder="Creator Income ($)" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Input name="atlasRevenue" type="number" placeholder="Atlas Revenue ($)" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Input name="brandDeals" type="number" placeholder="Brand Deals ($)" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Input name="expenses" type="number" placeholder="Total Expenses ($)" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full bg-white text-[#08090A] hover:bg-white/90">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {income.length === 0 ? (
            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardContent className="py-12 text-center">
                <DollarSign className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
                <p className="text-[#71717A] text-sm">No income data logged yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6 bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                <CardHeader>
                  <CardTitle className="text-base text-white">Monthly P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" stroke="#71717A" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <YAxis stroke="#71717A" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="pilot" name="Pilot" fill="#3B82F6" stackId="income" />
                      <Bar dataKey="creator" name="Creator" fill="#8B5CF6" stackId="income" />
                      <Bar dataKey="atlas" name="Atlas" fill="#10B981" stackId="income" />
                      <Bar dataKey="brands" name="Brand Deals" fill="#F59E0B" stackId="income" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {incomeData.slice(-1).map((entry) => (
                  <>
                    <Card key={`${entry.month}-total`} className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-[#71717A]">Total Revenue</p>
                        <p className="text-stat-sm text-emerald-400">{formatCurrency(entry.total)}</p>
                        <p className="text-xs text-[#71717A]">{entry.month}</p>
                      </CardContent>
                    </Card>
                    <Card key={`${entry.month}-net`} className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-[#71717A]">Net Income</p>
                        <p className={cn("text-stat-sm", entry.net >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {formatCurrency(entry.net)}
                        </p>
                        <p className="text-xs text-[#71717A]">{entry.month}</p>
                      </CardContent>
                    </Card>
                  </>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
