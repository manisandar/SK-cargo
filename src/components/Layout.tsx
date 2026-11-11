import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useRepository } from '../data';
import { strings } from '../strings';
import {
  LayoutDashboard,
  Boxes,
  PackageSearch,
  Truck,
  Users,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  Shield,
  FileText,
  UserCheck,
  MoreHorizontal,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const repository = useRepository();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleResetSampleData = async () => {
    if (confirm('Reset warehouse database to fresh sample dataset across all pages (4 dates relative to today)?')) {
      try {
        await repository.resetToSampleData();
        localStorage.setItem('sk_sample_data_version', 'v6');
        window.location.reload();
      } catch (err) {
        console.error('Failed to reset sample data:', err);
        alert('Failed to reset data.');
      }
    }
  };

  const adminNavItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: strings.nav.dashboard },
    { to: '/parcels', icon: PackageSearch, label: strings.nav.parcels },
    { to: '/repacking', icon: Boxes, label: strings.nav.repacking },
    { to: '/couriers', icon: Truck, label: strings.nav.couriers },
    { to: '/customers', icon: Users, label: strings.nav.customers },
    { to: '/admin/logs', icon: FileText, label: strings.nav.logs },
    { to: '/admin/staff', icon: UserCheck, label: strings.nav.staff },
  ];

  const staffNavItems = [
    { to: '/parcels', icon: PackageSearch, label: strings.nav.parcels },
    { to: '/repacking', icon: Boxes, label: strings.nav.repacking },
    { to: '/couriers', icon: Truck, label: strings.nav.couriers },
    { to: '/customers', icon: Users, label: strings.nav.customers },
  ];

  const currentNavItems = isAdmin ? adminNavItems : staffNavItems;

  return (
    <div className="h-screen h-[100dvh] flex flex-col lg:flex-row overflow-hidden bg-[#FAF9F6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 w-full transition-colors duration-200">
      {/* ----------------------------------------------------------------- */}
      {/* DESKTOP SIDEBAR NAVIGATION (Visible on lg: screens and wider)       */}
      {/* ----------------------------------------------------------------- */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none z-30">
        {/* Brand & Logo Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/sk-logo.jpg"
              alt="SK Cargo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black tracking-tight leading-none text-slate-900 dark:text-white">
                {strings.app.title}
              </h1>
              <span className="text-[10px] font-bold text-[#ED7D24] bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900">
                {isAdmin ? 'Admin' : 'Staff'}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {isAdmin ? strings.admin.portalTitle : 'Warehouse Operations'}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive: exactActive }) => {
                  const active = exactActive || isActive;
                  return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#1E75BB] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  }`;
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom User Profile & Controls */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* User Info Card */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isAdmin
                    ? 'bg-blue-100 text-[#1E75BB] dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {isAdmin ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {user?.name || 'Staff User'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  @{user?.username || 'user'} • {isAdmin ? 'Admin' : 'Staff'}
                </div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetSampleData}
              title="Reset Demo Data"
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Demo</span>
            </button>

            <button
              onClick={handleLogout}
              title={strings.auth.logoutButton}
              className="py-1.5 px-2.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* MOBILE TOP APP BAR & DRAWER (< lg screens)                         */}
      {/* ----------------------------------------------------------------- */}
      <header className="lg:hidden shrink-0 bg-[#1E75BB] dark:bg-slate-900 text-white px-3.5 py-2.5 z-40 shadow-sm border-b border-blue-400/20 dark:border-slate-800 w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Toggle (Admin only on mobile) */}
          {isAdmin && (
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 -ml-1 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/sk-logo.jpg"
                alt="SK Cargo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight leading-none text-white">
                  {strings.app.title}
                </h1>
                <span className="text-[9px] font-bold text-[#ED7D24] bg-white px-1.5 py-0.2 rounded shadow-2xs">
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
              </div>
              <div className="text-[10px] text-blue-100 font-semibold tracking-wide">
                {user?.name || strings.auth.roleStaff}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-blue-100" />
            )}
          </button>

          <button
            onClick={handleLogout}
            title={strings.auth.logoutButton}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Slide-out Drawer for Mobile (Admin only) */}
      {isAdmin && isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-50 text-slate-800 dark:text-slate-100 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-white p-0.5 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src="/sk-logo.jpg"
                    alt="SK Cargo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    {strings.app.title}
                  </h2>
                  <span className="text-[10px] font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                    {isAdmin ? 'Admin Portal' : 'Staff Operations'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Nav Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {currentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={({ isActive: exactActive }) => {
                      const active = exactActive || isActive;
                      return `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-[#1E75BB] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`;
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{user?.name}</span>
                <span className="font-mono text-[10px] text-slate-400">@{user?.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetSampleData}
                  className="flex-1 py-2 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Demo</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="py-2 px-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MAIN VIEW CONTENT AREA (Full-height scroll container)             */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <main className="flex-1 pb-6 overflow-y-auto w-full overscroll-contain">
          <Outlet />
        </main>

        {/* ----------------------------------------------------------------- */}
        {/* MOBILE BOTTOM NAVIGATION BAR (< lg screens only)                  */}
        {/* ----------------------------------------------------------------- */}
        <nav className="lg:hidden shrink-0 h-[58px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-xl z-40 flex items-center justify-center px-2 no-print transition-colors duration-200">
          <div className="w-full max-w-md mx-auto flex items-center justify-around">
            {isAdmin ? (
              <>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] leading-tight">Dashboard</span>
                </NavLink>

                <NavLink
                  to="/parcels"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <PackageSearch className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] leading-tight">Parcels</span>
                </NavLink>

                <NavLink
                  to="/repacking"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <Boxes className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] leading-tight">Repacking</span>
                </NavLink>

                <NavLink
                  to="/couriers"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <Truck className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] leading-tight">Couriers</span>
                </NavLink>

                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] leading-tight">More</span>
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/parcels"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <PackageSearch className="w-5 h-5 mb-0.5" />
                  <span className="text-[11px] leading-tight">{strings.nav.parcels}</span>
                </NavLink>

                <NavLink
                  to="/repacking"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <Boxes className="w-5 h-5 mb-0.5" />
                  <span className="text-[11px] leading-tight">{strings.nav.repacking}</span>
                </NavLink>

                <NavLink
                  to="/couriers"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <Truck className="w-5 h-5 mb-0.5" />
                  <span className="text-[11px] leading-tight">{strings.nav.couriers}</span>
                </NavLink>

                <NavLink
                  to="/customers"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 rounded-xl min-h-[44px] transition-colors ${
                      isActive
                        ? 'text-[#1E75BB] dark:text-[#2D8AD1] font-bold'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                    }`
                  }
                >
                  <Users className="w-5 h-5 mb-0.5" />
                  <span className="text-[11px] leading-tight">{strings.nav.customers}</span>
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};
