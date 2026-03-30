import { redirect } from "react-router";
import { handleYouTubeCallback } from "~/lib/youtube.server";
import type { Route } from "./+types/auth.youtube.callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    await handleYouTubeCallback(code);
  }
  return redirect("/analytics");
}
