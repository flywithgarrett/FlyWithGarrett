import { NavLink } from "react-router";
import { Sun, Calendar, Dumbbell, PenTool, CalendarDays, BarChart3, Droplets, Smartphone, Briefcase, Plane as PlaneIcon, Globe, Settings, Link2, Menu, X } from "lucide-react";
import { useState } from "react";

const sections = [
  {
    label: "LIFE OS",
    items: [
      { to: "/dashboard", label: "Daily Brief", icon: Sun, accent: "#ff9f0a" },
      { to: "/calendar", label: "My Calendar", icon: Calendar, accent: "#007aff" },
      { to: "/fitness", label: "Fitness", icon: Dumbbell, accent: "#34c759" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { to: "/studio", label: "Content Studio", icon: PenTool, accent: "#af52de" },
      { to: "/analytics", label: "Analytics", icon: BarChart3, accent: "#34c759" },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { to: "/atlas", label: "Atlas Hydration", icon: Droplets, accent: "#34c759" },
      { to: "/skyway", label: "SkyWay", icon: Smartphone, accent: "#007aff" },
      { to: "/business", label: "Financials", icon: Briefcase, accent: "#ff9500" },
    ],
  },
  {
    label: "PILOT LIFE",
    items: [
      { to: "/pilot", label: "Flight Schedule", icon: PlaneIcon, accent: "#5ac8fa" },
      { to: "/brand", label: "Brand Vault", icon: Globe, accent: "#ff2d55" },
    ],
  },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-[12px] bg-[#f5f5f7]">
        {open ? <X className="w-5 h-5 text-[#1d1d1f]" /> : <Menu className="w-5 h-5 text-[#1d1d1f]" />}
      </button>
      {open && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden fade-in" onClick={() => setOpen(false)} />}
      <aside className={`fixed left-0 top-0 bottom-0 z-40 w-[240px] bg-[#fafafa] border-r border-[rgba(0,0,0,0.06)] flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 pt-6 pb-4">
          <p className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">FlyWithGarrett</p>
          <p className="text-[11px] text-[#86868b]">Life OS</p>
        </div>
        <nav className="flex-1 px-3 overflow-y-auto space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#aeaeb2] px-3 mb-1">{section.label}</p>
              <div className="space-y-[1px]">
                {section.items.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-[10px] px-3 py-[7px] rounded-[10px] text-[13px] relative transition-all duration-150 ${
                        isActive ? "font-medium text-[#1d1d1f] bg-[rgba(0,0,0,0.04)]" : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.02)]"
                      }`
                    }>
                    {({ isActive }) => (
                      <>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-r-full" style={{ backgroundColor: item.accent }} />}
                        <item.icon className="w-[16px] h-[16px] shrink-0" style={isActive ? { color: item.accent } : undefined} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-3 pb-2">
          <NavLink to="/integrations" onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-[10px] px-3 py-[7px] rounded-[10px] text-[13px] transition-all ${isActive ? "font-medium text-[#1d1d1f] bg-[rgba(0,0,0,0.04)]" : "text-[#86868b] hover:text-[#1d1d1f]"}`}>
            <Link2 className="w-[16px] h-[16px]" />
            <span>Integrations</span>
          </NavLink>
        </div>
        <div className="px-5 py-4 border-t border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff9f0a] to-[#ff375f] flex items-center justify-center text-[11px] font-bold text-white">G</div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">Garrett Ray</p>
              <p className="text-[11px] text-[#86868b]">@flywithgarrett</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
