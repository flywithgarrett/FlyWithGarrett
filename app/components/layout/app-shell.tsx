import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#141414]">
      <Sidebar />
      <main className="lg:ml-[220px] min-h-screen">
        <div className="p-5 lg:p-8 pt-16 lg:pt-8 max-w-[1100px]">
          <Outlet />
        </div>
      </main>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.08)", color: "#f5f5f5", fontSize: "13px", borderRadius: "12px" } }} />
    </div>
  );
}
