import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/youtube", "routes/auth.youtube.tsx"),
  route("auth/youtube/callback", "routes/auth.youtube.callback.tsx"),
  route("auth/instagram", "routes/auth.instagram.tsx"),
  route("auth/instagram/callback", "routes/auth.instagram.callback.tsx"),
  route("auth/tiktok", "routes/auth.tiktok.tsx"),
  route("auth/tiktok/callback", "routes/auth.tiktok.callback.tsx"),
  layout("routes/app-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("studio", "routes/studio.tsx"),
    route("analytics", "routes/analytics.tsx"),
    route("brand", "routes/brand.tsx"),
    route("business", "routes/business.tsx"),
  ]),
] satisfies RouteConfig;
