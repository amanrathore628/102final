import React from 'react';
import {
  LayoutDashboard,
  FolderSearch,
  Activity,
  Tag,
  Copy,
  MapPin,
  FileText,
  History,
  Database,
  Sliders,
  Inbox,
  ShieldCheck,
  Landmark,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  /** When true, shows a close (X) button at the top for mobile overlay mode */
  isMobile?: boolean;
}

const menuItems = [
  { id: 'command-center',         label: 'Command Center',         icon: LayoutDashboard, route: '/' },
  { id: 'official-mplads',        label: 'Official MPLADS Data',   icon: Landmark,        route: '/official-data' },
  { id: 'works-explorer',         label: 'Works Explorer',         icon: FolderSearch,    route: '/works' },
  { id: 'risk-analysis',          label: 'Risk Analysis',          icon: Activity,        route: '/risk-analysis' },
  { id: 'price-intelligence',     label: 'Price Intelligence',     icon: Tag,             route: '/price-intelligence' },
  { id: 'duplicate-detection',    label: 'Duplicate Detection',    icon: Copy,            route: '/duplicates' },
  { id: 'geographic-intelligence',label: 'Geographic Intelligence',icon: MapPin,          route: '/geo' },
  { id: 'reports',                label: 'Reports',                icon: FileText,        route: '/reports' },
  { id: 'audit-trail',            label: 'Audit Trail',            icon: History,         route: '/audit-trail' },
  { id: 'data-ingestion',         label: 'Data Ingestion',         icon: Database,        route: '/ingestion' },
  { id: 'review-queue',           label: 'Review Queue',           icon: Inbox,           route: '/review-queue' },
  { id: 'settings',               label: 'Settings',               icon: Sliders,         route: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate, isMobile = false }) => {
  return (
    <aside className="w-64 bg-[#0F1B2F] text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/80 bg-[#0b1320]/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border border-blue-400/40 relative overflow-hidden group">
            <ShieldCheck className="w-6 h-6 text-white drop-shadow-md" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-white font-black tracking-wider text-base">NIRIKSHAN</h1>
            </div>
            <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">MPLADS Intelligence</p>
          </div>
        </div>

        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={() => onNavigate(currentRoute)} // triggers parent to close
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Monitoring &amp; Audit</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentRoute === item.route ||
            (item.route !== '/' && currentRoute.startsWith(item.route));

          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.route)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 relative group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-900/60 to-slate-800/80 text-white shadow-md border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#162235]/70'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
              <Icon
                className={`w-4 h-4 transition-colors shrink-0 ${
                  isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0b1320]/40 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-slate-300">5 Engines Live</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-mono border border-blue-500/30">
            SIH26102
          </span>
        </div>
      </div>
    </aside>
  );
};
