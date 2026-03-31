import { kvGet, kvSet } from "./kv.server";
import type { OAuthTokens } from "./types";

export function getGoogleCalendarAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCalendarCallback(code: string): Promise<OAuthTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await kvSet("auth:google-calendar", tokens);
  return tokens;
}

async function getValidToken(): Promise<string | null> {
  const tokens = await kvGet<OAuthTokens>("auth:google-calendar");
  if (!tokens) return null;
  if (Date.now() > tokens.expiresAt - 60000) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: tokens.refreshToken,
          client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      tokens.accessToken = data.access_token;
      tokens.expiresAt = Date.now() + data.expires_in * 1000;
      await kvSet("auth:google-calendar", tokens);
    } catch { return null; }
  }
  return tokens.accessToken;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  category: "personal" | "flying" | "content" | "business" | "fitness";
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  const tokens = await kvGet<OAuthTokens>("auth:google-calendar");
  return !!tokens?.accessToken;
}

export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const cacheKey = `cache:gcal:${new Date().toISOString().split("T")[0]}`;
  const cached = await kvGet<CalendarEvent[]>(cacheKey);
  if (cached) return cached;

  const token = await getValidToken();
  if (!token) return [];

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const events: CalendarEvent[] = (data.items || []).map((e: any) => ({
      id: e.id,
      title: e.summary || "Untitled",
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
      allDay: !e.start?.dateTime,
      location: e.location,
      category: categorizeEvent(e.summary || ""),
    }));
    await kvSet(cacheKey, events);
    return events;
  } catch { return []; }
}

function categorizeEvent(title: string): CalendarEvent["category"] {
  const lower = title.toLowerCase();
  if (lower.includes("fly") || lower.includes("trip") || lower.includes("reserve")) return "flying";
  if (lower.includes("film") || lower.includes("content") || lower.includes("shoot")) return "content";
  if (lower.includes("atlas") || lower.includes("skyway") || lower.includes("meeting")) return "business";
  if (lower.includes("gym") || lower.includes("workout") || lower.includes("paddle")) return "fitness";
  return "personal";
}
