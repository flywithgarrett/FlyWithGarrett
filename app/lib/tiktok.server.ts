import { kvGet, kvSet } from "./kv.server";
import type { OAuthTokens, PlatformStats, TopPost, DailyMetric } from "./types";

export function getTikTokAuthUrl(): string {
  const csrfState = Math.random().toString(36).substring(7);
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || "",
    redirect_uri: process.env.TIKTOK_REDIRECT_URI || "",
    scope: "user.info.basic,video.list",
    response_type: "code",
    state: csrfState,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export async function handleTikTokCallback(code: string): Promise<OAuthTokens> {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || "",
    }),
  });
  const data = await res.json();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
    scope: data.scope,
  };
  await kvSet("auth:tiktok", tokens);
  return tokens;
}

async function getValidToken(): Promise<string | null> {
  const tokens = await kvGet<OAuthTokens>("auth:tiktok");
  if (!tokens) return null;
  if (Date.now() > tokens.expiresAt - 60000) {
    try {
      const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY || "",
          client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
          refresh_token: tokens.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      tokens.accessToken = data.access_token;
      tokens.refreshToken = data.refresh_token || tokens.refreshToken;
      tokens.expiresAt = Date.now() + (data.expires_in || 86400) * 1000;
      await kvSet("auth:tiktok", tokens);
    } catch {
      return null;
    }
  }
  return tokens.accessToken;
}

export async function isTikTokConnected(): Promise<boolean> {
  const tokens = await kvGet<OAuthTokens>("auth:tiktok");
  return !!tokens?.accessToken;
}

export async function fetchTikTokStats(): Promise<{
  stats: PlatformStats;
  topPosts: TopPost[];
  dailyMetrics: DailyMetric[];
} | null> {
  const cached = await kvGet<{ stats: PlatformStats; topPosts: TopPost[]; dailyMetrics: DailyMetric[]; cachedAt: number }>("cache:tiktok:stats");
  if (cached && Date.now() - cached.cachedAt < 3600000) {
    return cached;
  }

  const token = await getValidToken();
  if (!token) return null;

  try {
    // User info
    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count,display_name,avatar_url", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userRes.json();
    const user = userData.data?.user;
    if (!user) return null;

    const stats: PlatformStats = {
      platform: "tiktok",
      followers: user.follower_count || 0,
      following: user.following_count || 0,
      totalLikes: user.likes_count || 0,
      videoCount: user.video_count || 0,
      lastSynced: new Date().toISOString(),
    };

    // Video list
    const videosRes = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,cover_image_url,view_count,like_count,comment_count,share_count,create_time", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 10 }),
    });
    const videosData = await videosRes.json();

    const topPosts: TopPost[] = (videosData.data?.videos || []).map((v: any) => ({
      id: v.id,
      platform: "tiktok" as const,
      title: v.title || "",
      thumbnailUrl: v.cover_image_url,
      views: v.view_count || 0,
      likes: v.like_count || 0,
      comments: v.comment_count || 0,
      shares: v.share_count || 0,
      publishedAt: new Date((v.create_time || 0) * 1000).toISOString(),
    }));

    const dailyMetrics: DailyMetric[] = [];

    const result = { stats, topPosts, dailyMetrics, cachedAt: Date.now() };
    await kvSet("cache:tiktok:stats", result);
    return result;
  } catch (e) {
    console.error("TikTok fetch error:", e);
    return cached || null;
  }
}
