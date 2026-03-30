import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#08090A]">
      <Sidebar />
      <main className="lg:ml-[220px] min-h-screen">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111213",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#ECECED",
            fontSize: "13px",
          },
        }}
      />
    </div>
  );
}
