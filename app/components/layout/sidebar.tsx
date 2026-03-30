import { NavLink } from "react-router";
import {
  LayoutDashboard, Calendar, PenTool, BarChart3, Shield, Briefcase,
  Plane, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Command Center", icon: LayoutDashboard, accent: "#F97316" },
  { to: "/calendar", label: "Content Calendar", icon: Calendar, accent: "#3B82F6" },
  { to: "/studio", label: "Content Studio", icon: PenTool, accent: "#8B5CF6" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, accent: "#10B981" },
  { to: "/brand", label: "Brand Vault", icon: Shield, accent: "#EC4899" },
  { to: "/business", label: "Business Hub", icon: Briefcase, accent: "#F59E0B" },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[#111213] border border-[rgba(255,255,255,0.06)]"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 w-[220px] flex flex-col transition-transform duration-200",
          "bg-gradient-to-b from-[#0D0E0F] to-[#0A0B0C] border-r border-[rgba(255,255,255,0.06)]",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-white tracking-tight">FlyWithGarrett</h1>
              <p className="text-[11px] text-[#71717A] leading-tight">Creator OS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          <p className="text-section px-2.5 pb-2 pt-1">Navigation</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative",
                  isActive
                    ? "text-white bg-white/[0.06]"
                    : "text-[#71717A] hover:text-[#A1A1AA] hover:bg-white/[0.03]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                      style={{ backgroundColor: item.accent }}
                    />
                  )}
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white">
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">Garrett Ray</p>
              <p className="text-[11px] text-[#71717A] truncate">@flywithgarrett</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
