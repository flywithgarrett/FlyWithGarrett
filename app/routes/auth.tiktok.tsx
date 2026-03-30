import { redirect } from "react-router";
import { getTikTokAuthUrl } from "~/lib/tiktok.server";

export function loader() {
  return redirect(getTikTokAuthUrl());
}
