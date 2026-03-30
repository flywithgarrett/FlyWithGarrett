import { useState } from "react";
import { Form, redirect, useActionData } from "react-router";
import { Plane, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createSession, getSession } from "~/lib/auth.server";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("authenticated")) return redirect("/dashboard");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = formData.get("password") as string;
  const sessionCookie = await createSession(password);
  if (!sessionCookie) return { error: "Invalid password" };
  return redirect("/dashboard", { headers: { "Set-Cookie": sessionCookie } });
}

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-[#08090A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mx-auto mb-4">
            <Plane className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-title text-white">FlyWithGarrett</h1>
          <p className="text-[13px] text-[#71717A] mt-1.5">Creator OS</p>
        </div>
        <Form method="post" className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <Input type="password" name="password" placeholder="Enter password" className="pl-10 h-11 bg-[#111213] border-[rgba(255,255,255,0.06)]" autoFocus />
          </div>
          {actionData?.error && <p className="text-sm text-red-400">{actionData.error}</p>}
          <Button type="submit" className="w-full h-11 bg-white text-[#08090A] hover:bg-white/90 font-medium">Enter Command Center</Button>
        </Form>
        <p className="text-[11px] text-[#71717A] text-center mt-8">Living at altitude.</p>
      </div>
    </div>
  );
}
