import { kvGet, kvSet } from "./kv.server";
import type { OAuthTokens, PlatformStats, TopPost, DailyMetric } from "./types";

export function getInstagramAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID || "",
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || "",
    scope: "instagram_basic,instagram_manage_insights,pages_read_engagement",
    response_type: "code",
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

export async function handleInstagramCallback(code: string): Promise<OAuthTokens> {
  // Exchange code for short-lived token
  const res = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID || "",
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET || "",
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || "",
      code,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&fb_exchange_token=${data.access_token}`
  );
  const longData = await longRes.json();

  const tokens: OAuthTokens = {
    accessToken: longData.access_token,
    refreshToken: "",
    expiresAt: Date.now() + (longData.expires_in || 5184000) * 1000,
  };
  await kvSet("auth:instagram", tokens);
  return tokens;
}

async function getValidToken(): Promise<string | null> {
  const tokens = await kvGet<OAuthTokens>("auth:instagram");
  if (!tokens) return null;

  // Refresh if within 7 days of expiry
  if (Date.now() > tokens.expiresAt - 7 * 86400000) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&fb_exchange_token=${tokens.accessToken}`
      );
      const data = await res.json();
      tokens.accessToken = data.access_token;
      tokens.expiresAt = Date.now() + (data.expires_in || 5184000) * 1000;
      await kvSet("auth:instagram", tokens);
    } catch {
      return tokens.accessToken;
    }
  }
  return tokens.accessToken;
}

async function igFetch(url: string, token: string) {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}access_token=${token}`);
  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  return res.json();
}

export async function isInstagramConnected(): Promise<boolean> {
  const tokens = await kvGet<OAuthTokens>("auth:instagram");
  return !!tokens?.accessToken;
}

export async function fetchInstagramStats(): Promise<{
  stats: PlatformStats;
  topPosts: TopPost[];
  dailyMetrics: DailyMetric[];
} | null> {
  const cached = await kvGet<{ stats: PlatformStats; topPosts: TopPost[]; dailyMetrics: DailyMetric[]; cachedAt: number }>("cache:instagram:stats");
  if (cached && Date.now() - cached.cachedAt < 3600000) {
    return cached;
  }

  const token = await getValidToken();
  if (!token) return null;

  try {
    // Get pages and Instagram account
    const pages = await igFetch("https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account", token);
    const igAccountId = pages.data?.[0]?.instagram_business_account?.id;
    if (!igAccountId) return null;

    // Account stats
    const account = await igFetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count,follows_count,media_count,username`,
      token
    );

    const stats: PlatformStats = {
      platform: "instagram",
      followers: account.followers_count,
      following: account.follows_count,
      mediaCount: account.media_count,
      lastSynced: new Date().toISOString(),
    };

    // Recent media
    const media = await igFetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=12`,
      token
    );

    const topPosts: TopPost[] = (media.data || []).map((m: any) => ({
      id: m.id,
      platform: "instagram" as const,
      title: (m.caption || "").slice(0, 100),
      thumbnailUrl: m.thumbnail_url || m.media_url,
      views: 0,
      likes: m.like_count || 0,
      comments: m.comments_count || 0,
      publishedAt: m.timestamp,
    }));

    const dailyMetrics: DailyMetric[] = [];

    const result = { stats, topPosts, dailyMetrics, cachedAt: Date.now() };
    await kvSet("cache:instagram:stats", result);
    return result;
  } catch (e) {
    console.error("Instagram fetch error:", e);
    return cached || null;
  }
}
