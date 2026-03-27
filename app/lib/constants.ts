import type { Pillar, Platform } from "./types";

export const PILLAR_CONFIG: Record<Pillar, { label: string; color: string; bgColor: string; textColor: string }> = {
  aviation: { label: "Aviation", color: "#3B82F6", bgColor: "bg-blue-500/20", textColor: "text-blue-400" },
  lifestyle: { label: "NYC Lifestyle", color: "#8B5CF6", bgColor: "bg-purple-500/20", textColor: "text-purple-400" },
  wellness: { label: "Health/Atlas", color: "#10B981", bgColor: "bg-emerald-500/20", textColor: "text-emerald-400" },
  travel: { label: "Travel", color: "#F59E0B", bgColor: "bg-amber-500/20", textColor: "text-amber-400" },
  founder: { label: "Founder/Build", color: "#F97316", bgColor: "bg-orange-500/20", textColor: "text-orange-400" },
  comedy: { label: "Comedy", color: "#EC4899", bgColor: "bg-pink-500/20", textColor: "text-pink-400" },
};

export const PLATFORM_CONFIG: Record<Platform, { label: string; icon: string }> = {
  instagram: { label: "Instagram", icon: "Camera" },
  tiktok: { label: "TikTok", icon: "Music2" },
  youtube: { label: "YouTube", icon: "Play" },
  threads: { label: "Threads", icon: "AtSign" },
  x: { label: "X", icon: "MessageCircle" },
};

export const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "threads", "x"];
export const PILLARS: Pillar[] = ["aviation", "lifestyle", "wellness", "travel", "founder", "comedy"];

export const WEEKLY_CADENCE: Record<number, { pillar: Pillar; label: string }> = {
  1: { pillar: "aviation", label: "Aviation Monday" },
  2: { pillar: "wellness", label: "Wellness Tuesday" },
  3: { pillar: "lifestyle", label: "NYC Wednesday" },
  4: { pillar: "travel", label: "Travel Thursday" },
  5: { pillar: "comedy", label: "Comedy Friday" },
  6: { pillar: "aviation", label: "YouTube Saturday" },
  0: { pillar: "founder", label: "Founder Sunday" },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "bg-gray-500/20 text-gray-400" },
  drafted: { label: "Drafted", color: "bg-blue-500/20 text-blue-400" },
  filmed: { label: "Filmed", color: "bg-amber-500/20 text-amber-400" },
  posted: { label: "Posted", color: "bg-emerald-500/20 text-emerald-400" },
};

export const ATLAS_PRODUCTS = [
  { name: "Grapefruit", color: "#F97316" },
  { name: "Mixed Berry", color: "#8B5CF6" },
  { name: "Strawberry Lemonade", color: "#EC4899" },
  { name: "Lemon Lime", color: "#10B981" },
];
