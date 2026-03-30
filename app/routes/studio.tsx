import { useState } from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import {
  Lightbulb, BookOpen, Hash, Layers, Plus, Search,
  Trash2, Copy, Sparkles, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "~/components/ui/dialog";
import { kvGet, kvSet, kvAddItem, kvDeleteItem } from "~/lib/kv.server";
import { PILLAR_CONFIG, PILLARS } from "~/lib/constants";
import { cn, generateId } from "~/lib/utils";
import type { Idea, HookTemplate, ContentSeries, HashtagSet, Pillar } from "~/lib/types";
import type { Route } from "./+types/studio";
import Anthropic from "@anthropic-ai/sdk";

export function meta() {
  return [{ title: "Content Studio — FlyWithGarrett" }];
}

export async function loader() {
  const [ideas, hooks, series, hashtags, generatedIdeas] = await Promise.all([
    kvGet<Idea[]>("ideas:bank"),
    kvGet<HookTemplate[]>("hooks:library"),
    kvGet<ContentSeries[]>("content:series"),
    kvGet<HashtagSet[]>("hashtags:sets"),
    kvGet<{ ideas: { title: string; pillar: Pillar; hook: string; rationale: string }[]; generatedAt: string } | null>("ideas:generated"),
  ]);
  return {
    ideas: ideas ?? [],
    hooks: hooks ?? [],
    series: series ?? [],
    hashtags: hashtags ?? [],
    generatedIdeas: generatedIdeas ?? null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "add-idea") {
    const idea: Idea = {
      id: generateId(),
      title: formData.get("title") as string,
      pillar: formData.get("pillar") as Pillar,
      hookDraft: formData.get("hookDraft") as string || "",
      notes: formData.get("notes") as string || "",
      status: "raw",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("ideas:bank", idea);
  } else if (intent === "delete-idea") {
    await kvDeleteItem<Idea>("ideas:bank", formData.get("id") as string);
  } else if (intent === "add-hook") {
    const hook: HookTemplate = {
      id: generateId(),
      title: formData.get("title") as string,
      templateText: formData.get("templateText") as string,
      contentType: formData.get("contentType") as string,
      pillar: formData.get("pillar") as Pillar,
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("hooks:library", hook);
  } else if (intent === "add-hashtag-set") {
    const set: HashtagSet = {
      id: generateId(),
      name: formData.get("name") as string,
      pillar: formData.get("pillar") as Pillar,
      platform: "all",
      hashtags: (formData.get("hashtags") as string).split(/[\s,]+/).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("hashtags:sets", set);
  } else if (intent === "generate-ideas") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `You are a content strategist for @flywithgarrett — Garrett Ray, a Boeing 787 pilot, Atlas Hydration founder, and NYC-based creator with 800K+ on Instagram. His content pillars are: Lifestyle & Finance (NYC, credit cards, investing), Dog Dad (Bella the Weimaraner), Peak Performance (gym, paddle, supplements), Entrepreneur/Atlas (building Atlas Hydration, CPG business), Pilot Life (subtle — no uniform/airport on YT/TikTok). Instagram = lifestyle + dog dad + finance. YouTube/TikTok = entrepreneur + educational. Research what similar creators (pilot influencers, NYC lifestyle, dog dads, CPG founders, fitness creators) are doing well right now. Think about trending audio, formats, series concepts.`,
        messages: [{
          role: "user",
          content: `Generate 12 fresh content ideas for @flywithgarrett based on current trends and what's working for similar creators. Return JSON array (no markdown): [{"title":"...","pillar":"lifestyle|dogdad|performance|entrepreneur|pilot","hook":"...","rationale":"..."}]. Mix all 5 pillars. Make hooks scroll-stopping. Reference specific trends or formats.`
        }],
      });
      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        await kvSet("ideas:generated", { ideas: parsed, generatedAt: new Date().toISOString() });
        return { generated: true };
      }
    }
    return { generated: false };
  } else if (intent === "save-generated") {
    const idea: Idea = {
      id: generateId(),
      title: formData.get("title") as string,
      pillar: formData.get("pillar") as Pillar,
      hookDraft: formData.get("hook") as string || "",
      notes: formData.get("rationale") as string || "",
      status: "raw",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("ideas:bank", idea);
  }

  return { ok: true };
}

export default function StudioPage() {
  const { ideas, hooks, series, hashtags, generatedIdeas } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchHook, setSearchHook] = useState("");
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isGenerating = fetcher.state !== "idle";

  const filteredHooks = hooks.filter((h) => {
    if (filterPillar !== "all" && h.pillar !== filterPillar) return false;
    if (searchHook && !h.templateText.toLowerCase().includes(searchHook.toLowerCase()) && !h.title.toLowerCase().includes(searchHook.toLowerCase())) return false;
    return true;
  });

  const filteredIdeas = ideas.filter((i) => filterPillar === "all" || i.pillar === filterPillar);

  const copyHook = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-title text-white">Content Studio</h1>
          <p className="text-[13px] text-[#71717A] mt-1">Ideas, hooks, hashtags & series</p>
        </div>
        <Select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="w-44 bg-[#111213] border-[rgba(255,255,255,0.06)]">
          <option value="all">All Pillars</option>
          {PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}
        </Select>
      </div>

      <Tabs defaultValue="ideas">
        <TabsList className="flex-wrap bg-[#111213] border border-[rgba(255,255,255,0.06)]">
          <TabsTrigger value="ideas" className="gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Ideas ({ideas.length})</TabsTrigger>
          <TabsTrigger value="generated" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Ideas</TabsTrigger>
          <TabsTrigger value="hooks" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Hooks ({hooks.length})</TabsTrigger>
          <TabsTrigger value="hashtags" className="gap-1.5"><Hash className="w-3.5 h-3.5" /> Hashtags</TabsTrigger>
          <TabsTrigger value="series" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Series ({series.length})</TabsTrigger>
        </TabsList>

        {/* IDEAS TAB */}
        <TabsContent value="ideas">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]"><Plus className="w-4 h-4" /> New Idea</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Capture Idea</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-idea" />
                  <Input name="title" placeholder="Idea title" required />
                  <Select name="pillar" defaultValue="lifestyle">{PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}</Select>
                  <Textarea name="hookDraft" placeholder="Hook draft" rows={2} />
                  <Textarea name="notes" placeholder="Notes" rows={2} />
                  <DialogClose asChild><Button type="submit" className="w-full bg-white text-[#08090A]">Save</Button></DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {filteredIdeas.length === 0 ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] py-12 text-center">
              <Lightbulb className="w-6 h-6 text-[#71717A] mx-auto mb-2" />
              <p className="text-[13px] text-[#71717A]">No ideas yet. Start capturing!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredIdeas.map((idea) => (
                <div key={idea.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{idea.title}</p>
                      <span className="text-[11px] inline-block mt-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: PILLAR_CONFIG[idea.pillar].color + "15", color: PILLAR_CONFIG[idea.pillar].color }}>
                        {PILLAR_CONFIG[idea.pillar].label}
                      </span>
                    </div>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete-idea" />
                      <input type="hidden" name="id" value={idea.id} />
                      <button type="submit" className="p-1 hover:bg-white/[0.06] rounded"><Trash2 className="w-3.5 h-3.5 text-[#71717A]" /></button>
                    </Form>
                  </div>
                  {idea.hookDraft && <p className="text-[12px] text-[#71717A] mt-2 line-clamp-2">{idea.hookDraft}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI GENERATED IDEAS TAB */}
        <TabsContent value="generated">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-white">AI-Generated Ideas</p>
              <p className="text-[12px] text-[#71717A] mt-0.5">Based on trending content, similar creators, and your pillar strategy</p>
            </div>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="generate-ideas" />
              <Button type="submit" disabled={isGenerating} size="sm"
                className="gap-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? "Generating..." : "Generate Fresh Ideas"}
              </Button>
            </fetcher.Form>
          </div>

          {!generatedIdeas ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] py-16 text-center">
              <Sparkles className="w-8 h-8 text-purple-400/30 mx-auto mb-3" />
              <p className="text-[14px] text-white mb-1">No AI ideas generated yet</p>
              <p className="text-[12px] text-[#71717A]">Click "Generate Fresh Ideas" to get 12 content ideas based on trends and your strategy.</p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-[#52525B] mb-3">Generated {new Date(generatedIdeas.generatedAt).toLocaleString()}</p>
              <div className="grid md:grid-cols-2 gap-3">
                {generatedIdeas.ideas.map((idea, i) => (
                  <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-white">{idea.title}</p>
                        <span className="text-[11px] inline-block mt-1 px-1.5 py-0.5 rounded" style={{
                          backgroundColor: (PILLAR_CONFIG[idea.pillar as Pillar]?.color || "#71717A") + "15",
                          color: PILLAR_CONFIG[idea.pillar as Pillar]?.color || "#71717A"
                        }}>
                          {PILLAR_CONFIG[idea.pillar as Pillar]?.label || idea.pillar}
                        </span>
                      </div>
                      <Form method="post">
                        <input type="hidden" name="intent" value="save-generated" />
                        <input type="hidden" name="title" value={idea.title} />
                        <input type="hidden" name="pillar" value={idea.pillar} />
                        <input type="hidden" name="hook" value={idea.hook} />
                        <input type="hidden" name="rationale" value={idea.rationale} />
                        <Button type="submit" size="sm" className="gap-1 text-[11px] h-7 bg-white/[0.06] text-white hover:bg-white/[0.1]">
                          <Plus className="w-3 h-3" /> Save
                        </Button>
                      </Form>
                    </div>
                    <p className="text-[12px] text-[#A1A1AA] mt-2 italic">"{idea.hook}"</p>
                    <div className="flex items-start gap-1.5 mt-2">
                      <Zap className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-[#71717A]">{idea.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* HOOKS TAB */}
        <TabsContent value="hooks">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <Input placeholder="Search hooks..." value={searchHook} onChange={(e) => setSearchHook(e.target.value)} className="pl-9 bg-[#111213] border-[rgba(255,255,255,0.06)]" />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]"><Plus className="w-4 h-4" /> Add Hook</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Hook Template</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-hook" />
                  <Input name="title" placeholder="Hook name" required />
                  <Textarea name="templateText" placeholder="Hook text" rows={3} required />
                  <Input name="contentType" placeholder="Type (e.g. truth_bomb, access)" />
                  <Select name="pillar" defaultValue="lifestyle">{PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}</Select>
                  <DialogClose asChild><Button type="submit" className="w-full bg-white text-[#08090A]">Save</Button></DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {filteredHooks.map((hook) => (
              <div key={hook.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-white">{hook.title}</p>
                      <span className="text-[10px] text-[#71717A] bg-white/[0.06] px-1.5 py-0.5 rounded">{hook.contentType}</span>
                    </div>
                    <p className="text-[12px] text-[#A1A1AA] mt-1.5">{hook.templateText}</p>
                    <span className="text-[11px] inline-block mt-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: PILLAR_CONFIG[hook.pillar]?.color + "15" || "", color: PILLAR_CONFIG[hook.pillar]?.color || "#71717A" }}>
                      {PILLAR_CONFIG[hook.pillar]?.label || hook.pillar}
                    </span>
                  </div>
                  <button onClick={() => copyHook(hook.templateText, hook.id)} className="p-1.5 hover:bg-white/[0.06] rounded shrink-0">
                    <Copy className={cn("w-3.5 h-3.5", copiedId === hook.id ? "text-emerald-400" : "text-[#71717A]")} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* HASHTAGS TAB */}
        <TabsContent value="hashtags">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-white hover:bg-white/[0.1]"><Plus className="w-4 h-4" /> New Set</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Hashtag Set</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-hashtag-set" />
                  <Input name="name" placeholder="Set name" required />
                  <Select name="pillar" defaultValue="lifestyle">{PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}</Select>
                  <Textarea name="hashtags" placeholder="Hashtags (spaces or commas)" rows={3} required />
                  <DialogClose asChild><Button type="submit" className="w-full bg-white text-[#08090A]">Save</Button></DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {hashtags.map((set) => (
              <div key={set.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-medium text-white">{set.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: PILLAR_CONFIG[set.pillar]?.color + "15" || "", color: PILLAR_CONFIG[set.pillar]?.color || "#71717A" }}>
                    {PILLAR_CONFIG[set.pillar]?.label || set.pillar}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {set.hashtags.map((tag, i) => <span key={i} className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{tag}</span>)}
                </div>
                <button onClick={() => navigator.clipboard.writeText(set.hashtags.join(" "))} className="flex items-center gap-1 mt-2 text-[11px] text-[#71717A] hover:text-white">
                  <Copy className="w-3 h-3" /> Copy All
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* SERIES TAB */}
        <TabsContent value="series">
          <div className="grid md:grid-cols-2 gap-3">
            {series.map((s) => (
              <div key={s.id} className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111213] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-white">{s.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: PILLAR_CONFIG[s.pillar]?.color + "15" || "", color: PILLAR_CONFIG[s.pillar]?.color || "#71717A" }}>
                    {PILLAR_CONFIG[s.pillar]?.label || s.pillar}
                  </span>
                </div>
                <p className="text-[12px] text-[#71717A]">{s.description}</p>
                <p className="text-[11px] text-[#52525B] mt-2">Episodes: {s.episodeCount}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
