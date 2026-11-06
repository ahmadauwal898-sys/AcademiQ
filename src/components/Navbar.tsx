import React, { useState, useEffect } from 'react';
import { User, SchoolNotification } from '../types';
import { apiRequest } from '../api';
import {
  School,
  ShieldCheck,
  UserCheck,
  LogOut,
  ArrowRightLeft,
  Sparkles,
  Building2,
  CheckCircle2,
  Home,
  Globe,
  Menu,
  X,
  Info,
  Bell,
  Check,
  Megaphone,
  Clock
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenPublicChecker: () => void;
  onOpenRegister: () => void;
  onOpenLogin: (portalType?: 'school' | 'super_admin') => void;
  onSwitchPersona?: (role: string, email?: string) => void;
  onGoHome?: () => void;
  onViewPublicLanding?: () => void;
  onExitImpersonation?: () => void;
  onOpenAbout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenPublicChecker,
  onOpenRegister,
  onOpenLogin,
  onSwitchPersona,
  onGoHome,
  onViewPublicLanding,
  onExitImpersonation,
  onOpenAbout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await apiRequest('/api/notifications');
      setNotifications(res.notifications || []);
    } catch {
      // Ignore background notification fetch errors
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner - Context-Specific Governance / Tenant Isolation */}
      <div className={`text-white text-xs px-3 sm:px-4 py-1.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 transition ${
        user?.is_impersonating
          ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/50'
          : user?.role === 'super_admin'
          ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-900/40'
          : user
          ? 'bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40'
          : 'bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              user?.is_impersonating || user?.role === 'super_admin' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              user?.is_impersonating || user?.role === 'super_admin' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></span>
          </span>

          {user?.is_impersonating ? (
            <span className="font-semibold tracking-wide text-amber-200 flex items-center gap-1.5 truncate">
              <span className="shrink-0">👑 Impersonation:</span>
              <span className="text-white font-bold truncate">{user.school_name}</span>
            </span>
          ) : user?.role === 'super_admin' ? (
            <span className="font-semibold tracking-wide text-amber-200 truncate">
              Platform Super Admin Mode: <span className="text-white">Full Oversight</span>
            </span>
          ) : user ? (
            <span className="font-semibold tracking-wide text-slate-200 truncate">
              School: <span className="text-blue-300 font-bold">{user.school_name || 'My Institution'}</span>
            </span>
          ) : (
            <span className="font-semibold tracking-wide text-slate-200 truncate">
              Multi-Tenant Architecture: <span className="text-emerald-400">Isolated Sessions</span>
            </span>
          )}
        </div>

        {/* Action Controls depending on Session */}
        <div className="flex items-center gap-2 self-end sm:self-auto py-0.5 shrink-0">
          {user?.is_impersonating ? (
            <div className="flex items-center gap-2">
              {onExitImpersonation && (
                <button
                  onClick={onExitImpersonation}
                  className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold rounded-md transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Exit Impersonation</span>
                </button>
              )}
            </div>
          ) : user?.role === 'super_admin' ? (
            <div className="flex items-center gap-2 text-[11px] text-amber-300">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 font-semibold text-[10px]">
                Super Admin
              </span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-semibold capitalize text-[10px]">
                {user.role.replace('_', ' ')}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-300 transition text-[11px] underline cursor-pointer"
                title="Sign out of current school"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenLogin('school')}
              className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Building2 className="w-3 h-3" /> School Login
            </button>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <button
            onClick={() => {
              closeMenu();
              onGoHome?.();
            }}
            className="flex items-center gap-2.5 text-left hover:opacity-90 transition cursor-pointer group shrink-0"
            title="Click to go back to Home / Dashboard"
          >
            <img
              src="/academiq-icon.png"
              alt="AcademiQ Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain shadow-md shadow-blue-500/20 group-hover:scale-105 transition bg-white p-0.5 border border-slate-200"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">Academi<span className="text-blue-600">Q</span></span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Hub</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">School Management & Result Platform</p>
            </div>
          </button>

          {/* Desktop Navigation Items (Hidden on screens < md) */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* School Tenant Badge */}
                {user.school_id ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 block truncate max-w-[140px] lg:max-w-[180px]">{user.school_name || 'My School'}</span>
                      <span className={`text-[10px] font-medium uppercase ${
                        user.school_status === 'approved' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {user.school_status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Platform Super Admin
                  </div>
                )}

                {/* User Info */}
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{user.full_name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{user.role.replace('_', ' ')}</div>
                </div>

                {/* Home / Dashboard Button */}
                <button
                  onClick={onGoHome}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Go to main Dashboard"
                >
                  <Home className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dashboard</span>
                </button>

                {/* View Public Website Button */}
                {onViewPublicLanding && (
                  <button
                    onClick={onViewPublicLanding}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="View public school website and onboarding page"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Public Site</span>
                  </button>
                )}

                {/* Public Result Checker quick access */}
                <button
                  onClick={onOpenPublicChecker}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Verify PIN</span>
                </button>

                {/* About Page Button */}
                {onOpenAbout && (
                  <button
                    onClick={onOpenAbout}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="About AcademiQ & Founder Message"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>About</span>
                  </button>
                )}

                {/* Notification Bell Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer relative"
                    title="Announcements & Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Download App Button */}
                <PWAInstallButton variant="navbar" />

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Public notification bell */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer relative"
                    title="Platform Announcements"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={onOpenPublicChecker}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Check Result
                </button>

                {/* About Page Button */}
                {onOpenAbout && (
                  <button
                    onClick={onOpenAbout}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
                    title="About AcademiQ & Founder Message"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>About</span>
                  </button>
                )}

                <PWAInstallButton variant="navbar" />

                <button
                  onClick={() => onOpenLogin('school')}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  School Login
                </button>
                <button
                  onClick={() => onOpenLogin('super_admin')}
                  className="px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Platform Super Admin Portal"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Super Admin
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Register School
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Controls (< md) */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Mobile Notification Bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition relative cursor-pointer"
              title="Announcements & Notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <PWAInstallButton variant="navbar" className="text-[11px] px-2 py-1" />

            <button
              onClick={onOpenPublicChecker}
              className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1"
              title="Verify Result PIN"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>PIN</span>
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-slate-50 px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top duration-200">
          {/* In-App Mobile Install Option */}
          <PWAInstallButton variant="drawer" />

          {user ? (
            <div className="space-y-3">
              {/* User / School Header Card */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.full_name}</div>
                  <div className="text-[11px] text-slate-500 capitalize">{user.role.replace('_', ' ')}</div>
                  {user.school_name && (
                    <div className="text-[11px] text-blue-600 font-medium truncate max-w-[200px]">
                      {user.school_name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    closeMenu();
                    onLogout();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    closeMenu();
                    onGoHome?.();
                  }}
                  className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition"
                >
                  <Home className="w-4 h-4 text-blue-600" />
                  <span>Dashboard</span>
                </button>

                {onViewPublicLanding && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onViewPublicLanding();
                    }}
                    className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition"
                  >
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Public Site</span>
                  </button>
                )}
                {onOpenAbout && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenAbout();
                    }}
                    className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition"
                  >
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>About AcademiQ</span>
                  </button>
                )}
              </div>

              {user.is_impersonating && onExitImpersonation && (
                <button
                  onClick={() => {
                    closeMenu();
                    onExitImpersonation();
                  }}
                  className="w-full py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Exit Super Admin Impersonation</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => {
                  closeMenu();
                  onOpenLogin('school');
                }}
                className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>School Staff & Admin Login</span>
              </button>

              <button
                onClick={() => {
                  closeMenu();
                  onOpenRegister();
                }}
                className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                <School className="w-4 h-4" />
                <span>Register New School</span>
              </button>

              <button
                onClick={() => {
                  closeMenu();
                  onOpenLogin('super_admin');
                }}
                className="w-full p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Platform Super Admin Portal</span>
              </button>

              <button
                onClick={() => {
                  closeMenu();
                  onOpenPublicChecker();
                }}
                className="w-full p-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Check Student Result / Verify PIN</span>
              </button>

              {onOpenAbout && (
                <button
                  onClick={() => {
                    closeMenu();
                    onOpenAbout();
                  }}
                  className="w-full p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>About AcademiQ & Founder Message</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS & ANNOUNCEMENTS DROPDOWN / DRAWER */}
      {showNotifications && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNotifications(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-end p-3 sm:p-6"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 mt-12 sm:mt-8">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/30 text-indigo-300 flex items-center justify-center border border-indigo-400/40">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Announcements & Notices</h3>
                  <p className="text-[11px] text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} unread announcement${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-indigo-300 hover:text-white underline font-medium cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 p-2">
              {loadingNotifications ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading announcements...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">No announcements yet</p>
                  <p className="text-[11px] text-slate-400">You're completely up to date with all platform and school notices.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`p-3.5 rounded-2xl transition cursor-pointer space-y-1.5 ${
                      n.is_read ? 'bg-white hover:bg-slate-50 opacity-80' : 'bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          n.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                          n.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {n.priority}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-50 text-indigo-700 uppercase">
                          {n.category}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{n.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{n.message}</p>

                    <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                      <span>Sender: {n.sender_name || 'Admin'}</span>
                      {!n.is_read && (
                        <span className="text-indigo-600 font-bold hover:underline">Mark as read</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">Official AcademiQ Notice System</span>
              <button
                onClick={() => setShowNotifications(false)}
                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

