import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#1c1c1e]">
      <Sidebar />
      <main className="lg:ml-[240px] min-h-screen">
        <div className="p-5 lg:p-10 pt-16 lg:pt-10 max-w-[1200px]">
          <Outlet />
        </div>
      </main>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#2c2c2e", border: "none", color: "#ffffff", fontSize: "13px", borderRadius: "14px" } }} />
    </div>
  );
}
