import { useState } from "react";
import { useLoaderData, Form } from "react-router";
import { User, Megaphone, Palette, Handshake, Plus, Save, Copy, ExternalLink, Camera, Play, Music2 } from "lucide-react";
import { kvGet, kvSet, kvAddItem } from "~/lib/kv.server";
import { PLATFORM_CONFIG, PLATFORMS, PILLAR_CONFIG, PILLARS } from "~/lib/constants";
import { generateId } from "~/lib/utils";
import type { BrandConfig, Collaboration, Platform, CollabStatus } from "~/lib/types";
import type { Route } from "./+types/brand";

export function meta() { return [{ title: "Brand Vault — FlyWithGarrett" }]; }

export async function loader() {
  const [brand, collabs] = await Promise.all([kvGet<BrandConfig>("brand:config"), kvGet<Collaboration[]>("brand:collabs")]);
  return { brand, collabs: collabs ?? [] };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  if (intent === "update-bio") {
    const brand = await kvGet<BrandConfig>("brand:config");
    if (brand) { brand.platformBios[formData.get("platform") as Platform] = formData.get("bio") as string; await kvSet("brand:config", brand); }
  } else if (intent === "add-collab") {
    await kvAddItem("brand:collabs", {
      id: generateId(), creatorName: formData.get("creatorName") as string,
      platform: formData.get("platform") as Platform, status: formData.get("status") as CollabStatus || "potential",
      notes: formData.get("notes") as string || "", dealTerms: formData.get("dealTerms") as string || "",
      createdAt: new Date().toISOString(),
    } satisfies Collaboration);
  }
  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };
const collabColors: Record<string, string> = { potential: "#ffffff30", outreach: "#0a84ff", negotiating: "#ffd60a", confirmed: "#30d158", completed: "#bf5af2" };

export default function BrandPage() {
  const { brand, collabs } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<"identity" | "bios" | "atlas" | "skyway" | "collabs">("identity");
  const [showCollab, setShowCollab] = useState(false);

  if (!brand) return <p className="text-[#ffffff50]">Loading...</p>;

  const tabs = [
    { key: "identity", label: "Identity", icon: User },
    { key: "bios", label: "Bios", icon: Megaphone },
    { key: "atlas", label: "Atlas", icon: Palette },
    { key: "skyway", label: "SkyWay", icon: ExternalLink },
    { key: "collabs", label: "Collabs", icon: Handshake },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-title">Brand Vault</h1>
        <p className="text-micro mt-2">Identity, bios, collabs & assets</p>
      </div>

      <div className="flex gap-1 p-1 rounded-[12px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-medium transition-all ${tab === t.key ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[#ffffff40] hover:text-[#ffffff70]"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === "identity" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-static p-5 space-y-4">
            <p className="text-section">Brand Identity</p>
            <div><p className="text-micro mb-1">Handle</p><p className="text-[14px] text-white">{brand.handle}</p></div>
            <div><p className="text-micro mb-1">Tagline</p><p className="text-[14px] text-white italic">"{brand.tagline}"</p></div>
            <div><p className="text-micro mb-1">Tone</p><div className="flex gap-1.5 flex-wrap">{brand.tone.map((t) => <span key={t} className="pill">{t}</span>)}</div></div>
          </div>
          <div className="card-static p-5 space-y-4">
            <p className="text-section">Audiences & Worlds</p>
            <div><p className="text-micro mb-1">Target Audiences</p>{brand.audiences.map((a) => <div key={a} className="flex items-center gap-2 py-0.5"><div className="w-1.5 h-1.5 rounded-full bg-white" /><span className="text-[13px] text-[#ffffffcc]">{a}</span></div>)}</div>
            <div><p className="text-micro mb-1">Content Worlds</p><div className="flex gap-1.5 flex-wrap">{brand.contentWorlds.map((w) => <span key={w} className="pill">{w}</span>)}</div></div>
          </div>
          <div className="card-static p-5 md:col-span-2">
            <p className="text-section mb-4">Pillar Colors</p>
            <div className="grid grid-cols-5 gap-3">
              {PILLARS.map((key) => (
                <div key={key} className="text-center">
                  <div className="w-full h-10 rounded-[10px] mb-1.5" style={{ backgroundColor: PILLAR_CONFIG[key].color }} />
                  <p className="text-[11px] text-white">{PILLAR_CONFIG[key].label}</p>
                  <p className="text-[10px] text-[#ffffff30]">{PILLAR_CONFIG[key].color}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "bios" && (
        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const Icon = platformIcons[platform];
            return (
              <div key={platform} className="card-static p-5">
                <div className="flex items-center gap-2 mb-3">
                  {Icon && <Icon className="w-4 h-4" style={{ color: PLATFORM_CONFIG[platform].color }} />}
                  <span className="text-[13px] font-medium text-white">{PLATFORM_CONFIG[platform].label}</span>
                </div>
                <Form method="post" className="space-y-2">
                  <input type="hidden" name="intent" value="update-bio" />
                  <input type="hidden" name="platform" value={platform} />
                  <textarea name="bio" defaultValue={brand.platformBios[platform]} rows={2} className="input-field text-[13px]" />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-ghost text-[12px] flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                    <button type="button" onClick={() => navigator.clipboard.writeText(brand.platformBios[platform])} className="btn-ghost text-[12px] flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                  </div>
                </Form>
              </div>
            );
          })}
        </div>
      )}

      {tab === "atlas" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card-static p-5">
            <p className="text-section mb-3">Product Line</p>
            {[{ name: "Grapefruit", color: "#F97316" }, { name: "Mixed Berry", color: "#8B5CF6" }, { name: "Strawberry Lemonade", color: "#EC4899" }, { name: "Lemon Lime", color: "#10B981" }].map((p) => (
              <div key={p.name} className="flex items-center gap-3 py-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[13px] text-white">{p.name}</span>
              </div>
            ))}
          </div>
          <div className="card-static p-5 space-y-3">
            <p className="text-section mb-1">Brand Messaging</p>
            <div><p className="text-micro">Positioning</p><p className="text-[13px] text-[#ffffffcc]">Clean, zero-sugar, vitamin-infused electrolytes</p></div>
            <div><p className="text-micro">Mission</p><p className="text-[13px] text-[#ffffffcc]">Clean water donation on every purchase</p></div>
          </div>
        </div>
      )}

      {tab === "skyway" && (
        <div className="card-static p-5 space-y-3">
          <p className="text-section">SkyWay App</p>
          <p className="text-[13px] text-[#ffffffcc]">Pilot lifestyle planning app — scheduling, trips, crew coordination.</p>
          <div className="flex gap-2"><span className="pill" style={{ color: "#0a84ff" }}>In Development</span><span className="pill">MVP Phase</span></div>
        </div>
      )}

      {tab === "collabs" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCollab(!showCollab)} className="btn-ghost flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Collab</button>
          </div>
          {showCollab && (
            <Form method="post" className="card-static p-5 space-y-3" onSubmit={() => setShowCollab(false)}>
              <input type="hidden" name="intent" value="add-collab" />
              <input name="creatorName" placeholder="Creator / Brand name" required className="input-field" />
              <div className="grid grid-cols-2 gap-3">
                <select name="platform" defaultValue="instagram" className="input-field">{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}</select>
                <select name="status" defaultValue="potential" className="input-field">
                  {["potential", "outreach", "negotiating", "confirmed", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <input name="dealTerms" placeholder="Deal terms" className="input-field" />
              <textarea name="notes" placeholder="Notes" rows={2} className="input-field" />
              <button type="submit" className="btn-primary">Save</button>
            </Form>
          )}
          {collabs.length === 0 ? (
            <div className="card-static p-10 text-center"><Handshake className="w-6 h-6 text-[#ffffff15] mx-auto mb-2" /><p className="text-[13px] text-[#ffffff50]">No collaborations yet.</p></div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {collabs.map((c) => (
                <div key={c.id} className="card-static p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-medium text-white">{c.creatorName}</p>
                    <span className="pill text-[10px]" style={{ color: collabColors[c.status] }}>{c.status}</span>
                  </div>
                  <p className="text-micro">{PLATFORM_CONFIG[c.platform].label}</p>
                  {c.dealTerms && <p className="text-[12px] text-[#ffffffcc] mt-1">{c.dealTerms}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
