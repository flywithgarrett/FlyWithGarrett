import { redirect } from "react-router";
import { AppShell } from "~/components/layout/app-shell";
import { getSession } from "~/lib/auth.server";
import { seedIfEmpty } from "~/lib/seed.server";
import type { Route } from "./+types/app-layout";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (!session.get("authenticated")) {
    return redirect("/login");
  }
  await seedIfEmpty();
  return null;
}

export default function AppLayout() {
  return <AppShell />;
}
