import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import {
  User, Megaphone, Palette, Handshake, Plus,
  Save, Copy, ExternalLink, Camera, Play, Music2, X,
} from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { PLATFORM_CONFIG, PLATFORMS, PILLAR_CONFIG } from "~/lib/constants";
import { cn, generateId } from "~/lib/utils";
import type { BrandConfig, Collaboration, Platform, CollabStatus } from "~/lib/types";
import type { Route } from "./+types/brand";

export function meta() {
  return [{ title: "Brand Vault — FlyWithGarrett" }];
}

export async function loader() {
  const [brand, collabs] = await Promise.all([
    kvGet<BrandConfig>("brand:config"),
    kvGet<Collaboration[]>("brand:collabs"),
  ]);
  return { brand, collabs: collabs ?? [] };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-bio") {
    const platform = formData.get("platform") as Platform;
    const bio = formData.get("bio") as string;
    const brand = await kvGet<BrandConfig>("brand:config");
    if (brand) {
      brand.platformBios[platform] = bio;
      await kvSet("brand:config", brand);
    }
  } else if (intent === "add-collab") {
    const collab: Collaboration = {
      id: generateId(),
      creatorName: formData.get("creatorName") as string,
      platform: formData.get("platform") as Platform,
      status: formData.get("status") as CollabStatus || "potential",
      notes: formData.get("notes") as string || "",
      dealTerms: formData.get("dealTerms") as string || "",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("brand:collabs", collab);
  }

  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  youtube: Play,
  tiktok: Music2,
};

const statusColors: Record<CollabStatus, { bg: string; text: string }> = {
  potential: { bg: "rgba(255,255,255,0.08)", text: "#ffffff50" },
  outreach: { bg: "rgba(10,132,255,0.15)", text: "#0a84ff" },
  negotiating: { bg: "rgba(255,214,10,0.15)", text: "#ffd60a" },
  confirmed: { bg: "rgba(48,209,88,0.15)", text: "#30d158" },
  completed: { bg: "rgba(191,90,242,0.15)", text: "#bf5af2" },
};

type TabKey = "identity" | "bios" | "atlas" | "skyway" | "collabs";

const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "identity", label: "Identity", icon: User },
  { key: "bios", label: "Bios", icon: Megaphone },
  { key: "atlas", label: "Atlas", icon: Palette },
  { key: "skyway", label: "SkyWay", icon: ExternalLink },
  { key: "collabs", label: "Collabs", icon: Handshake },
];

export default function BrandPage() {
  const { brand, collabs } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [showAddCollab, setShowAddCollab] = useState(false);

  if (!brand) return <div className="text-[#ffffff50]">Loading brand data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Brand Vault</h1>
        <p className="text-micro mt-1">Identity, bios, collabs & brand assets</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 rounded-[10px] bg-[rgba(255,255,255,0.04)] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors",
                activeTab === tab.key ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#ffffff50] hover:text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Identity Tab */}
      {activeTab === "identity" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-static p-5">
            <h3 className="text-section mb-4">BRAND IDENTITY</h3>
            <div className="space-y-4">
              <div>
                <p className="text-micro mb-1">Handle</p>
                <p className="text-[14px] font-medium text-white">@flywithgarrett</p>
              </div>
              <div>
                <p className="text-micro mb-1">Tagline</p>
                <p className="text-[14px] font-medium text-white italic">"Living at altitude."</p>
              </div>
              <div>
                <p className="text-micro mb-1">Tone</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Authentic", "Aspirational", "Approachable"].map((t) => (
                    <span key={t} className="pill px-2.5 py-1 text-[12px] text-[#ffffffcc]">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-static p-5">
            <h3 className="text-section mb-4">AUDIENCES & WORLDS</h3>
            <div className="space-y-4">
              <div>
                <p className="text-micro mb-2">Target Audiences</p>
                <div className="space-y-1.5">
                  {["Aviation Dreamers", "Lifestyle Followers", "Founder Curious"].map((a) => (
                    <div key={a} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="text-body text-sm">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-micro mb-2">Content Worlds</p>
                <div className="flex flex-wrap gap-2">
                  {["The Flight Deck", "The Life", "The Build"].map((w) => (
                    <span key={w} className="pill px-2.5 py-1 text-[12px] text-[#ffffffcc]">{w}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="md:col-span-2 card-static p-5">
            <h3 className="text-section mb-4">CONTENT PILLAR COLORS</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                <div key={key} className="text-center">
                  <div className="w-full h-12 rounded-lg mb-1.5" style={{ backgroundColor: val.color }} />
                  <p className="text-xs font-medium text-white">{val.label}</p>
                  <p className="text-[10px] text-[#ffffff50]">{val.color}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bios Tab */}
      {activeTab === "bios" && (
        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const Icon = platformIcons[platform];
            return (
              <div key={platform} className="card-static p-5">
                <div className="flex items-center gap-2 mb-3">
                  {Icon && <Icon className="w-4 h-4" style={{ color: PLATFORM_CONFIG[platform].color }} />}
                  <span className="text-[13px] font-medium text-white">{PLATFORM_CONFIG[platform].label}</span>
                </div>
                <Form method="post" className="space-y-3">
                  <input type="hidden" name="intent" value="update-bio" />
                  <input type="hidden" name="platform" value={platform} />
                  <textarea
                    name="bio"
                    defaultValue={brand.platformBios[platform]}
                    rows={2}
                    className="input-field w-full"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary h-8 px-3 text-[13px] font-medium flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-8 px-3"
                      onClick={() => navigator.clipboard.writeText(brand.platformBios[platform])}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Form>
              </div>
            );
          })}
        </div>
      )}

      {/* Atlas Tab */}
      {activeTab === "atlas" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-static p-5">
            <h3 className="text-section mb-4">PRODUCT LINE</h3>
            <div className="space-y-2">
              {[
                { name: "Grapefruit", color: "#F97316" },
                { name: "Mixed Berry", color: "#8B5CF6" },
                { name: "Strawberry Lemonade", color: "#EC4899" },
                { name: "Lemon Lime", color: "#10B981" },
              ].map((product) => (
                <div key={product.name} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.04)]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.color }} />
                  <span className="text-[14px] font-medium text-white">{product.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-static p-5">
            <h3 className="text-section mb-4">BRAND MESSAGING</h3>
            <div className="space-y-3">
              <div>
                <p className="text-micro mb-1">Positioning</p>
                <p className="text-body text-sm">Clean, zero-sugar, vitamin-infused electrolytes for active lifestyles</p>
              </div>
              <div>
                <p className="text-micro mb-1">Mission</p>
                <p className="text-body text-sm">Clean water donation on every purchase</p>
              </div>
              <div>
                <p className="text-micro mb-1">Key Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Zero Sugar", "Vitamin-Infused", "Clean Ingredients", "Electrolytes", "Clean Water Mission"].map((f) => (
                    <span key={f} className="pill px-2.5 py-1 text-[12px]" style={{ backgroundColor: "rgba(48,209,88,0.1)", color: "#30d158", borderColor: "rgba(48,209,88,0.2)" }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SkyWay Tab */}
      {activeTab === "skyway" && (
        <div className="card-static p-5">
          <h3 className="text-section mb-4">SKYWAY APP</h3>
          <div className="space-y-3">
            <div>
              <p className="text-micro mb-1">Description</p>
              <p className="text-body text-sm">Pilot lifestyle planning app — scheduling, trips, crew coordination, and commute planning for airline pilots.</p>
            </div>
            <div>
              <p className="text-micro mb-1">Status</p>
              <span className="pill px-2.5 py-1 text-[12px]" style={{ backgroundColor: "rgba(10,132,255,0.15)", color: "#0a84ff", borderColor: "rgba(10,132,255,0.2)" }}>In Development</span>
            </div>
            <div>
              <p className="text-micro mb-1">Content Strategy</p>
              <ul className="text-body text-sm space-y-1">
                <li>- Build-in-public series on founder journey</li>
                <li>- Feature teasers on Instagram/TikTok</li>
                <li>- Beta waitlist campaign</li>
                <li>- Pilot community engagement</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Collabs Tab */}
      {activeTab === "collabs" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddCollab(true)}
              className="btn-primary h-9 px-4 text-[13px] font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Collab
            </button>
          </div>

          {collabs.length === 0 ? (
            <div className="card-static p-12 text-center">
              <Handshake className="w-8 h-8 text-[#ffffff50] mx-auto mb-2" />
              <p className="text-micro">No collaborations tracked yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {collabs.map((collab) => {
                const sc = statusColors[collab.status];
                return (
                  <div key={collab.id} className="card-static p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-white">{collab.creatorName}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>{collab.status}</span>
                    </div>
                    <p className="text-micro capitalize">{PLATFORM_CONFIG[collab.platform].label}</p>
                    {collab.dealTerms && <p className="text-body text-xs mt-1">{collab.dealTerms}</p>}
                    {collab.notes && <p className="text-micro mt-1">{collab.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Collab Dialog */}
          {showAddCollab && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddCollab(false)} />
              <div className="relative w-full max-w-md card-static p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[16px] font-medium text-white">New Collaboration</h2>
                  <button onClick={() => setShowAddCollab(false)} className="p-1 hover:bg-[rgba(255,255,255,0.08)] rounded">
                    <X className="w-4 h-4 text-[#ffffff50]" />
                  </button>
                </div>
                <Form method="post" className="space-y-4" onSubmit={() => setShowAddCollab(false)}>
                  <input type="hidden" name="intent" value="add-collab" />
                  <input name="creatorName" placeholder="Creator / Brand name" required className="input-field w-full" />
                  <select name="platform" defaultValue="instagram" className="input-field w-full">
                    {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}
                  </select>
                  <select name="status" defaultValue="potential" className="input-field w-full">
                    <option value="potential">Potential</option>
                    <option value="outreach">Outreach</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                  </select>
                  <input name="dealTerms" placeholder="Deal terms" className="input-field w-full" />
                  <textarea name="notes" placeholder="Notes" rows={2} className="input-field w-full" />
                  <button type="submit" className="btn-primary w-full h-10 text-[13px] font-medium">Save</button>
                </Form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
