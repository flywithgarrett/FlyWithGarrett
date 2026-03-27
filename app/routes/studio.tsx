import { useState } from "react";
import { useLoaderData, Form, useSubmit } from "react-router";
import {
  Lightbulb, BookOpen, Hash, Layers, Plus, Search,
  Trash2, Copy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "~/components/ui/dialog";
import { kvGet, kvAddItem, kvDeleteItem } from "~/lib/kv.server";
import { PILLAR_CONFIG, PILLARS } from "~/lib/constants";
import { cn, generateId } from "~/lib/utils";
import type { Idea, HookTemplate, ContentSeries, HashtagSet, Pillar } from "~/lib/types";
import type { Route } from "./+types/studio";

export function meta() {
  return [{ title: "Content Studio — FlyWithGarrett" }];
}

export async function loader() {
  const [ideas, hooks, series, hashtags] = await Promise.all([
    kvGet<Idea[]>("ideas:bank"),
    kvGet<HookTemplate[]>("hooks:library"),
    kvGet<ContentSeries[]>("content:series"),
    kvGet<HashtagSet[]>("hashtags:sets"),
  ]);
  return {
    ideas: ideas ?? [],
    hooks: hooks ?? [],
    series: series ?? [],
    hashtags: hashtags ?? [],
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
  }

  return { ok: true };
}

export default function StudioPage() {
  const { ideas, hooks, series, hashtags } = useLoaderData<typeof loader>();
  const [searchHook, setSearchHook] = useState("");
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHooks = hooks.filter((h) => {
    if (filterPillar !== "all" && h.pillar !== filterPillar) return false;
    if (searchHook && !h.templateText.toLowerCase().includes(searchHook.toLowerCase()) && !h.title.toLowerCase().includes(searchHook.toLowerCase())) return false;
    return true;
  });

  const filteredIdeas = ideas.filter((i) => {
    if (filterPillar !== "all" && i.pillar !== filterPillar) return false;
    return true;
  });

  const copyHook = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Ideas, hooks, hashtags & series</p>
        </div>
        <Select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value)} className="w-36">
          <option value="all">All Pillars</option>
          {PILLARS.map((p) => (
            <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>
          ))}
        </Select>
      </div>

      <Tabs defaultValue="ideas">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ideas" className="gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Ideas ({ideas.length})
          </TabsTrigger>
          <TabsTrigger value="hooks" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Hooks ({hooks.length})
          </TabsTrigger>
          <TabsTrigger value="hashtags" className="gap-1.5">
            <Hash className="w-3.5 h-3.5" /> Hashtags ({hashtags.length})
          </TabsTrigger>
          <TabsTrigger value="series" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Series ({series.length})
          </TabsTrigger>
        </TabsList>

        {/* IDEAS TAB */}
        <TabsContent value="ideas">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Idea</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Capture Idea</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-idea" />
                  <Input name="title" placeholder="Idea title" required />
                  <Select name="pillar" defaultValue="aviation">
                    {PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}
                  </Select>
                  <Textarea name="hookDraft" placeholder="Hook draft (optional)" rows={2} />
                  <Textarea name="notes" placeholder="Notes" rows={2} />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {filteredIdeas.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No ideas yet. Start capturing!</p>
            </CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIdeas.map((idea) => (
                <Card key={idea.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{idea.title}</p>
                        <Badge variant="secondary" className={cn("mt-1 text-xs", PILLAR_CONFIG[idea.pillar].bgColor, PILLAR_CONFIG[idea.pillar].textColor)}>
                          {PILLAR_CONFIG[idea.pillar].label}
                        </Badge>
                      </div>
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete-idea" />
                        <input type="hidden" name="id" value={idea.id} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" type="submit">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </Form>
                    </div>
                    {idea.hookDraft && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{idea.hookDraft}</p>}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(idea.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HOOKS TAB */}
        <TabsContent value="hooks">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hooks..."
                value={searchHook}
                onChange={(e) => setSearchHook(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Hook</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Hook Template</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-hook" />
                  <Input name="title" placeholder="Hook name" required />
                  <Textarea name="templateText" placeholder="Hook text template" rows={3} required />
                  <Input name="contentType" placeholder="Content type (e.g. truth_bomb, access)" />
                  <Select name="pillar" defaultValue="aviation">
                    {PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}
                  </Select>
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {filteredHooks.map((hook) => (
              <Card key={hook.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{hook.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{hook.contentType}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5">{hook.templateText}</p>
                      <Badge variant="secondary" className={cn("mt-2 text-xs", PILLAR_CONFIG[hook.pillar].bgColor, PILLAR_CONFIG[hook.pillar].textColor)}>
                        {PILLAR_CONFIG[hook.pillar].label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                      onClick={() => copyHook(hook.templateText, hook.id)}
                    >
                      <Copy className={cn("w-3.5 h-3.5", copiedId === hook.id ? "text-emerald-400" : "text-muted-foreground")} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* HASHTAGS TAB */}
        <TabsContent value="hashtags">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Set</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Hashtag Set</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-hashtag-set" />
                  <Input name="name" placeholder="Set name" required />
                  <Select name="pillar" defaultValue="aviation">
                    {PILLARS.map((p) => <option key={p} value={p}>{PILLAR_CONFIG[p].label}</option>)}
                  </Select>
                  <Textarea name="hashtags" placeholder="Hashtags (separated by spaces or commas)" rows={3} required />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {hashtags.map((set) => (
              <Card key={set.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{set.name}</CardTitle>
                    <Badge variant="secondary" className={cn("text-xs", PILLAR_CONFIG[set.pillar].bgColor, PILLAR_CONFIG[set.pillar].textColor)}>
                      {PILLAR_CONFIG[set.pillar].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {set.hashtags.map((tag, i) => (
                      <span key={i} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                  <Button
                    variant="ghost" size="sm" className="mt-2 text-xs"
                    onClick={() => navigator.clipboard.writeText(set.hashtags.join(" "))}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy All
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SERIES TAB */}
        <TabsContent value="series">
          <div className="grid md:grid-cols-2 gap-4">
            {series.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <Badge variant="secondary" className={cn("text-xs", PILLAR_CONFIG[s.pillar].bgColor, PILLAR_CONFIG[s.pillar].textColor)}>
                      {PILLAR_CONFIG[s.pillar].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">Episodes: {s.episodeCount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
