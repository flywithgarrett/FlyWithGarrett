import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="lg:ml-[220px] min-h-screen">
        <div className="px-6 py-6 lg:px-10 lg:py-8 pt-16 lg:pt-8 max-w-[960px]">
          <Outlet />
        </div>
      </main>
      <Toaster theme="light" position="bottom-right" toastOptions={{ style: { background: "#fff", border: "1px solid rgba(0,0,0,0.06)", color: "#1d1d1f", fontSize: "13px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } }} />
    </div>
  );
}
