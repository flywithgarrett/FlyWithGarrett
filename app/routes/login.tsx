import { useState } from "react";
import { Form, redirect, useActionData } from "react-router";
import { Plane, Lock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createSession, getSession } from "~/lib/auth.server";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("authenticated")) {
    return redirect("/dashboard");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = formData.get("password") as string;

  const sessionCookie = await createSession(password);
  if (!sessionCookie) {
    return { error: "Invalid password" };
  }

  return redirect("/dashboard", {
    headers: { "Set-Cookie": sessionCookie },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [focused, setFocused] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FlyWithGarrett</h1>
          <p className="text-sm text-muted-foreground mt-1">Creator OS — Personal Dashboard</p>
        </div>

        <Form method="post" className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              name="password"
              placeholder="Enter password"
              className="pl-10 h-11 bg-card"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
            />
          </div>

          {actionData?.error && (
            <p className="text-sm text-destructive">{actionData.error}</p>
          )}

          <Button type="submit" className="w-full h-11">
            Enter Command Center
          </Button>
        </Form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Living at altitude.
        </p>
      </div>
    </div>
  );
}
