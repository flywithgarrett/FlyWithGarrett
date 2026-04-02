import { Form, redirect, useActionData } from "react-router";
import { Lock } from "lucide-react";
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-[#1d1d1f] flex items-center justify-center mx-auto mb-4 text-[16px] font-bold text-white">G</div>
          <h1 className="text-[24px] font-bold text-[#1d1d1f]">FlyWithGarrett</h1>
          <p className="text-[13px] text-[#86868b] mt-1">Life OS</p>
        </div>
        <Form method="post" className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input type="password" name="password" placeholder="Password" className="input-field pl-10 h-[44px]" autoFocus />
          </div>
          {actionData?.error && <p className="text-[13px] text-[#ff3b30]">{actionData.error}</p>}
          <button type="submit" className="btn-primary w-full h-[44px]">Sign In</button>
        </Form>
      </div>
    </div>
  );
}
