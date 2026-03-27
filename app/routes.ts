import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/app-layout.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("studio", "routes/studio.tsx"),
    route("analytics", "routes/analytics.tsx"),
    route("brand", "routes/brand.tsx"),
    route("business", "routes/business.tsx"),
  ]),
] satisfies RouteConfig;
