/**
 * Sidebar Component - Application Left Navigation
 */

import React from 'react';
import {
  LayoutDashboard,
  SearchCheck,
  FileText,
  History,
  User as UserIcon,
  Award,
  PlusCircle,
  LogOut,
  ShieldCheck,
  Globe,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageRoute } from '../../types';

interface SidebarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  mobileOpen,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();

  const navItems: { label: string; route: PageRoute; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Dashboard', route: 'dashboard', icon: LayoutDashboard },
    { label: 'Plagiarism Checker', route: 'checker', icon: SearchCheck },
    { label: 'Reports', route: 'reports', icon: FileText },
    { label: 'History', route: 'history', icon: History },
    { label: 'Academic Profile', route: 'profile', icon: UserIcon },
    { label: 'Subscription / Plan', route: 'subscription', icon: Award }
  ];

  const handleNav = (route: PageRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const handleLogout = () => {
    logout();
    onNavigate('home');
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-slate-200">
      {/* Top Header & Brand */}
      <div>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight font-sans">
                PLAGICHECK
              </span>
              <span className="text-[10px] text-slate-700 font-semibold tracking-wide uppercase">
                Academic Edition
              </span>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            type="button"
            onClick={() => handleNav('checker')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Plagiarism Check</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-700'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile and Settings */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        {/* Public Site Link */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors mb-3"
        >
          <Globe className="w-3.5 h-3.5 text-slate-700" />
          <span>View Public Website</span>
        </button>

        {/* User Card */}
        {user ? (
          <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
            <div
              onClick={() => handleNav('profile')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                {(user.name && user.name !== 'Dr. Alex Morgan' && user.name !== 'Elena Rostova'
                  ? user.name
                  : 'User').charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user.name && user.name !== 'Dr. Alex Morgan' && user.name !== 'Elena Rostova'
                    ? user.name
                    : 'My Account'}
                </p>
                <p className="text-[11px] text-slate-700 truncate">
                  {user.role && user.name !== 'Dr. Alex Morgan' && user.name !== 'Elena Rostova'
                    ? user.role
                    : 'Academic Member'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleNav('login')}
            className="w-full py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
