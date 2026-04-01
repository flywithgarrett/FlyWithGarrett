import { Form, redirect, useActionData } from "react-router";
import { Plane, Lock } from "lucide-react";
import { createSession, getSession } from "~/lib/auth.server";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("authenticated")) return redirect("/dashboard");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const sessionCookie = await createSession(formData.get("password") as string);
  if (!sessionCookie) return { error: "Invalid password" };
  return redirect("/dashboard", { headers: { "Set-Cookie": sessionCookie } });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F59E0B] flex items-center justify-center mx-auto mb-4 text-[16px] font-bold text-white">G</div>
          <h1 className="text-[24px] font-light text-[#f5f5f5] tracking-tight">FlyWithGarrett</h1>
          <p className="text-[11px] text-[rgba(245,245,245,0.2)] mt-1">Life OS</p>
        </div>
        <Form method="post" className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(245,245,245,0.2)]" />
            <input type="password" name="password" placeholder="Password" className="input-field pl-9 h-[42px]" autoFocus />
          </div>
          {actionData?.error && <p className="text-[12px] text-[#ef4444]">{actionData.error}</p>}
          <button type="submit" className="btn-primary w-full h-[42px]">Enter</button>
        </Form>
      </div>
    </div>
  );
}
