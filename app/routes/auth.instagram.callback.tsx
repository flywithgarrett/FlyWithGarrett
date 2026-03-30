import { redirect } from "react-router";
import { handleInstagramCallback } from "~/lib/instagram.server";
import type { Route } from "./+types/auth.instagram.callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    await handleInstagramCallback(code);
  }
  return redirect("/analytics");
}
