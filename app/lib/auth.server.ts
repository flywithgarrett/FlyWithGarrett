import { createCookieSessionStorage, redirect } from "react-router";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__fwg_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
    secrets: [process.env.APP_PASSWORD || "dev-secret-key"],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function requireAuth(request: Request) {
  const session = await getSession(request);
  if (!session.get("authenticated")) {
    throw redirect("/login");
  }
  return session;
}

export async function createSession(password: string) {
  const appPassword = process.env.APP_PASSWORD || "flywithgarrett2024";
  if (password !== appPassword) {
    return null;
  }
  const session = await sessionStorage.getSession();
  session.set("authenticated", true);
  return sessionStorage.commitSession(session);
}

export async function destroySession(request: Request) {
  const session = await getSession(request);
  return sessionStorage.destroySession(session);
}
