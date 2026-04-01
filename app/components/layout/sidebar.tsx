import { NavLink } from "react-router";
import { Sun, Calendar, Dumbbell, PenTool, BarChart3, Droplets, Smartphone, Briefcase, Plane, Globe, Link2, Menu, X } from "lucide-react";
import { useState } from "react";

const groups = [
  { items: [
    { to: "/dashboard", label: "Daily Brief", icon: Sun, accent: "#FF6B35" },
    { to: "/calendar", label: "Calendar", icon: Calendar, accent: "#3B82F6" },
    { to: "/fitness", label: "Fitness", icon: Dumbbell, accent: "#10B981" },
  ]},
  { items: [
    { to: "/studio", label: "Content Studio", icon: PenTool, accent: "#8B5CF6" },
    { to: "/analytics", label: "Analytics", icon: BarChart3, accent: "#10B981" },
  ]},
  { items: [
    { to: "/atlas", label: "Atlas Hydration", icon: Droplets, accent: "#10B981" },
    { to: "/skyway", label: "SkyWay", icon: Smartphone, accent: "#06B6D4" },
    { to: "/business", label: "Financials", icon: Briefcase, accent: "#F59E0B" },
  ]},
  { items: [
    { to: "/pilot", label: "Flight Schedule", icon: Plane, accent: "#06B6D4" },
    { to: "/brand", label: "Brand Vault", icon: Globe, accent: "#EF4444" },
  ]},
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-[10px] bg-[#1e1e1e]">
        {open ? <X className="w-5 h-5 text-[#f5f5f5]" /> : <Menu className="w-5 h-5 text-[#f5f5f5]" />}
      </button>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed left-0 top-0 bottom-0 z-40 w-[220px] bg-[#0f0f0f] flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-4 pt-6 pb-5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#F59E0B] flex items-center justify-center text-[11px] font-bold text-white">G</div>
          <div>
            <p className="text-[13px] font-semibold text-[#f5f5f5]">FlyWithGarrett</p>
            <p className="text-[10px] text-[rgba(245,245,245,0.2)]">Life OS</p>
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-4 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-[1px]">
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 h-[36px] rounded-[8px] text-[13px] relative transition-all ${
                      isActive ? "font-medium text-[#f5f5f5] bg-[#262626]" : "text-[rgba(245,245,245,0.4)] hover:text-[rgba(245,245,245,0.7)] hover:bg-[#1e1e1e]"
                    }`
                  }>
                  {({ isActive }) => (
                    <>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 rounded-r-full" style={{ backgroundColor: item.accent }} />}
                      <item.icon className="w-4 h-4 shrink-0" style={isActive ? { color: item.accent } : undefined} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-2 pb-2">
          <NavLink to="/integrations" onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-2.5 px-3 h-[36px] rounded-[8px] text-[13px] transition-all ${isActive ? "text-[#f5f5f5] bg-[#262626]" : "text-[rgba(245,245,245,0.3)] hover:text-[rgba(245,245,245,0.6)]"}`}>
            <Link2 className="w-4 h-4" /><span>Integrations</span>
          </NavLink>
        </div>
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-[12px] font-medium text-[#f5f5f5]">Garrett Ray</p>
          <p className="text-[10px] text-[rgba(245,245,245,0.2)]">@flywithgarrett</p>
        </div>
      </aside>
    </>
  );
}
