import { redirect } from "react-router";
import { getYouTubeAuthUrl } from "~/lib/youtube.server";

export function loader() {
  return redirect(getYouTubeAuthUrl());
}
