import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useSite } from "../lib/SiteContext";
import { LogOut, Users, CalendarCheck, Receipt, FileText, Map, Settings2, HandCoins } from "lucide-react";
import { cn } from "../lib/utils";

export function Layout() {
  const { appUser, signOut } = useAuth();
  const { sites, currentSite, setCurrentSite } = useSite();
  const location = useLocation();

  const navItems = [
    { name: "Master Roll", path: "/employees", icon: Users },
    { name: "Attendance", path: "/attendance", icon: CalendarCheck },
    { name: "Advances", path: "/advances", icon: HandCoins },
    ...(appUser?.role === 'admin' ? [
      { name: "Payroll", path: "/payroll", icon: Receipt },
      { name: "Site Config", path: "/sites", icon: Map },
      { name: "Reports", path: "/reports", icon: FileText },
    ] : [])
  ];

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-bg text-text-main">
      {/* Header */}
      <header className="h-[60px] bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <div className="text-[18px] font-extrabold text-text-main tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-[6px] text-white flex items-center justify-center text-[15px] shadow-sm">
              KPS
            </div>
            ENTERPRISES
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-8">
            <span className="text-[13px] font-semibold text-text-muted">Active Site:</span>
            <select
              value={currentSite?.id || ""}
              onChange={e => {
                const s = sites.find(x => x.id === e.target.value);
                if (s) setCurrentSite(s);
              }}
              className="border border-border rounded-[6px] px-3 py-1.5 text-[13px] font-semibold bg-[#f8fafc] text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-[200px]"
            >
              <option value="" disabled>Select a workspace...</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="text-[13px] border border-border px-3 py-1.5 rounded-[6px] bg-[#f8fafc]">
            <span className="font-semibold text-text-main">{appUser?.name}</span>
            <span className="text-text-muted ml-2 capitalize">({appUser?.role})</span>
          </div>
          <button 
            onClick={signOut} 
            className="flex items-center space-x-2 px-3 py-1.5 border border-border bg-white rounded-[6px] text-[13px] font-medium text-text-muted hover:bg-gray-50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>
      
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[220px] bg-sidebar border-r border-border py-5 flex flex-col shrink-0">
          <nav className="flex flex-col">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 px-6 py-3 text-[14px] transition-all",
                    active 
                      ? "text-primary bg-[#eff6ff] border-r-[3px] border-primary font-semibold" 
                      : "text-text-muted hover:bg-gray-50 font-medium"
                  )}
                >
                  <item.icon className="w-4 h-4 stroke-[2.5]" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-5 bg-bg/50">
          {!currentSite && location.pathname !== '/sites' ? (
            <div className="m-auto text-center max-w-md bg-white p-8 rounded-[8px] border border-border shadow-sm">
              <Settings2 className="w-12 h-12 text-primary mx-auto mb-4 opacity-80" />
              <h2 className="text-[18px] font-bold text-text-main mb-2">No Site Selected</h2>
              <p className="text-[13px] text-text-muted mb-6 leading-relaxed">
                Please select a site from the top navigation bar to continue. All reports, master rolls, and attendance are tied directly to an active site.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
