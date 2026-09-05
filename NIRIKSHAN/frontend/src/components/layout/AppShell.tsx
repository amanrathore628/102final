import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '../common/Toast';
import { UserRole } from '../../types';

interface AppShellProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  currentRole,
  onRoleChange,
  children,
}) => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar — always visible on lg+ */}
      <div className="hidden lg:flex">
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(route) => {
            onNavigate(route);
            setMobileSidebarOpen(false);
          }}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm backdrop-enter lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 sidebar-enter lg:hidden">
            <Sidebar
              currentRoute={currentRoute}
              onNavigate={(route) => {
                onNavigate(route);
                setMobileSidebarOpen(false);
              }}
              isMobile
            />
          </div>
        </>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          currentRoute={currentRoute}
          currentRole={currentRole}
          onRoleChange={onRoleChange}
          onSearch={(q) => onNavigate(`/works?search=${encodeURIComponent(q)}`)}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};
