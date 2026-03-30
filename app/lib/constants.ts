import type { Pillar, Platform } from "./types";

export const PILLAR_CONFIG: Record<Pillar, { label: string; color: string; bgColor: string; textColor: string }> = {
  lifestyle: { label: "Lifestyle & Finance", color: "#F97316", bgColor: "bg-orange-500/15", textColor: "text-orange-400" },
  dogdad: { label: "Dog Dad", color: "#EC4899", bgColor: "bg-pink-500/15", textColor: "text-pink-400" },
  performance: { label: "Peak Performance", color: "#10B981", bgColor: "bg-emerald-500/15", textColor: "text-emerald-400" },
  entrepreneur: { label: "Entrepreneur/Atlas", color: "#F59E0B", bgColor: "bg-amber-500/15", textColor: "text-amber-400" },
  pilot: { label: "Pilot Life", color: "#3B82F6", bgColor: "bg-blue-500/15", textColor: "text-blue-400" },
};

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  youtube: { label: "YouTube", color: "#FF0000" },
  tiktok: { label: "TikTok", color: "#00F2EA" },
};

export const PLATFORMS: Platform[] = ["instagram", "youtube", "tiktok"];
export const PILLARS: Pillar[] = ["lifestyle", "dogdad", "performance", "entrepreneur", "pilot"];

export const WEEKLY_CADENCE: Record<number, { pillar: Pillar; label: string }> = {
  1: { pillar: "lifestyle", label: "Lifestyle & Finance" },
  2: { pillar: "dogdad", label: "Dog Dad — Bella" },
  3: { pillar: "performance", label: "Peak Performance" },
  4: { pillar: "entrepreneur", label: "Entrepreneur / Atlas" },
  5: { pillar: "lifestyle", label: "Quick-hit / Comedy" },
  6: { pillar: "pilot", label: "YouTube Long-form" },
  0: { pillar: "entrepreneur", label: "BTS Build" },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "bg-zinc-500/15 text-zinc-400" },
  drafted: { label: "Drafted", color: "bg-blue-500/15 text-blue-400" },
  filmed: { label: "Filmed", color: "bg-amber-500/15 text-amber-400" },
  posted: { label: "Posted", color: "bg-emerald-500/15 text-emerald-400" },
};

export const ATLAS_PRODUCTS = [
  { name: "Grapefruit", color: "#F97316" },
  { name: "Mixed Berry", color: "#8B5CF6" },
  { name: "Strawberry Lemonade", color: "#EC4899" },
  { name: "Lemon Lime", color: "#10B981" },
];

export const MODULE_ACCENTS = {
  command: "#F97316",
  calendar: "#3B82F6",
  studio: "#8B5CF6",
  analytics: "#10B981",
  brand: "#EC4899",
  business: "#F59E0B",
} as const;

export const MANAGER_DIRECTIVES = [
  "Post 4-8 IG Stories daily",
  "No airport/uniform content on YT/TikTok",
  "Send new series concepts to Joey and Ali for review",
  "Dog Dad Diaries: NYC Edition series",
  "Optimize Life series",
  "Atlas BTS series",
  "Finance tips series",
];
