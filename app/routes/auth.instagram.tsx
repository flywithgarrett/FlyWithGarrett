import { redirect } from "react-router";
import { getInstagramAuthUrl } from "~/lib/instagram.server";

export function loader() {
  return redirect(getInstagramAuthUrl());
}
