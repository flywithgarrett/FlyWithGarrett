import { NavLink } from "react-router";
import { LayoutDashboard, Calendar, PenTool, BarChart3, Shield, Briefcase, Plane, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Command Center", icon: LayoutDashboard, accent: "#ff9f0a" },
  { to: "/calendar", label: "Calendar", icon: Calendar, accent: "#0a84ff" },
  { to: "/studio", label: "Content Studio", icon: PenTool, accent: "#bf5af2" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, accent: "#30d158" },
  { to: "/brand", label: "Brand Vault", icon: Shield, accent: "#ff375f" },
  { to: "/business", label: "Business Hub", icon: Briefcase, accent: "#ffd60a" },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-[12px] bg-[#2c2c2e]">
        {open ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden fade-in" onClick={() => setOpen(false)} />}
      <aside className={`fixed left-0 top-0 bottom-0 z-40 w-[240px] bg-[#161618] flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#2c2c2e] flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-white tracking-tight">FlyWithGarrett</p>
              <p className="text-[11px] text-[rgba(235,235,245,0.3)]">Creator OS</p>
            </div>
          </div>
        </div>

        {/* Nav — no "NAVIGATION" label */}
        <nav className="flex-1 px-3 space-y-[2px]">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-[10px] px-3 py-[9px] rounded-[12px] text-[15px] font-normal relative transition-all duration-200 ${
                  isActive ? "text-white bg-[rgba(255,255,255,0.05)]" : "text-[rgba(235,235,245,0.4)] hover:text-[rgba(235,235,245,0.7)] hover:bg-[rgba(255,255,255,0.03)]"
                }`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full" style={{ backgroundColor: item.accent }} />}
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff9f0a] to-[#ff375f] flex items-center justify-center text-[11px] font-bold text-white">G</div>
            <div>
              <p className="text-[13px] font-medium text-white">Garrett Ray</p>
              <p className="text-[11px] text-[rgba(235,235,245,0.3)]">@flywithgarrett</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
