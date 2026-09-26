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
  AlertTriangle,
  Sun,
  Moon,
  User,
  Shield,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onOpenAuth }) {
  const { user, role, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'SYSTEM_ADMIN':
        return { label: 'System Admin', bg: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
      case 'MUNICIPAL_OFFICER':
        return { label: 'Municipal Officer', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      case 'CITIZEN':
        return { label: 'Citizen', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
      default:
        return { label: 'Guest', bg: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-800' };
    }
  };

  const badge = getRoleBadge(role);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl transition-colors duration-200">
      {/* National Heat Health Advisory Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white flex items-center justify-center gap-2 shadow-sm">
        <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
        <AlertTriangle className="w-3.5 h-3.5 inline" />
        <span>TAAP CHETNA • NATIONAL HEAT-HEALTH INTELLIGENCE & ACCLIMATIZATION PLATFORM</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-stone-900 dark:text-white font-mono">
                  TAAP <span className="text-orange-600">CHETNA</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE METEO
                </span>
              </div>
              <p className="text-[10px] text-stone-600 dark:text-stone-300 font-medium">Heat-Health Intelligence Platform</p>
            </div>
          </Link>

          {/* Role-Specific Desktop Navigation (STRICT SEPARATION) */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {/* CITIZEN OR GUEST NAVIGATION */}
            {(role === 'CITIZEN' || role === 'GUEST') && (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  Personal Heat Risk
                </NavLink>

                <NavLink
                  to="/travel"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Compass className="w-4 h-4 text-cyan-500" />
                  Travel Transition
                </NavLink>

                <NavLink
                  to="/what-if"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <CalendarClock className="w-4 h-4 text-amber-500" />
                  What-If Activity Planner
                </NavLink>
              </>
            )}

            {/* MUNICIPAL OFFICER EXCLUSIVE NAVIGATION */}
            {role === 'MUNICIPAL_OFFICER' && (
              <NavLink
                to="/authority"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                KMC Municipal Wards & Heatmap
              </NavLink>
            )}

            {/* SYSTEM ADMIN EXCLUSIVE NAVIGATION */}
            {role === 'SYSTEM_ADMIN' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                      : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Settings className="w-4 h-4 text-red-500" />
                Admin Portal & Authority Governance
              </NavLink>
            )}
          </nav>

          {/* Right Section: Theme Toggle & User Account */}
          <div className="flex items-center gap-3">
            {/* Ambient Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Ambient Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Role indicator */}
            <span className={`hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border font-bold ${badge.bg}`}>
              {badge.label}
            </span>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-stone-800 dark:text-slate-100 leading-tight truncate max-w-[150px]">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate max-w-[150px]">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Register
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-3 pb-5 space-y-2">
          {(role === 'CITIZEN' || role === 'GUEST') && (
            <>
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                🌡️ Personal Heat Risk
              </NavLink>
              <NavLink
                to="/travel"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                🧳 Travel Heat-Transition
              </NavLink>
              <NavLink
                to="/what-if"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                ⏱️ What-If Activity Planner
              </NavLink>
            </>
          )}

          {role === 'MUNICIPAL_OFFICER' && (
            <NavLink
              to="/authority"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              🏛️ KMC Municipal Wards & Heatmap
            </NavLink>
          )}

          {role === 'SYSTEM_ADMIN' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              🛡️ Admin Portal & Governance
            </NavLink>
          )}

          <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-stone-500">{user?.name || 'Guest'}</span>
            {!user ? (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
                className="text-xs text-orange-600 font-bold"
              >
                Sign In / Register
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="text-xs text-rose-600 font-bold"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
