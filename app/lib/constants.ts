import type { Pillar, Platform } from "./types";

export const PILLAR_CONFIG: Record<Pillar, { label: string; color: string; description: string; platforms: Platform[]; series: string }> = {
  lifestyle: { label: "Lifestyle & Finance", color: "#0a84ff", description: "NYC life, credit cards, investing, homeownership, money tips", platforms: ["instagram", "tiktok"], series: "Lifestyle Finance" },
  dogdad: { label: "Dog Dad", color: "#ff9f0a", description: "Bella content, NYC dog adventures, Dog Dad Diaries series", platforms: ["instagram", "tiktok"], series: "Dog Dad Diaries: NYC Edition" },
  performance: { label: "Peak Performance", color: "#30d158", description: "Gym, paddle, supplements, recovery, optimize life routines", platforms: ["instagram", "tiktok", "youtube"], series: "Optimize Life" },
  entrepreneur: { label: "Entrepreneur / Atlas", color: "#bf5af2", description: "Atlas Hydration BTS, CPG business, building in public", platforms: ["youtube", "tiktok"], series: "Building Atlas" },
  pilot: { label: "Pilot Life", color: "#64d2ff", description: "Subtle pilot references, no uniform/airport, lifestyle angle", platforms: ["instagram", "youtube"], series: "Pilot Truths" },
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
  5: { pillar: "pilot", label: "Pilot Life" },
  6: { pillar: "pilot", label: "YouTube Long-form" },
  0: { pillar: "entrepreneur", label: "Atlas BTS" },
};

export const STATUS_OPTIONS = ["idea", "scripted", "filmed", "edited", "scheduled", "posted"] as const;
export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "#ffffff30" },
  scripted: { label: "Scripted", color: "#0a84ff" },
  filmed: { label: "Filmed", color: "#ff9f0a" },
  edited: { label: "Edited", color: "#bf5af2" },
  scheduled: { label: "Scheduled", color: "#ffd60a" },
  posted: { label: "Posted", color: "#30d158" },
};

export const FORMAT_OPTIONS = ["reel", "tiktok", "youtube_short", "youtube_long", "story", "carousel"] as const;

export const ATLAS_PRODUCTS = [
  { name: "Grapefruit", color: "#F97316" },
  { name: "Mixed Berry", color: "#8B5CF6" },
  { name: "Strawberry Lemonade", color: "#EC4899" },
  { name: "Lemon Lime", color: "#10B981" },
];

export const MANAGER_DIRECTIVES = [
  "Post 4-8 Instagram Stories daily",
  "No airport/uniform content on YouTube/TikTok",
  "Send new series concepts to Joey and Ali first",
  "Dog Dad Diaries: NYC Edition — develop weekly",
  "Optimize Life series — gym, supplements, paddle, recovery",
  "Atlas BTS series — product dev, meetings, behind scenes",
  "Lifestyle Finance series — credit cards, investing, NYC money tips",
  "Clean up cover photos — less face, more subject matter",
  "Add Instagram Highlights: Atlas, Bella, Pilot Life, Vacation Mode, Products, Tips",
];

export const PILLAR_HOOKS: Record<Pillar, string[]> = {
  lifestyle: [
    "3 ways I maximize credit card points while living in NYC",
    "How I afford to live in NYC as a pilot + entrepreneur",
    "The honest truth about buying your first home in your 30s",
    "What I actually spend money on in a week in NYC",
    "Credit cards I use to travel for almost free as a pilot",
    "How I think about money differently after building a brand",
    "NYC restaurants worth every penny (and how I afford them)",
  ],
  dogdad: [
    "Day in the life with Bella — NYC edition",
    "Everything I spend on my dog in a month (it's a lot)",
    "Taking Bella to the best dog spots in NYC",
    "What nobody tells you about having a dog in NYC",
    "Bella's morning routine vs. mine",
    "Ghost tagging [brand] — Bella's current favorite things",
    "Weimaraner owner things only we understand",
  ],
  performance: [
    "How I optimize my day for performance & focus",
    "Supplements, training, and treatments that fuel my life",
    "How I recover from a night out — hangover hack",
    "My morning routine as a pilot, founder, and creator",
    "The workout split that actually works with an irregular schedule",
    "Paddle tennis is the most underrated sport in NYC",
    "What peak performance actually looks like day to day",
  ],
  entrepreneur: [
    "Here's 1 mistake I'm learning from while building Atlas",
    "What nobody tells you about starting a CPG brand",
    "A day in the life building a hydration brand in NYC",
    "How I went from pilot to entrepreneur",
    "The real cost of developing a physical product",
    "Tips for running a business while working a full time job",
    "Why I built Atlas — the real story",
  ],
  pilot: [
    "What my schedule actually looks like as an airline pilot",
    "The lifestyle nobody tells you about before becoming a pilot",
    "How I stay healthy flying across time zones",
    "What I actually do on a 16-hour layover",
    "Pilot salary transparency — what I actually make",
    "The hidden perks of being an airline pilot",
    "Things I wish I knew before becoming a pilot",
  ],
};
