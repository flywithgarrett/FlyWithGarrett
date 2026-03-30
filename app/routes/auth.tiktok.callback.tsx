import { redirect } from "react-router";
import { handleTikTokCallback } from "~/lib/tiktok.server";
import type { Route } from "./+types/auth.tiktok.callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    await handleTikTokCallback(code);
  }
  return redirect("/analytics");
}
