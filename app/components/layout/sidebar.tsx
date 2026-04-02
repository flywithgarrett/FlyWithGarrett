import { NavLink } from "react-router";
import { Sun, Calendar, Dumbbell, PenTool, BarChart3, Droplets, Smartphone, Briefcase, Plane, Globe, Link2, Menu, X } from "lucide-react";
import { useState } from "react";

const groups = [
  { label: "Life", items: [
    { to: "/dashboard", label: "Daily Brief", icon: Sun },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/fitness", label: "Fitness", icon: Dumbbell },
  ]},
  { label: "Create", items: [
    { to: "/studio", label: "Content Studio", icon: PenTool },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
  ]},
  { label: "Business", items: [
    { to: "/atlas", label: "Atlas Hydration", icon: Droplets },
    { to: "/skyway", label: "SkyWay", icon: Smartphone },
    { to: "/business", label: "Financials", icon: Briefcase },
  ]},
  { label: "More", items: [
    { to: "/pilot", label: "Flight Schedule", icon: Plane },
    { to: "/brand", label: "Brand Vault", icon: Globe },
  ]},
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[#f5f5f7]">
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {open && <div className="fixed inset-0 bg-black/10 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed left-0 top-0 bottom-0 z-40 w-[220px] bg-[#fafafa] border-r border-[rgba(0,0,0,0.06)] flex flex-col transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1d1d1f] flex items-center justify-center text-[11px] font-bold text-white">G</div>
          <div>
            <p className="text-[14px] font-semibold text-[#1d1d1f]">FlyWithGarrett</p>
            <p className="text-[11px] text-[#86868b]">Life OS</p>
          </div>
        </div>
        <nav className="flex-1 px-2 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="text-[11px] font-semibold text-[#86868b] px-3 mb-1">{g.label}</p>
              {g.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 h-[34px] rounded-lg text-[13px] transition-all ${
                      isActive ? "font-semibold text-[#1d1d1f] bg-[rgba(0,0,0,0.05)]" : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.03)]"
                    }`
                  }>
                  <item.icon className="w-[16px] h-[16px] shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-2 pb-2">
          <NavLink to="/integrations" onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-2.5 px-3 h-[34px] rounded-lg text-[13px] transition-all ${isActive ? "text-[#1d1d1f] bg-[rgba(0,0,0,0.05)]" : "text-[#86868b] hover:text-[#1d1d1f]"}`}>
            <Link2 className="w-4 h-4" /><span>Integrations</span>
          </NavLink>
        </div>
        <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)]">
          <p className="text-[12px] font-medium text-[#1d1d1f]">Garrett Ray</p>
          <p className="text-[11px] text-[#86868b]">@flywithgarrett</p>
        </div>
      </aside>
    </>
  );
}
