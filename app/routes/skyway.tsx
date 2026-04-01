import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  Smartphone, Rocket, Plus, X, Trash2, Users,
  Clock, Target, ChevronRight,
} from "lucide-react";
import { kvGet, kvSet, kvAddItem, kvUpdateItem, kvDeleteItem } from "~/lib/kv.server";
import { generateId } from "~/lib/utils";
import type { Route } from "./+types/skyway";

interface SkywayFeature {
  id: string;
  title: string;
  description: string;
  status: "backlog" | "in_dev" | "testing" | "shipped";
  priority: "high" | "med" | "low";
  effort: "S" | "M" | "L" | "XL";
  createdAt: string;
}

type FeatureStatus = SkywayFeature["status"];

const DEFAULT_FEATURES: SkywayFeature[] = [
  { id: "sw-1", title: "Flighty-style premium UI", description: "Clean, premium flight tracking interface", status: "backlog", priority: "high", effort: "XL", createdAt: new Date().toISOString() },
  { id: "sw-2", title: "Live flight tracking map", description: "Real-time aircraft position on map", status: "backlog", priority: "high", effort: "XL", createdAt: new Date().toISOString() },
  { id: "sw-3", title: "ATC audio transcription", description: "Transcribe and display ATC communications", status: "backlog", priority: "med", effort: "L", createdAt: new Date().toISOString() },
  { id: "sw-4", title: "Mobile PWA", description: "Progressive web app for mobile devices", status: "backlog", priority: "high", effort: "M", createdAt: new Date().toISOString() },
  { id: "sw-5", title: "iOS App Store", description: "Native iOS app submission", status: "backlog", priority: "med", effort: "XL", createdAt: new Date().toISOString() },
  { id: "sw-6", title: "Push notifications", description: "Flight status and delay alerts", status: "backlog", priority: "med", effort: "M", createdAt: new Date().toISOString() },
  { id: "sw-7", title: "Crew scheduling", description: "Crew roster and schedule management", status: "backlog", priority: "low", effort: "L", createdAt: new Date().toISOString() },
  { id: "sw-8", title: "Weather overlay", description: "Weather radar and conditions on map", status: "backlog", priority: "med", effort: "L", createdAt: new Date().toISOString() },
  { id: "sw-9", title: "Airport info cards", description: "Detailed airport information and maps", status: "backlog", priority: "low", effort: "M", createdAt: new Date().toISOString() },
  { id: "sw-10", title: "Social sharing", description: "Share flight status to social media", status: "backlog", priority: "low", effort: "S", createdAt: new Date().toISOString() },
];

const STATUS_COLUMNS: { key: FeatureStatus; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "rgba(245,245,245,0.4)" },
  { key: "in_dev", label: "In Dev", color: "#007aff" },
  { key: "testing", label: "Testing", color: "#ff9f0a" },
  { key: "shipped", label: "Shipped", color: "#34c759" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ff3b30",
  med: "#ff9f0a",
  low: "#34c759",
};

const EFFORT_LABELS: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
};

const PROJECT_START = new Date("2025-01-15");

export function meta() {
  return [{ title: "SkyWay — FlyWithGarrett" }];
}

export async function loader() {
  let features = await kvGet<SkywayFeature[]>("skyway:features");
  if (!features || features.length === 0) {
    features = DEFAULT_FEATURES;
    await kvSet("skyway:features", features);
  }

  const [sprint, waitlist] = await Promise.all([
    kvGet<string>("skyway:sprint"),
    kvGet<number>("skyway:waitlist"),
  ]);

  return {
    features,
    sprint: sprint ?? "",
    waitlist: waitlist ?? 0,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-feature") {
    const feature: SkywayFeature = {
      id: generateId(),
      title: formData.get("title") as string,
      description: formData.get("description") as string || "",
      status: "backlog",
      priority: formData.get("priority") as SkywayFeature["priority"] || "med",
      effort: formData.get("effort") as SkywayFeature["effort"] || "M",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("skyway:features", feature);
  } else if (intent === "move-feature") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as FeatureStatus;
    await kvUpdateItem<SkywayFeature>("skyway:features", id, { status });
  } else if (intent === "delete-feature") {
    const id = formData.get("id") as string;
    await kvDeleteItem<SkywayFeature>("skyway:features", id);
  } else if (intent === "save-sprint") {
    const notes = formData.get("notes") as string;
    await kvSet("skyway:sprint", notes);
  } else if (intent === "update-waitlist") {
    const count = Number(formData.get("count") || 0);
    await kvSet("skyway:waitlist", count);
  }

  return { ok: true };
}

export default function SkyWayPage() {
  const { features, sprint, waitlist } = useLoaderData<typeof loader>();
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);

  const daysSinceStart = Math.floor(
    (Date.now() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24)
  );

  const featuresByStatus = (status: FeatureStatus) =>
    features.filter((f) => f.status === status);

  const shippedCount = featuresByStatus("shipped").length;
  const totalCount = features.length;

  const nextStatus = (current: FeatureStatus): FeatureStatus | null => {
    const order: FeatureStatus[] = ["backlog", "in_dev", "testing", "shipped"];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const prevStatus = (current: FeatureStatus): FeatureStatus | null => {
    const order: FeatureStatus[] = ["backlog", "in_dev", "testing", "shipped"];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-title">SkyWay</p>
        <p className="text-[14px] text-[rgba(245,245,245,0.55)] mt-1">
          Flight tracker app build dashboard
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Phase</p>
          <p className="text-[15px] font-semibold text-[#007aff] mt-1">
            MVP Build
          </p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Days Since Start</p>
          <p className="text-stat mt-1">{daysSinceStart}</p>
          <p className="text-[11px] text-[rgba(245,245,245,0.3)]">Jan 15, 2025</p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Features Shipped</p>
          <p className="text-stat mt-1">
            {shippedCount}/{totalCount}
          </p>
        </div>
        <div className="card-static text-center">
          <p className="text-micro text-[rgba(245,245,245,0.55)]">Beta Waitlist</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Users className="w-4 h-4 text-[#007aff]" />
            <p className="text-stat">{waitlist}</p>
          </div>
          <button
            onClick={() => setShowWaitlistForm(!showWaitlistForm)}
            className="text-[11px] text-[#007aff] mt-1"
          >
            Update
          </button>
        </div>
      </div>

      {/* Waitlist Update Form */}
      {showWaitlistForm && (
        <Form
          method="post"
          className="card-static flex gap-3 items-end"
          onSubmit={() => setShowWaitlistForm(false)}
        >
          <input type="hidden" name="intent" value="update-waitlist" />
          <div className="flex-1">
            <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
              Waitlist Count
            </label>
            <input
              type="number"
              name="count"
              defaultValue={waitlist}
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary text-[13px] h-10">
            Save
          </button>
        </Form>
      )}

      {/* Feature Kanban */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-section">Feature Board</p>
          <button
            onClick={() => setShowFeatureForm(!showFeatureForm)}
            className="btn-primary text-[13px] flex items-center gap-1.5"
          >
            {showFeatureForm ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {showFeatureForm ? "Cancel" : "Add Feature"}
          </button>
        </div>

        {showFeatureForm && (
          <Form
            method="post"
            className="card-static mb-4 space-y-4"
            onSubmit={() => setShowFeatureForm(false)}
          >
            <input type="hidden" name="intent" value="add-feature" />
            <div>
              <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                Title
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Feature name..."
                className="input-field"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="What does this feature do?"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                  Priority
                </label>
                <select name="priority" defaultValue="med" className="input-field">
                  <option value="high">High</option>
                  <option value="med">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-[rgba(245,245,245,0.55)] mb-1 block">
                  Effort
                </label>
                <select name="effort" defaultValue="M" className="input-field">
                  <option value="S">S - Small</option>
                  <option value="M">M - Medium</option>
                  <option value="L">L - Large</option>
                  <option value="XL">XL - Extra Large</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary text-[13px] w-full">
              Add Feature
            </button>
          </Form>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => (
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
                  ({featuresByStatus(col.key).length})
                </span>
              </div>
              <div className="space-y-2 min-h-[150px] p-2 rounded-[14px] bg-[rgba(255,255,255,0.04)]">
                {featuresByStatus(col.key).length === 0 ? (
                  <p className="text-micro text-center py-6">Empty</p>
                ) : (
                  featuresByStatus(col.key).map((feature) => (
                    <div key={feature.id} className="card-static !p-3">
                      <p className="text-[13px] font-medium text-[#f5f5f5]">
                        {feature.title}
                      </p>
                      {feature.description && (
                        <p className="text-[11px] text-[rgba(245,245,245,0.55)] mt-0.5 line-clamp-2">
                          {feature.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor:
                              PRIORITY_COLORS[feature.priority] + "18",
                            color: PRIORITY_COLORS[feature.priority],
                          }}
                        >
                          {feature.priority}
                        </span>
                        <span className="pill text-[10px]">
                          {feature.effort}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {prevStatus(feature.status) && (
                          <Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="move-feature"
                            />
                            <input
                              type="hidden"
                              name="id"
                              value={feature.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value={prevStatus(feature.status)!}
                            />
                            <button
                              type="submit"
                              className="btn-ghost h-6 px-2 text-[11px]"
                            >
                              &larr;
                            </button>
                          </Form>
                        )}
                        {nextStatus(feature.status) && (
                          <Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="move-feature"
                            />
                            <input
                              type="hidden"
                              name="id"
                              value={feature.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value={nextStatus(feature.status)!}
                            />
                            <button
                              type="submit"
                              className="btn-ghost h-6 px-2 text-[11px]"
                            >
                              &rarr;
                            </button>
                          </Form>
                        )}
                        <Form method="post" className="ml-auto">
                          <input
                            type="hidden"
                            name="intent"
                            value="delete-feature"
                          />
                          <input
                            type="hidden"
                            name="id"
                            value={feature.id}
                          />
                          <button
                            type="submit"
                            className="btn-ghost h-6 px-1.5 text-[rgba(245,245,245,0.3)] hover:text-[#ff3b30]"
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

      {/* Sprint Tracker */}
      <div>
        <p className="text-section mb-3">Sprint Notes</p>
        <Form method="post" className="card-static space-y-3">
          <input type="hidden" name="intent" value="save-sprint" />
          <textarea
            name="notes"
            rows={4}
            defaultValue={sprint}
            placeholder="What are you working on this sprint? Goals, blockers, notes..."
            className="input-field w-full"
          />
          <button type="submit" className="btn-ghost text-[13px]">
            Save Sprint Notes
          </button>
        </Form>
      </div>
    </div>
  );
}
