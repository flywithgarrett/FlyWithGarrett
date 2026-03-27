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
        <h1 className="text-2xl font-bold">Business Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">Atlas Hydration, SkyWay & finances</p>
      </div>

      <Tabs defaultValue="atlas">
        <TabsList className="flex-wrap">
          <TabsTrigger value="atlas" className="gap-1.5"><Droplets className="w-3.5 h-3.5" /> Atlas</TabsTrigger>
          <TabsTrigger value="skyway" className="gap-1.5"><Smartphone className="w-3.5 h-3.5" /> SkyWay</TabsTrigger>
          <TabsTrigger value="income" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Income</TabsTrigger>
        </TabsList>

        {/* Atlas Tab */}
        <TabsContent value="atlas">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Product Catalog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {atlasProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: product.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.description}</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-xs", product.inStock ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                      {product.inStock ? "In Stock" : "Out"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Revenue Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Revenue</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="gap-1"><Plus className="w-3 h-3" /> Log</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Log Atlas Revenue</DialogTitle></DialogHeader>
                    <Form method="post" className="space-y-4">
                      <input type="hidden" name="intent" value="add-atlas-metric" />
                      <Input name="recordedMonth" type="month" required />
                      <Input name="revenue" type="number" placeholder="Revenue ($)" required />
                      <Input name="unitsSold" type="number" placeholder="Units Sold" />
                      <Input name="websiteVisits" type="number" placeholder="Website Visits" />
                      <Input name="notes" placeholder="Notes" />
                      <DialogClose asChild>
                        <Button type="submit" className="w-full">Save</Button>
                      </DialogClose>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {sortedAtlas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No revenue data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sortedAtlas}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="recordedMonth" stroke="#64748B" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1E293B", borderRadius: "8px" }} />
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
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Feature</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New SkyWay Feature</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-skyway-feature" />
                  <Input name="title" placeholder="Feature title" required />
                  <Textarea name="description" placeholder="Description" rows={2} />
                  <Select name="status" defaultValue="backlog">
                    <option value="backlog">Backlog</option>
                    <option value="in_dev">In Development</option>
                    <option value="shipped">Shipped</option>
                  </Select>
                  <Input name="priority" type="number" placeholder="Priority (1=highest)" defaultValue="5" />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
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
                  <span className="text-xs text-muted-foreground">({featuresByStatus[status].length})</span>
                </div>
                <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-secondary/30">
                  {featuresByStatus[status].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Empty</p>
                  ) : (
                    featuresByStatus[status]
                      .sort((a, b) => a.priority - b.priority)
                      .map((feature) => (
                        <Card key={feature.id} className="bg-card">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium">{feature.title}</p>
                            {feature.description && (
                              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                            )}
                            <div className="flex gap-1 mt-2">
                              {status !== "backlog" && (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="update-feature-status" />
                                  <input type="hidden" name="id" value={feature.id} />
                                  <input type="hidden" name="status" value={status === "in_dev" ? "backlog" : "in_dev"} />
                                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" type="submit">
                                    ← Back
                                  </Button>
                                </Form>
                              )}
                              {status !== "shipped" && (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="update-feature-status" />
                                  <input type="hidden" name="id" value={feature.id} />
                                  <input type="hidden" name="status" value={status === "backlog" ? "in_dev" : "shipped"} />
                                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" type="submit">
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
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Log Income</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Monthly Income</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-income" />
                  <Input name="month" type="month" required />
                  <Input name="pilotIncome" type="number" placeholder="Pilot Income ($)" />
                  <Input name="creatorIncome" type="number" placeholder="Creator Income ($)" />
                  <Input name="atlasRevenue" type="number" placeholder="Atlas Revenue ($)" />
                  <Input name="brandDeals" type="number" placeholder="Brand Deals ($)" />
                  <Input name="expenses" type="number" placeholder="Total Expenses ($)" />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {income.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No income data logged yet.</p>
            </CardContent></Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Monthly P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="month" stroke="#64748B" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1E293B", borderRadius: "8px" }} />
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
                    <Card key={`${entry.month}-total`}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(entry.total)}</p>
                        <p className="text-xs text-muted-foreground">{entry.month}</p>
                      </CardContent>
                    </Card>
                    <Card key={`${entry.month}-net`}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">Net Income</p>
                        <p className={cn("text-xl font-bold", entry.net >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {formatCurrency(entry.net)}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.month}</p>
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
