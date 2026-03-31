import { useState } from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import { Lightbulb, Layers, Plus, Trash2, Sparkles, Zap, RefreshCw, Camera, Play, Music2, Scissors, Smile, Flame, ClipboardCopy, CalendarPlus } from "lucide-react";
import { kvGet, kvSet, kvAddItem, kvDeleteItem } from "~/lib/kv.server";
import { generateScript, editScript } from "~/lib/ai.server";
import { PILLAR_CONFIG, PILLARS, PILLAR_HOOKS, PLATFORMS } from "~/lib/constants";
import { generateId } from "~/lib/utils";
import type { Idea, ContentSeries, Pillar } from "~/lib/types";
import type { Route } from "./+types/studio";

export function meta() { return [{ title: "Content Studio — FlyWithGarrett" }]; }

export async function loader() {
  const [ideas, series, currentScript] = await Promise.all([
    kvGet<Idea[]>("ideas:bank"),
    kvGet<ContentSeries[]>("content:series"),
    kvGet<{ hook: string; format: string; script: string; pillar: Pillar } | null>("studio:current_script"),
  ]);
  return { ideas: ideas ?? [], series: series ?? [], currentScript };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-idea") {
    await kvAddItem("ideas:bank", {
      id: generateId(), title: formData.get("title") as string,
      pillar: formData.get("pillar") as Pillar,
      hookDraft: formData.get("hookDraft") as string || "",
      notes: "", status: "raw", createdAt: new Date().toISOString(),
    } satisfies Idea);
  } else if (intent === "delete-idea") {
    await kvDeleteItem<Idea>("ideas:bank", formData.get("id") as string);
  } else if (intent === "write-script") {
    const hook = formData.get("hook") as string;
    const format = formData.get("format") as string || "Reel";
    const pillar = formData.get("pillar") as Pillar || "lifestyle";
    const script = await generateScript(hook, format);
    if (script) await kvSet("studio:current_script", { hook, format, script, pillar });
  } else if (intent === "edit-script") {
    const current = await kvGet<{ hook: string; format: string; script: string; pillar: Pillar }>("studio:current_script");
    if (current) {
      const instruction = formData.get("instruction") as string;
      const edited = await editScript(current.script, instruction);
      if (edited) { current.script = edited; await kvSet("studio:current_script", current); }
    }
  } else if (intent === "save-script-to-ideas") {
    const current = await kvGet<{ hook: string; format: string; script: string; pillar: Pillar }>("studio:current_script");
    if (current) {
      await kvAddItem("ideas:bank", {
        id: generateId(), title: current.hook, pillar: current.pillar,
        hookDraft: current.hook, notes: current.script, status: "raw",
        createdAt: new Date().toISOString(),
      } satisfies Idea);
    }
  }
  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };

export default function StudioPage() {
  const { ideas, series, currentScript } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [tab, setTab] = useState<"pillars" | "script" | "ideas" | "series">(currentScript ? "script" : "pillars");
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null);
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isGenerating = fetcher.state !== "idle";

  const filteredIdeas = ideas.filter((i) => filterPillar === "all" || i.pillar === filterPillar);
  const tabs = [
    { key: "pillars", label: "Pillars & Hooks", icon: Zap },
    { key: "script", label: "Script Writer", icon: Sparkles },
    { key: "ideas", label: `Idea Bank (${ideas.length})`, icon: Lightbulb },
    { key: "series", label: `Series (${series.length})`, icon: Layers },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-title">Content Studio</h1>
        <p className="text-micro mt-2">Pillars, scripts, ideas & series</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[12px] bg-[rgba(255,255,255,0.04)] border border-[transparent] w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-medium transition-all ${
              tab === t.key ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[rgba(235,235,245,0.25)] hover:text-[#ffffff70]"
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* PILLARS & HOOKS */}
      {tab === "pillars" && (
        <div className="space-y-3">
          {PILLARS.map((key) => {
            const p = PILLAR_CONFIG[key];
            const hooks = PILLAR_HOOKS[key];
            const isExpanded = expandedPillar === key;
            return (
              <div key={key} className="card-static overflow-hidden" style={{ borderLeft: `2px solid ${p.color}` }}>
                <button onClick={() => setExpandedPillar(isExpanded ? null : key)}
                  className="w-full flex items-start justify-between p-5 text-left">
                  <div>
                    <p className="text-[15px] font-medium text-white">{p.label}</p>
                    <p className="text-[12px] text-[rgba(235,235,245,0.3)] mt-1">{p.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {p.platforms.map((pl) => { const I = platformIcons[pl]; return I ? <I key={pl} className="w-3.5 h-3.5 text-[rgba(235,235,245,0.2)]" /> : null; })}
                      <span className="text-micro ml-1">Series: {p.series}</span>
                      <span className="text-micro">• {hooks.length} hooks</span>
                    </div>
                  </div>
                  <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: p.color + "40" }} />
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-2">
                    <div className="divider mb-3" />
                    {hooks.map((hook, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-[10px] bg-[rgba(255,255,255,0.04)]">
                        <p className="text-[13px] text-[rgba(235,235,245,0.6)] flex-1">"{hook}"</p>
                        <div className="flex gap-1 shrink-0">
                          <fetcher.Form method="post">
                            <input type="hidden" name="intent" value="write-script" />
                            <input type="hidden" name="hook" value={hook} />
                            <input type="hidden" name="format" value="Reel" />
                            <input type="hidden" name="pillar" value={key} />
                            <button type="submit" className="btn-ghost text-[11px] py-1 px-2" onClick={() => setTab("script")}>Write Script</button>
                          </fetcher.Form>
                          <Form method="post">
                            <input type="hidden" name="intent" value="add-idea" />
                            <input type="hidden" name="title" value={hook} />
                            <input type="hidden" name="pillar" value={key} />
                            <input type="hidden" name="hookDraft" value={hook} />
                            <button type="submit" className="btn-ghost text-[11px] py-1 px-2">Save</button>
                          </Form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SCRIPT WRITER */}
      {tab === "script" && (
        <div className="space-y-5">
          {!currentScript && !isGenerating ? (
            <div className="card-static p-12 text-center">
              <Sparkles className="w-8 h-8 text-[rgba(235,235,245,0.1)] mx-auto mb-3" />
              <p className="text-[15px] text-white mb-1">No script in progress</p>
              <p className="text-micro">Click "Write Script" on any hook from the Pillars tab to start.</p>
            </div>
          ) : isGenerating && !currentScript ? (
            <div className="card-static p-12 text-center">
              <RefreshCw className="w-6 h-6 text-[#bf5af2] mx-auto mb-3 animate-spin" />
              <p className="text-[14px] text-white">Writing your script...</p>
            </div>
          ) : currentScript && (
            <>
              <div className="card-static p-5" style={{ borderLeft: `2px solid ${PILLAR_CONFIG[currentScript.pillar]?.color || "#fff"}` }}>
                <p className="text-micro mb-1">Hook</p>
                <p className="text-[15px] font-medium text-white">"{currentScript.hook}"</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="pill">{currentScript.format}</span>
                  <span className="pill" style={{ color: PILLAR_CONFIG[currentScript.pillar]?.color }}>{PILLAR_CONFIG[currentScript.pillar]?.label}</span>
                </div>
              </div>
              <div className="card-static p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[14px] font-medium text-white">Script</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => { navigator.clipboard.writeText(currentScript.script); setCopiedId("script"); setTimeout(() => setCopiedId(null), 2000); }}
                      className="btn-ghost text-[11px] py-1 px-2 flex items-center gap-1">
                      <ClipboardCopy className="w-3 h-3" /> {copiedId === "script" ? "Copied" : "Copy"}
                    </button>
                    <Form method="post">
                      <input type="hidden" name="intent" value="save-script-to-ideas" />
                      <button type="submit" className="btn-ghost text-[11px] py-1 px-2 flex items-center gap-1"><CalendarPlus className="w-3 h-3" /> Save to Ideas</button>
                    </Form>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-[13px] text-[#ffffffbb] leading-relaxed">{currentScript.script}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Make it shorter", icon: Scissors, instruction: "Make this script shorter and more concise. Keep the energy." },
                  { label: "Make it funnier", icon: Smile, instruction: "Add more humor and personality. Make it funnier while keeping it authentic." },
                  { label: "More personality", icon: Flame, instruction: "Add more of Garrett's personality. More authentic, more 'him'." },
                  { label: "Add a hook", icon: Zap, instruction: "Add a stronger opening hook that stops the scroll. First 3 seconds are everything." },
                ].map((edit) => (
                  <fetcher.Form key={edit.label} method="post">
                    <input type="hidden" name="intent" value="edit-script" />
                    <input type="hidden" name="instruction" value={edit.instruction} />
                    <button type="submit" disabled={isGenerating} className="btn-ghost text-[12px] py-1.5 flex items-center gap-1.5">
                      <edit.icon className="w-3 h-3" /> {edit.label}
                    </button>
                  </fetcher.Form>
                ))}
              </div>
              <fetcher.Form method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="write-script" />
                <input type="hidden" name="hook" value={currentScript.hook} />
                <input type="hidden" name="pillar" value={currentScript.pillar} />
                <select name="format" defaultValue={currentScript.format} className="input-field w-40">
                  {["Reel", "TikTok", "YouTube", "Story", "Caption"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <button type="submit" disabled={isGenerating} className="btn-ghost flex items-center gap-1.5">
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} /> Regenerate
                </button>
              </fetcher.Form>
            </>
          )}
        </div>
      )}

      {/* IDEA BANK */}
      {tab === "ideas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="input-field w-48">
              <option value="all">All Pillars</option>
              {PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}
            </select>
            <Form method="post" className="flex gap-2">
              <input type="hidden" name="intent" value="add-idea" />
              <input name="title" placeholder="Quick idea — type a hook..." required className="input-field w-72" />
              <input type="hidden" name="pillar" value="lifestyle" />
              <button type="submit" className="btn-ghost flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </Form>
          </div>
          {filteredIdeas.length === 0 ? (
            <div className="card-static p-12 text-center">
              <Lightbulb className="w-6 h-6 text-[rgba(235,235,245,0.1)] mx-auto mb-2" />
              <p className="text-[13px] text-[rgba(235,235,245,0.3)]">No ideas yet. Save hooks from Pillars or add one above.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredIdeas.map((idea) => (
                <div key={idea.id} className="card-static p-4" style={{ borderLeft: `2px solid ${PILLAR_CONFIG[idea.pillar]?.color || "#fff"}30` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{idea.title}</p>
                      <p className="text-[11px] mt-1" style={{ color: PILLAR_CONFIG[idea.pillar]?.color }}>{PILLAR_CONFIG[idea.pillar]?.label}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="write-script" />
                        <input type="hidden" name="hook" value={idea.hookDraft || idea.title} />
                        <input type="hidden" name="pillar" value={idea.pillar} />
                        <button type="submit" className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded" onClick={() => setTab("script")}>
                          <Sparkles className="w-3 h-3 text-[rgba(235,235,245,0.2)]" />
                        </button>
                      </fetcher.Form>
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete-idea" />
                        <input type="hidden" name="id" value={idea.id} />
                        <button type="submit" className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded"><Trash2 className="w-3 h-3 text-[rgba(235,235,245,0.12)]" /></button>
                      </Form>
                    </div>
                  </div>
                  {idea.hookDraft && idea.hookDraft !== idea.title && <p className="text-[12px] text-[rgba(235,235,245,0.25)] mt-2 line-clamp-2">{idea.hookDraft}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SERIES */}
      {tab === "series" && (
        <div className="grid md:grid-cols-2 gap-3">
          {series.map((s) => (
            <div key={s.id} className="card-static p-5" style={{ borderLeft: `2px solid ${PILLAR_CONFIG[s.pillar]?.color || "#fff"}30` }}>
              <p className="text-[14px] font-medium text-white">{s.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: PILLAR_CONFIG[s.pillar]?.color }}>{PILLAR_CONFIG[s.pillar]?.label}</p>
              <p className="text-[12px] text-[rgba(235,235,245,0.3)] mt-2">{s.description}</p>
              <p className="text-micro mt-3">Episodes: {s.episodeCount}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
