import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111827",
            border: "1px solid #1E293B",
            color: "#E2E8F0",
          },
        }}
      />
    </div>
  );
}
