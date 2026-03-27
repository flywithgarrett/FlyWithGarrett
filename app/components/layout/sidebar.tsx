import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  PenTool,
  BarChart3,
  Shield,
  Briefcase,
  Plane,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { to: "/calendar", label: "Content Calendar", icon: Calendar },
  { to: "/studio", label: "Content Studio", icon: PenTool },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/brand", label: "Brand Vault", icon: Shield },
  { to: "/business", label: "Business Hub", icon: Briefcase },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 w-64 bg-sidebar border-r border-border flex flex-col transition-transform duration-200",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">FlyWithGarrett</h1>
              <p className="text-xs text-muted-foreground">Creator OS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Garrett Ray</p>
              <p className="text-xs text-muted-foreground truncate">@flywithgarrett</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
