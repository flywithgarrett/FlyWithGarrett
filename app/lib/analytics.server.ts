import { fetchYouTubeStats, isYouTubeConnected } from "./youtube.server";
import { fetchInstagramStats, isInstagramConnected } from "./instagram.server";
import { fetchTikTokStats, isTikTokConnected } from "./tiktok.server";
import type { PlatformStats, TopPost, DailyMetric, Platform } from "./types";

export interface AggregatedAnalytics {
  platforms: {
    youtube: { connected: boolean; stats: PlatformStats | null; topPosts: TopPost[]; dailyMetrics: DailyMetric[] };
    instagram: { connected: boolean; stats: PlatformStats | null; topPosts: TopPost[]; dailyMetrics: DailyMetric[] };
    tiktok: { connected: boolean; stats: PlatformStats | null; topPosts: TopPost[]; dailyMetrics: DailyMetric[] };
  };
  totalFollowers: number;
  connectedCount: number;
}

export async function getAggregatedAnalytics(): Promise<AggregatedAnalytics> {
  const [ytConnected, igConnected, ttConnected] = await Promise.all([
    isYouTubeConnected(),
    isInstagramConnected(),
    isTikTokConnected(),
  ]);

  const [ytData, igData, ttData] = await Promise.all([
    ytConnected ? fetchYouTubeStats() : null,
    igConnected ? fetchInstagramStats() : null,
    ttConnected ? fetchTikTokStats() : null,
  ]);

  const totalFollowers =
    (ytData?.stats?.followers || 0) +
    (igData?.stats?.followers || 0) +
    (ttData?.stats?.followers || 0);

  return {
    platforms: {
      youtube: {
        connected: ytConnected,
        stats: ytData?.stats || null,
        topPosts: ytData?.topPosts || [],
        dailyMetrics: ytData?.dailyMetrics || [],
      },
      instagram: {
        connected: igConnected,
        stats: igData?.stats || null,
        topPosts: igData?.topPosts || [],
        dailyMetrics: igData?.dailyMetrics || [],
      },
      tiktok: {
        connected: ttConnected,
        stats: ttData?.stats || null,
        topPosts: ttData?.topPosts || [],
        dailyMetrics: ttData?.dailyMetrics || [],
      },
    },
    totalFollowers,
    connectedCount: [ytConnected, igConnected, ttConnected].filter(Boolean).length,
  };
}

export async function getConnectionStatus(): Promise<Record<Platform, boolean>> {
  const [yt, ig, tt] = await Promise.all([
    isYouTubeConnected(),
    isInstagramConnected(),
    isTikTokConnected(),
  ]);
  return { youtube: yt, instagram: ig, tiktok: tt };
}
