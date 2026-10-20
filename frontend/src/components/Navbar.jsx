// client/src/components/Navbar.jsx
import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  UserCheck,
  Compass,
  CalendarClock,
  ShieldAlert,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useShakti } from '../context/ShaktiContext';

export default function Navbar({ onOpenAuth }) {
  const { user, role, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { openShakti } = useShakti();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'SYSTEM_ADMIN':
        return {
          label: 'Admin',
          cls: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-300/50 dark:border-red-800/50',
        };
      case 'MUNICIPAL_OFFICER':
        return {
          label: 'Officer',
          cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300/50 dark:border-amber-800/50',
        };
      case 'CITIZEN':
        return {
          label: 'Citizen',
          cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300/50 dark:border-emerald-800/50',
        };
      default:
        return {
          label: 'Guest',
          cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300/40 dark:border-slate-700/40',
        };
    }
  };

  const badge = getRoleBadge(role);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-3">

          {/* ── Brand Logo ──────────────────────────────── */}
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: '#c6531b',
              }}
            >
              <Flame className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  TAAP <span className="text-orange-500">CHETNA</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                Heat-Health Intelligence Platform
              </p>
            </div>
          </Link>

          {/* ── Desktop Navigation ──────────────────────── */}
          <nav aria-label="Main navigation" className="hidden xl:flex items-center gap-1.5">
            {(role === 'CITIZEN' || role === 'GUEST') && (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-400/30 border-b-2 border-b-orange-500 shadow-[0_2px_0_#9a3412] translate-y-px'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:-translate-y-px'
                    }`
                  }
                >
                  <UserCheck className="w-3.5 h-3.5 text-orange-500" />
                  Personal Heat Risk
                </NavLink>

                <NavLink
                  to="/travel"
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30 border-b-2 border-b-cyan-500 shadow-[0_2px_0_#155e75] translate-y-px'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:-translate-y-px'
                    }`
                  }
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-500" />
                  Travel Transition
                </NavLink>

                <NavLink
                  to="/what-if"
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/30 border-b-2 border-b-amber-500 shadow-[0_2px_0_#78350f] translate-y-px'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:-translate-y-px'
                    }`
                  }
                >
                  <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                  What-If Planner
                </NavLink>

                <button
                  type="button"
                  onClick={openShakti}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-400/30 hover:-translate-y-px"
                  title="Ask Shakti AI Citizen Heat Assistant"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Shakti AI</span>
                  <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-orange-500/20 text-orange-600 dark:text-orange-300">
                    Preview
                  </span>
                </button>
              </>
            )}

            {role === 'MUNICIPAL_OFFICER' && (
              <NavLink
                to="/authority"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/30 border-b-2 border-b-amber-600 shadow-[0_2px_0_#78350f] translate-y-px'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:-translate-y-px'
                  }`
                }
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                KMC Wards &amp; Heatmap
              </NavLink>
            )}

            {role === 'SYSTEM_ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                    isActive
                      ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-400/30 border-b-2 border-b-red-600 shadow-[0_2px_0_#7f1d1d] translate-y-px'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:-translate-y-px'
                  }`
                }
              >
                <Settings className="w-3.5 h-3.5 text-red-500" />
                Admin Portal
              </NavLink>
            )}
          </nav>

          {/* ── Right Side Controls ──────────────────────── */}
          <div className="flex items-center gap-2.5">

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-3d btn-3d-surface p-2.5 rounded-xl cursor-pointer"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-slate-600" />
              }
            </button>

            {/* Role Badge */}
            <span className={`hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-full border font-bold ${badge.cls}`}>
              {badge.label}
            </span>

            {/* User area */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[140px]">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-3d btn-3d-surface p-2.5 rounded-xl text-slate-500 hover:text-rose-600 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="btn-3d btn-3d-orange px-4 py-2.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden btn-3d btn-3d-surface p-2.5 rounded-xl cursor-pointer"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen
                ? <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                : <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 pt-4 pb-6 space-y-1.5"
          style={{ animation: 'fadeIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards' }}
        >
          {(role === 'CITIZEN' || role === 'GUEST') && (
            <>
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-150"
              >
                <span className="w-7 h-7 rounded-lg bg-orange-500/12 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5 text-orange-500" />
                </span>
                Personal Heat Risk
              </NavLink>
              <NavLink
                to="/travel"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-150"
              >
                <span className="w-7 h-7 rounded-lg bg-cyan-500/12 flex items-center justify-center">
                  <Compass className="w-3.5 h-3.5 text-cyan-500" />
                </span>
                Travel Transition
              </NavLink>
              <NavLink
                to="/what-if"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-150"
              >
                <span className="w-7 h-7 rounded-lg bg-amber-500/12 flex items-center justify-center">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                </span>
                What-If Planner
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openShakti();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-orange-700 dark:text-orange-300 bg-orange-50/70 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-300/60 dark:border-orange-800/60 transition-all duration-150 cursor-pointer"
              >
                <span className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-500" />
                </span>
                <span className="flex-1 text-left font-bold">Shakti Heat Assistant</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-300">
                  Preview
                </span>
              </button>
            </>
          )}

          {role === 'MUNICIPAL_OFFICER' && (
            <NavLink
              to="/authority"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-150"
            >
              <span className="w-7 h-7 rounded-lg bg-amber-500/12 flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              </span>
              KMC Municipal Wards
            </NavLink>
          )}

          {role === 'SYSTEM_ADMIN' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
            >
              <span className="w-7 h-7 rounded-lg bg-red-500/12 flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-red-500" />
              </span>
              Admin Portal
            </NavLink>
          )}

          {/* Divider + user actions */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-[10px] font-black">
                {user ? user.name[0].toUpperCase() : 'G'}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {user?.name || 'Guest'}
              </span>
            </div>
            {!user ? (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
                className="btn-3d btn-3d-orange px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                Sign In
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="btn-3d btn-3d-danger px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
