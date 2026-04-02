import { useState, useCallback } from "react";
import { useLoaderData, Form } from "react-router";
import { Lightbulb, Layers, Plus, Trash2, Sparkles, Zap, RefreshCw, Camera, Play, Music2, X, ClipboardCopy, BookmarkPlus, Check } from "lucide-react";
import { kvGet, kvAddItem, kvDeleteItem } from "~/lib/kv.server";
import { PILLAR_CONFIG, PILLARS, PILLAR_HOOKS } from "~/lib/constants";
import { generateId } from "~/lib/utils";
import type { Idea, ContentSeries, Pillar } from "~/lib/types";
import type { Route } from "./+types/studio";

export function meta() { return [{ title: "Content Studio — FlyWithGarrett" }]; }

export async function loader() {
  const [ideas, series] = await Promise.all([
    kvGet<Idea[]>("ideas:bank"),
    kvGet<ContentSeries[]>("content:series"),
  ]);
  return { ideas: ideas ?? [], series: series ?? [] };
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
  }
  return { ok: true };
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = { instagram: Camera, youtube: Play, tiktok: Music2 };

interface ScriptModal { hook: string; pillar: Pillar; script: string | null; loading: boolean; error: string | null; copied: boolean; saved: boolean; mock: boolean; }

export default function StudioPage() {
  const { ideas, series } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<"pillars" | "ideas" | "series">("pillars");
  const [expandedPillar, setExpandedPillar] = useState<Pillar | null>(null);
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [scriptModal, setScriptModal] = useState<ScriptModal | null>(null);

  // Per-pillar hooks in state so we can modify them
  const [pillarHooks, setPillarHooks] = useState<Record<Pillar, string[]>>(() => ({ ...PILLAR_HOOKS }));
  const [savedHooks, setSavedHooks] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState<Pillar | "all" | null>(null);

  const filteredIdeas = ideas.filter((i) => filterPillar === "all" || i.pillar === filterPillar);

  // Save a hook to the idea bank
  const saveHook = async (hook: string, pillar: Pillar) => {
    await fetch("/api/save-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: hook, pillar, hookDraft: hook }),
    });
    setSavedHooks((prev) => new Set(prev).add(hook));
  };

  // Call the regenerate API for a single pillar
  const callRegenerateApi = async (pillar: Pillar): Promise<string[]> => {
    const cfg = PILLAR_CONFIG[pillar];
    const res = await fetch("/api/regenerate-hooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillar, pillarLabel: cfg.label, pillarDescription: cfg.description }),
    });
    if (!res.ok) {
      console.error("Regenerate failed:", res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return data.hooks || [];
  };

  // Regenerate hooks for one pillar
  const regeneratePillar = async (pillar: Pillar) => {
    setRegenerating(pillar);
    const hooks = await callRegenerateApi(pillar);
    if (hooks.length > 0) setPillarHooks((prev) => ({ ...prev, [pillar]: hooks }));
    setRegenerating(null);
  };

  // Regenerate all pillars
  const regenerateAll = async () => {
    setRegenerating("all");
    const results = await Promise.all(
      PILLARS.map(async (pillar) => {
        const hooks = await callRegenerateApi(pillar);
        return { pillar, hooks };
      })
    );
    setPillarHooks((prev) => {
      const next = { ...prev };
      for (const { pillar, hooks } of results) {
        if (hooks.length > 0) next[pillar] = hooks;
      }
      return next;
    });
    setRegenerating(null);
  };

  const openScriptWriter = useCallback(async (hook: string, pillar: Pillar) => {
    setScriptModal({ hook, pillar, script: null, loading: true, error: null, copied: false, saved: false, mock: false });
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hook, pillar: PILLAR_CONFIG[pillar]?.label || pillar }),
      });
      const data = await res.json();
      if (data.script) setScriptModal((prev) => prev ? { ...prev, script: data.script, loading: false, mock: !!data.mock } : null);
      else setScriptModal((prev) => prev ? { ...prev, error: data.error || "Failed", loading: false } : null);
    } catch { setScriptModal((prev) => prev ? { ...prev, error: "Network error", loading: false } : null); }
  }, []);

  const tabs = [
    { key: "pillars", label: "Pillars & Hooks", icon: Zap },
    { key: "ideas", label: `Idea Bank (${ideas.length})`, icon: Lightbulb },
    { key: "series", label: `Series (${series.length})`, icon: Layers },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-title">Content Studio</h1>
        <p className="text-micro mt-2">Pillars, scripts, ideas & series</p>
      </div>

      {/* Tabs + Regenerate All */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-[12px] bg-[rgba(0,0,0,0.03)] w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-medium transition-all ${
                tab === t.key ? "bg-[rgba(0,0,0,0.05)] text-[#1d1d1f]" : "text-[#aeaeb2] hover:text-[#86868b]"
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        {tab === "pillars" && (
          <button onClick={regenerateAll} disabled={regenerating === "all"}
            className="btn-ghost text-[12px] flex items-center gap-1.5">
            <RefreshCw className={`w-3 h-3 ${regenerating === "all" ? "animate-spin" : ""}`} />
            {regenerating === "all" ? "Regenerating..." : "Regenerate All"}
          </button>
        )}
      </div>

      {/* PILLARS & HOOKS */}
      {tab === "pillars" && (
        <div className="space-y-3">
          {PILLARS.map((key) => {
            const p = PILLAR_CONFIG[key];
            const hooks = pillarHooks[key] || [];
            const isExpanded = expandedPillar === key;
            const isRegenThis = regenerating === key;
            return (
              <div key={key} className="card-static overflow-hidden !rounded-[16px]" style={{ borderLeft: `3px solid ${p.color}` }}>
                <button onClick={() => setExpandedPillar(isExpanded ? null : key)}
                  className="w-full flex items-start justify-between p-5 text-left">
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{p.label}</p>
                    <p className="text-[12px] text-[#aeaeb2] mt-1">{p.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {p.platforms.map((pl) => { const I = platformIcons[pl]; return I ? <I key={pl} className="w-3.5 h-3.5 text-[#c7c7cc]" /> : null; })}
                      <span className="text-micro ml-1">Series: {p.series}</span>
                      <span className="text-micro">{hooks.length} hooks</span>
                    </div>
                  </div>
                  <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: p.color + "40" }} />
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5">
                    {/* Per-pillar regenerate */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="divider flex-1" />
                      <button onClick={(e) => { e.stopPropagation(); regeneratePillar(key); }}
                        disabled={!!regenerating}
                        className="ml-3 text-[11px] text-[#007aff] font-medium flex items-center gap-1 hover:text-[#0066d6] transition-colors">
                        <RefreshCw className={`w-3 h-3 ${isRegenThis ? "animate-spin" : ""}`} />
                        {isRegenThis ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {hooks.map((hook, i) => {
                        const isSaved = savedHooks.has(hook);
                        return (
                          <div key={`${key}-${i}`} className={`flex items-center justify-between gap-3 p-3 rounded-[10px] transition-all ${isSaved ? "bg-[#e8e8ed] opacity-50" : "bg-[#e8e8ed] hover:bg-[#dcdce0]"}`}>
                            <p className={`text-[13px] flex-1 ${isSaved ? "text-[#aeaeb2] line-through" : "text-[#1d1d1f]"}`}>"{hook}"</p>
                            <div className="flex gap-1.5 shrink-0">
                              {!isSaved ? (
                                <>
                                  <button onClick={() => openScriptWriter(hook, key)} className="btn-primary text-[11px] py-1 px-3">Write Script</button>
                                  <button onClick={() => saveHook(hook, key)} className="btn-ghost text-[11px] py-1 px-2 flex items-center gap-1">
                                    <BookmarkPlus className="w-3 h-3" /> Save
                                  </button>
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] text-[#34c759]">
                                  <Check className="w-3 h-3" /> Saved to Ideas
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
              <Lightbulb className="w-6 h-6 text-[#d1d1d6] mx-auto mb-2" />
              <p className="text-[13px] text-[#aeaeb2]">No ideas yet. Save hooks from Pillars or add one above.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredIdeas.map((idea) => (
                <div key={idea.id} className="card-static p-4 !rounded-[16px]" style={{ borderLeft: `2px solid ${PILLAR_CONFIG[idea.pillar]?.color || "#000"}30` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{idea.title}</p>
                      <p className="text-[11px] mt-1" style={{ color: PILLAR_CONFIG[idea.pillar]?.color }}>{PILLAR_CONFIG[idea.pillar]?.label}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openScriptWriter(idea.hookDraft || idea.title, idea.pillar)} className="p-1 hover:bg-[rgba(0,0,0,0.04)] rounded">
                        <Sparkles className="w-3 h-3 text-[#c7c7cc]" />
                      </button>
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete-idea" />
                        <input type="hidden" name="id" value={idea.id} />
                        <button type="submit" className="p-1 hover:bg-[rgba(0,0,0,0.04)] rounded"><Trash2 className="w-3 h-3 text-[#d1d1d6]" /></button>
                      </Form>
                    </div>
                  </div>
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
            <div key={s.id} className="card-static p-5 !rounded-[16px]" style={{ borderLeft: `2px solid ${PILLAR_CONFIG[s.pillar]?.color || "#000"}30` }}>
              <p className="text-[14px] font-medium text-[#1d1d1f]">{s.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: PILLAR_CONFIG[s.pillar]?.color }}>{PILLAR_CONFIG[s.pillar]?.label}</p>
              <p className="text-[12px] text-[#aeaeb2] mt-2">{s.description}</p>
              <p className="text-micro mt-3">Episodes: {s.episodeCount}</p>
            </div>
          ))}
        </div>
      )}

      {/* SCRIPT WRITER MODAL */}
      {scriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !scriptModal.loading && setScriptModal(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm fade-in" />
          <div className="relative w-full max-w-[700px] max-h-[85vh] overflow-y-auto bg-white rounded-[20px] p-8 slide-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <p className="text-[18px] font-medium" style={{ color: PILLAR_CONFIG[scriptModal.pillar]?.color || "#007aff" }}>"{scriptModal.hook}"</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="pill" style={{ backgroundColor: `${PILLAR_CONFIG[scriptModal.pillar]?.color}15`, color: PILLAR_CONFIG[scriptModal.pillar]?.color }}>{PILLAR_CONFIG[scriptModal.pillar]?.label}</span>
                  <span className="pill">TikTok / Reel</span>
                </div>
              </div>
              <button onClick={() => setScriptModal(null)} className="p-1 hover:bg-[rgba(0,0,0,0.04)] rounded-lg ml-4"><X className="w-5 h-5 text-[#aeaeb2]" /></button>
            </div>
            {scriptModal.loading && (
              <div className="py-16 text-center">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-2 h-2 rounded-full bg-black/15 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-black/15 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-black/15 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-[14px] text-[#1d1d1f]">Writing your script...</p>
              </div>
            )}
            {scriptModal.error && (
              <div className="py-12 text-center">
                <p className="text-[14px] text-[#ff3b30] mb-2">{scriptModal.error}</p>
                <button onClick={() => openScriptWriter(scriptModal.hook, scriptModal.pillar)} className="btn-ghost">Try Again</button>
              </div>
            )}
            {scriptModal.script && (
              <>
                <div className="bg-[#f5f5f7] rounded-[14px] p-6 mb-6">
                  <div className="whitespace-pre-wrap text-[13px] leading-[1.8] text-[#3a3a3c]"
                    dangerouslySetInnerHTML={{
                      __html: scriptModal.script
                        .replace(/(HOOK.*?):/g, '<span class="text-[#ff9500] font-semibold text-[11px] uppercase tracking-wider">$1:</span>')
                        .replace(/(BODY.*?):/g, '<span class="text-[#007aff] font-semibold text-[11px] uppercase tracking-wider">$1:</span>')
                        .replace(/(CTA.*?):/g, '<span class="text-[#34c759] font-semibold text-[11px] uppercase tracking-wider">$1:</span>')
                        .replace(/(CAPTION):/g, '<span class="text-[#af52de] font-semibold text-[11px] uppercase tracking-wider">$1:</span>')
                        .replace(/(HASHTAGS):/g, '<span class="text-[#007aff] font-semibold text-[11px] uppercase tracking-wider">$1:</span>')
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => { navigator.clipboard.writeText(scriptModal.script!); setScriptModal((p) => p ? { ...p, copied: true } : null); setTimeout(() => setScriptModal((p) => p ? { ...p, copied: false } : null), 2000); }}
                    className="btn-ghost flex items-center gap-1.5"><ClipboardCopy className="w-3.5 h-3.5" />{scriptModal.copied ? "Copied!" : "Copy Script"}</button>
                  <button onClick={() => openScriptWriter(scriptModal.hook, scriptModal.pillar)} className="btn-ghost flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Regenerate</button>
                  <button onClick={async () => { await fetch("/api/save-idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: scriptModal.hook, pillar: scriptModal.pillar, hookDraft: scriptModal.hook, notes: scriptModal.script }) }); setScriptModal((p) => p ? { ...p, saved: true } : null); }}
                    className="btn-ghost flex items-center gap-1.5"><BookmarkPlus className="w-3.5 h-3.5" />{scriptModal.saved ? "Saved!" : "Save to Ideas"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
