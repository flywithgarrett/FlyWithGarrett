import {
  isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" },
];

export function meta() {
  return [
    { title: "FlyWithGarrett — Life OS" },
    { name: "description", content: "Personal life operating system for @flywithgarrett" },
    { name: "theme-color", content: "#141414" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>{children}<ScrollRestoration /><Scripts /></body>
    </html>
  );
}

export default function App() { return <Outlet />; }

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!", details = "An unexpected error occurred.";
  if (isRouteErrorResponse(error)) { message = error.status === 404 ? "404" : "Error"; details = error.statusText || details; }
  return (<main className="pt-16 p-4 container mx-auto"><h1 className="text-title">{message}</h1><p className="text-body mt-2">{details}</p></main>);
}
