import { useLoaderData, Form } from "react-router";
import {
  Shield, User, Megaphone, Palette, Users, Handshake, Plus,
  Save, Copy, ExternalLink, Camera, Play, Music2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Select } from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "~/components/ui/dialog";
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

const statusColors: Record<CollabStatus, string> = {
  potential: "bg-gray-500/20 text-gray-400",
  outreach: "bg-blue-500/20 text-blue-400",
  negotiating: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-emerald-500/20 text-emerald-400",
  completed: "bg-purple-500/20 text-purple-400",
};

export default function BrandPage() {
  const { brand, collabs } = useLoaderData<typeof loader>();

  if (!brand) return <div className="text-[#71717A]">Loading brand data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title text-white">Brand Vault</h1>
        <p className="text-sm text-[#71717A] mt-1">Identity, bios, collabs & brand assets</p>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="flex-wrap bg-white/[0.06] border border-[rgba(255,255,255,0.06)]">
          <TabsTrigger value="identity" className="gap-1.5"><User className="w-3.5 h-3.5" /> Identity</TabsTrigger>
          <TabsTrigger value="bios" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Bios</TabsTrigger>
          <TabsTrigger value="atlas" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Atlas</TabsTrigger>
          <TabsTrigger value="skyway" className="gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> SkyWay</TabsTrigger>
          <TabsTrigger value="collabs" className="gap-1.5"><Handshake className="w-3.5 h-3.5" /> Collabs</TabsTrigger>
        </TabsList>

        {/* Identity */}
        <TabsContent value="identity">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Shield className="w-4 h-4 text-white/60" />
                  Brand Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Handle</p>
                  <p className="text-sm font-medium text-white">{brand.handle}</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Tagline</p>
                  <p className="text-sm font-medium text-white italic">"Living at altitude."</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Tone</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Authentic", "Aspirational", "Approachable"].map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs bg-white/[0.06] border border-[rgba(255,255,255,0.06)] text-[#A1A1AA]">{t}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-purple-400" />
                  Audiences & Worlds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Target Audiences</p>
                  <div className="space-y-1.5">
                    {["Aviation Dreamers", "Lifestyle Followers", "Founder Curious"].map((a) => (
                      <div key={a} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        <span className="text-sm text-[#A1A1AA]">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Content Worlds</p>
                  <div className="flex flex-wrap gap-2">
                    {["The Flight Deck", "The Life", "The Build"].map((w) => (
                      <Badge key={w} variant="outline" className="text-xs border-[rgba(255,255,255,0.06)] text-[#A1A1AA]">{w}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            <Card className="md:col-span-2 bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Palette className="w-4 h-4 text-amber-400" />
                  Content Pillar Colors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <div className="w-full h-12 rounded-lg mb-1.5" style={{ backgroundColor: val.color }} />
                      <p className="text-xs font-medium text-white">{val.label}</p>
                      <p className="text-[10px] text-[#71717A]">{val.color}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Platform Bios */}
        <TabsContent value="bios">
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const Icon = platformIcons[platform];
              return (
                <Card key={platform} className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize text-white flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" style={{ color: PLATFORM_CONFIG[platform].color }} />}
                      {PLATFORM_CONFIG[platform].label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form method="post" className="space-y-2">
                      <input type="hidden" name="intent" value="update-bio" />
                      <input type="hidden" name="platform" value={platform} />
                      <Textarea
                        name="bio"
                        defaultValue={brand.platformBios[platform]}
                        rows={2}
                        className="text-sm bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="gap-1.5 bg-white text-[#08090A] hover:bg-white/90">
                          <Save className="w-3.5 h-3.5" /> Save
                        </Button>
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="text-[#A1A1AA] hover:bg-white/[0.06]"
                          onClick={() => navigator.clipboard.writeText(brand.platformBios[platform])}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Atlas Brand Notes */}
        <TabsContent value="atlas">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader>
                <CardTitle className="text-base text-white">Product Line</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Grapefruit", color: "#F97316" },
                  { name: "Mixed Berry", color: "#8B5CF6" },
                  { name: "Strawberry Lemonade", color: "#EC4899" },
                  { name: "Lemon Lime", color: "#10B981" },
                ].map((product) => (
                  <div key={product.name} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.04]">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: product.color }} />
                    <span className="text-sm font-medium text-white">{product.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardHeader>
                <CardTitle className="text-base text-white">Brand Messaging</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Positioning</p>
                  <p className="text-sm text-[#A1A1AA]">Clean, zero-sugar, vitamin-infused electrolytes for active lifestyles</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Mission</p>
                  <p className="text-sm text-[#A1A1AA]">Clean water donation on every purchase</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717A] mb-1">Key Features</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Zero Sugar", "Vitamin-Infused", "Clean Ingredients", "Electrolytes", "Clean Water Mission"].map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{f}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SkyWay */}
        <TabsContent value="skyway">
          <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
            <CardHeader>
              <CardTitle className="text-base text-white">SkyWay App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-[#71717A] mb-1">Description</p>
                <p className="text-sm text-[#A1A1AA]">Pilot lifestyle planning app — scheduling, trips, crew coordination, and commute planning for airline pilots.</p>
              </div>
              <div>
                <p className="text-xs text-[#71717A] mb-1">Status</p>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border border-blue-500/20">In Development</Badge>
              </div>
              <div>
                <p className="text-xs text-[#71717A] mb-1">Content Strategy</p>
                <ul className="text-sm space-y-1 text-[#A1A1AA]">
                  <li>• Build-in-public series on founder journey</li>
                  <li>• Feature teasers on Instagram/TikTok</li>
                  <li>• Beta waitlist campaign</li>
                  <li>• Pilot community engagement</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collaborations */}
        <TabsContent value="collabs">
          <div className="flex justify-end mb-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-white text-[#08090A] hover:bg-white/90">
                  <Plus className="w-4 h-4" /> Add Collab
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                <DialogHeader><DialogTitle className="text-white">New Collaboration</DialogTitle></DialogHeader>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="add-collab" />
                  <Input name="creatorName" placeholder="Creator / Brand name" required className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Select name="platform" defaultValue="instagram" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white">
                    {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>)}
                  </Select>
                  <Select name="status" defaultValue="potential" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white">
                    <option value="potential">Potential</option>
                    <option value="outreach">Outreach</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                  </Select>
                  <Input name="dealTerms" placeholder="Deal terms" className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <Textarea name="notes" placeholder="Notes" rows={2} className="bg-white/[0.06] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#71717A]" />
                  <DialogClose asChild>
                    <Button type="submit" className="w-full bg-white text-[#08090A] hover:bg-white/90">Save</Button>
                  </DialogClose>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {collabs.length === 0 ? (
            <Card className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
              <CardContent className="py-12 text-center text-[#71717A] text-sm">
                <Handshake className="w-8 h-8 mx-auto mb-2" />
                No collaborations tracked yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {collabs.map((collab) => (
                <Card key={collab.id} className="bg-[#111213] border border-[rgba(255,255,255,0.06)]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-white">{collab.creatorName}</p>
                      <Badge className={cn("text-xs", statusColors[collab.status])}>{collab.status}</Badge>
                    </div>
                    <p className="text-xs text-[#71717A] capitalize">{PLATFORM_CONFIG[collab.platform].label}</p>
                    {collab.dealTerms && <p className="text-xs text-[#A1A1AA] mt-1">{collab.dealTerms}</p>}
                    {collab.notes && <p className="text-xs text-[#71717A] mt-1">{collab.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
