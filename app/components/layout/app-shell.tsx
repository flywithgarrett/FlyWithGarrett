import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="lg:ml-[240px] min-h-screen">
        <div className="p-5 lg:p-10 pt-16 lg:pt-10 max-w-[1200px]">
          <Outlet />
        </div>
      </main>
      <Toaster theme="light" position="bottom-right" toastOptions={{ style: { background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", color: "#1d1d1f", fontSize: "13px", borderRadius: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } }} />
    </div>
  );
}
