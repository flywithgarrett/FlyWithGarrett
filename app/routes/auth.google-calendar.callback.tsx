import { redirect } from "react-router";
import { handleGoogleCalendarCallback } from "~/lib/google-calendar.server";
import type { Route } from "./+types/auth.google-calendar.callback";
export async function loader({ request }: Route.LoaderArgs) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) await handleGoogleCalendarCallback(code);
  return redirect("/dashboard");
}
