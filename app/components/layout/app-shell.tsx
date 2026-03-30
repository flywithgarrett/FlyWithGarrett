import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#080809]">
      <Sidebar />
      <main className="lg:ml-[240px] min-h-screen">
        <div className="p-5 lg:p-10 pt-16 lg:pt-10 max-w-[1200px]">
          <Outlet />
        </div>
      </main>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#111114", border: "1px solid rgba(255,255,255,0.07)", color: "#ffffffcc", fontSize: "13px", borderRadius: "12px" } }} />
    </div>
  );
}
