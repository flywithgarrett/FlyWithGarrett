import { kvGet, kvSet } from "./kv.server";
import type { OAuthTokens, PlatformStats, TopPost, DailyMetric } from "./types";

const SCOPES = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly";

export function getYouTubeAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID || "",
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI || "",
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleYouTubeCallback(code: string): Promise<OAuthTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI || "",
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
  await kvSet("auth:youtube", tokens);
  return tokens;
}

async function getValidToken(): Promise<string | null> {
  const tokens = await kvGet<OAuthTokens>("auth:youtube");
  if (!tokens) return null;
  if (Date.now() > tokens.expiresAt - 60000) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: tokens.refreshToken,
          client_id: process.env.YOUTUBE_CLIENT_ID || "",
          client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      tokens.accessToken = data.access_token;
      tokens.expiresAt = Date.now() + data.expires_in * 1000;
      await kvSet("auth:youtube", tokens);
    } catch {
      return null;
    }
  }
  return tokens.accessToken;
}

async function ytFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

export async function isYouTubeConnected(): Promise<boolean> {
  const tokens = await kvGet<OAuthTokens>("auth:youtube");
  return !!tokens?.accessToken;
}

export async function fetchYouTubeStats(): Promise<{
  stats: PlatformStats;
  topPosts: TopPost[];
  dailyMetrics: DailyMetric[];
} | null> {
  // Check cache first (1hr TTL)
  const cached = await kvGet<{ stats: PlatformStats; topPosts: TopPost[]; dailyMetrics: DailyMetric[]; cachedAt: number }>("cache:youtube:stats");
  if (cached && Date.now() - cached.cachedAt < 3600000) {
    return cached;
  }

  const token = await getValidToken();
  if (!token) return null;

  try {
    // Channel stats
    const channelData = await ytFetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
      token
    );
    const channel = channelData.items?.[0];
    if (!channel) return null;

    const stats: PlatformStats = {
      platform: "youtube",
      followers: Number(channel.statistics.subscriberCount),
      totalViews: Number(channel.statistics.viewCount),
      videoCount: Number(channel.statistics.videoCount),
      lastSynced: new Date().toISOString(),
    };

    // Top videos (last 90 days)
    const videosData = await ytFetch(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=viewCount&maxResults=10&publishedAfter=" +
        new Date(Date.now() - 90 * 86400000).toISOString(),
      token
    );
    const videoIds = videosData.items?.map((v: any) => v.id.videoId).join(",") || "";
    let topPosts: TopPost[] = [];
    if (videoIds) {
      const videoStats = await ytFetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}`,
        token
      );
      topPosts = (videoStats.items || []).map((v: any) => ({
        id: v.id,
        platform: "youtube" as const,
        title: v.snippet.title,
        thumbnailUrl: v.snippet.thumbnails?.medium?.url,
        views: Number(v.statistics.viewCount),
        likes: Number(v.statistics.likeCount),
        comments: Number(v.statistics.commentCount),
        publishedAt: v.snippet.publishedAt,
      }));
    }

    // Daily metrics placeholder (YouTube Analytics API requires different auth)
    const dailyMetrics: DailyMetric[] = [];

    const result = { stats, topPosts, dailyMetrics, cachedAt: Date.now() };
    await kvSet("cache:youtube:stats", result);
    return result;
  } catch (e) {
    console.error("YouTube fetch error:", e);
    return cached || null;
  }
}
