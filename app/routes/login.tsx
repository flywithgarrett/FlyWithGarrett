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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-[16px] bg-[#1d1d1f] flex items-center justify-center mx-auto mb-5">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-title">FlyWithGarrett</h1>
          <p className="text-micro mt-2">Creator OS</p>
        </div>
        <Form method="post" className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input type="password" name="password" placeholder="Enter password" className="input-field pl-10" autoFocus />
          </div>
          {actionData?.error && <p className="text-[13px] text-[#ff3b30]">{actionData.error}</p>}
          <button type="submit" className="btn-primary w-full">Enter Command Center</button>
        </Form>
        <p className="text-[11px] text-[#d2d2d7] text-center mt-10">Living at altitude.</p>
      </div>
    </div>
  );
}
