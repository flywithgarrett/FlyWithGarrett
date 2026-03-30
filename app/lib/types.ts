export type Pillar = "lifestyle" | "dogdad" | "performance" | "entrepreneur" | "pilot";
export type Platform = "instagram" | "tiktok" | "youtube";
export type ContentStatus = "idea" | "drafted" | "filmed" | "posted";
export type FeatureStatus = "backlog" | "in_dev" | "shipped";
export type CollabStatus = "potential" | "outreach" | "negotiating" | "confirmed" | "completed";

export interface ContentItem {
  id: string;
  title: string;
  pillar: Pillar;
  platforms: Platform[];
  status: ContentStatus;
  hook: string;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  postedAt: string | null;
  notes: string;
  seriesId: string | null;
  createdAt: string;
}

export interface ContentSeries {
  id: string;
  name: string;
  pillar: Pillar;
  episodeCount: number;
  description: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  pillar: Pillar;
  hookDraft: string;
  notes: string;
  status: "raw" | "developing" | "ready";
  createdAt: string;
}

export interface HookTemplate {
  id: string;
  title: string;
  templateText: string;
  contentType: string;
  pillar: Pillar;
  createdAt: string;
}

export interface AnalyticsSnapshot {
  id: string;
  platform: Platform;
  followers: number;
  views: number;
  reach: number;
  engagementRate: number;
  topPostTitle: string;
  recordedAt: string;
}

export interface Goal {
  id: string;
  platform: Platform;
  metric: string;
  target: number;
  current: number;
  month: string;
  createdAt: string;
}

export interface Collaboration {
  id: string;
  creatorName: string;
  platform: Platform;
  status: CollabStatus;
  notes: string;
  dealTerms: string;
  createdAt: string;
}

export interface AtlasMetric {
  id: string;
  revenue: number;
  unitsSold: number;
  websiteVisits: number;
  recordedMonth: string;
  notes: string;
  createdAt: string;
}

export interface SkywayFeature {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  priority: number;
  createdAt: string;
}

export interface HashtagSet {
  id: string;
  name: string;
  pillar: Pillar;
  platform: Platform | "all";
  hashtags: string[];
  createdAt: string;
}

export interface BrandConfig {
  handle: string;
  tagline: string;
  tone: string[];
  audiences: string[];
  contentWorlds: string[];
  platformBios: Record<Platform, string>;
  captionTemplates: { id: string; name: string; template: string; platform: Platform }[];
}

export interface IncomeEntry {
  id: string;
  month: string;
  pilotIncome: number;
  creatorIncome: number;
  atlasRevenue: number;
  brandDeals: number;
  expenses: number;
  createdAt: string;
}

// OAuth tokens
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
}

// Platform analytics types
export interface PlatformStats {
  platform: Platform;
  followers: number;
  following?: number;
  totalViews?: number;
  totalLikes?: number;
  videoCount?: number;
  mediaCount?: number;
  growth30d?: number;
  engagementRate?: number;
  lastSynced: string;
}

export interface TopPost {
  id: string;
  platform: Platform;
  title: string;
  thumbnailUrl?: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  reach?: number;
  engagementRate?: number;
  watchTime?: number;
  completionRate?: number;
  avgViewDuration?: number;
  ctr?: number;
  publishedAt: string;
}

export interface AudienceDemographics {
  platform: Platform;
  ageGender?: { age: string; male: number; female: number }[];
  topCities?: { city: string; count: number }[];
  topCountries?: { country: string; count: number }[];
}

export interface DailyMetric {
  date: string;
  followers?: number;
  views?: number;
  reach?: number;
  engagement?: number;
}

// AI Analysis types
export interface AnalysisResult {
  id: string;
  platform: Platform | "all";
  createdAt: string;
  overallScore: number;
  scoreSummary: string;
  weeklyFocus: string;
  whatsWorking: { insight: string; evidence: string; action: string }[];
  whatsNotWorking: { insight: string; evidence: string; action: string }[];
  contentGaps: { pillar: string; gap: string; suggestion: string }[];
  topOpportunities: { opportunity: string; rationale: string; priority: "high" | "medium" | "low" }[];
}
