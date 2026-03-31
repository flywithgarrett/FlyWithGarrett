import { kvAddItem } from "~/lib/kv.server";
import { generateId } from "~/lib/utils";
import type { Idea, Pillar } from "~/lib/types";
import type { Route } from "./+types/api.save-idea";

export async function action({ request }: Route.ActionArgs) {
  try {
    const { title, pillar, hookDraft, notes } = await request.json();
    const idea: Idea = {
      id: generateId(),
      title,
      pillar: pillar as Pillar,
      hookDraft: hookDraft || "",
      notes: notes || "",
      status: "raw",
      createdAt: new Date().toISOString(),
    };
    await kvAddItem("ideas:bank", idea);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
