import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, ChevronDown, Check, Shield, Building2, Landmark, UserCheck, Menu } from 'lucide-react';
import { UserRole } from '../../types';

interface TopBarProps {
  currentRoute: string;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSearch?: (query: string) => void;
  /** Called when hamburger button is clicked (mobile) */
  onMenuClick?: () => void;
}

const ROLES: UserRole[] = ['District Officer', 'Ministry Officer', 'State Officer', 'MP', 'Administrator'];

function getRoleIcon(role: UserRole): React.FC<any> {
  switch (role) {
    case 'Administrator':   return Shield;
    case 'Ministry Officer': return Landmark;
    case 'State Officer':    return Building2;
    case 'District Officer': return UserCheck;
    default:                 return User;
  }
}

function getBreadcrumbs(route: string): string[] {
  if (route === '/')                     return ['Home', 'Command Center'];
  if (route === '/official-data')         return ['Home', 'Official MPLADS Data'];
  if (route === '/works')                return ['Home', 'Works Explorer'];
  if (route.startsWith('/works/'))       return ['Works Explorer', 'Investigation'];
  if (route === '/risk-analysis')        return ['Home', 'Risk Analysis'];
  if (route === '/price-intelligence')   return ['Home', 'Price Intelligence'];
  if (route === '/duplicates')           return ['Home', 'Duplicate Detection'];
  if (route === '/geo')                  return ['Home', 'Geographic Intelligence'];
  if (route === '/reports')              return ['Home', 'Reports'];
  if (route === '/audit-trail')          return ['Home', 'Audit Trail'];
  if (route === '/ingestion')            return ['Home', 'Data Ingestion'];
  if (route === '/review-queue')         return ['Home', 'Review Queue'];
  if (route === '/settings')             return ['Home', 'Settings'];
  return ['Home', 'Dashboard'];
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRoute,
  currentRole,
  onRoleChange,
  onSearch,
  onMenuClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── B5: Close role dropdown on outside click ──────────────────────────────
  useEffect(() => {
    if (!isRoleDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isRoleDropdownOpen]);

  const RoleIcon = getRoleIcon(currentRole);
  const breadcrumbs = getBreadcrumbs(currentRoute);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm gap-3">
      {/* Left: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          aria-label="Open navigation"
          id="topbar-menu-btn"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium min-w-0">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300 shrink-0">/</span>}
              <span
                className={`truncate ${
                  idx === breadcrumbs.length - 1
                    ? 'text-slate-800 font-bold'
                    : 'text-slate-400 hidden sm:inline'
                }`}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Search + Bell + Role Switcher */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="topbar-search"
            type="text"
            placeholder="Search by ID, Vendor, District…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-inner"
          />
        </form>

        {/* Notification Bell */}
        <button
          id="topbar-notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
          aria-label="Notifications"
          onClick={() => { window.location.href = '/review-queue'; }}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-white" />
        </button>

        {/* Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="topbar-role-switcher"
            onClick={() => setIsRoleDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-xs text-slate-700 font-medium transition shadow-sm"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <RoleIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-[11px] font-bold text-slate-900 whitespace-nowrap">{currentRole}</div>
              <div className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider">Local prototype</div>
            </div>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-3.5 py-1.5 border-b border-slate-100 mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Switch Prototype Role
                </span>
              </div>
              {ROLES.map((role) => {
                const ItemIcon = getRoleIcon(role);
                return (
                  <button
                    key={role}
                    id={`role-option-${role.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      onRoleChange(role);
                      setIsRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                      currentRole === role ? 'font-bold text-blue-600 bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{role}</span>
                    </div>
                    {currentRole === role && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
