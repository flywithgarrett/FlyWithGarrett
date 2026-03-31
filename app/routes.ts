import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("api/generate-script", "routes/api.generate-script.ts"),
  route("api/save-idea", "routes/api.save-idea.ts"),
  route("auth/youtube", "routes/auth.youtube.tsx"),
  route("auth/youtube/callback", "routes/auth.youtube.callback.tsx"),
  route("auth/instagram", "routes/auth.instagram.tsx"),
  route("auth/instagram/callback", "routes/auth.instagram.callback.tsx"),
  route("auth/tiktok", "routes/auth.tiktok.tsx"),
  route("auth/tiktok/callback", "routes/auth.tiktok.callback.tsx"),
  route("auth/google-calendar", "routes/auth.google-calendar.tsx"),
  route("auth/google-calendar/callback", "routes/auth.google-calendar.callback.tsx"),
  layout("routes/app-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("studio", "routes/studio.tsx"),
    route("analytics", "routes/analytics.tsx"),
    route("brand", "routes/brand.tsx"),
    route("business", "routes/business.tsx"),
    route("pilot", "routes/pilot.tsx"),
    route("fitness", "routes/fitness.tsx"),
    route("atlas", "routes/atlas.tsx"),
    route("skyway", "routes/skyway.tsx"),
    route("integrations", "routes/integrations.tsx"),
  ]),
] satisfies RouteConfig;
