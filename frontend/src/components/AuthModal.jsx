import React, { useState } from 'react';
import { X, Flame, LogIn, UserPlus, Shield, User, Building, MapPin, Briefcase, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EXPANDED_OCCUPATIONS } from '../data/indianPlaces';
import PlaceSearchInput from './PlaceSearchInput';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, quickOfficerLogin, quickAdminLogin } = useAuth();
  const [tab, setTab] = useState('register'); // Default to register tab so user can create their account immediately!
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Citizen registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [homeLocation, setHomeLocation] = useState('Kolkata, West Bengal');
  const [ageBand, setAgeBand] = useState('26-40');
  const [occupation, setOccupation] = useState(EXPANDED_OCCUPATIONS[0].label);
  const [customOccupation, setCustomOccupation] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(loginEmail, loginPassword);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.message || 'Login failed. Please check credentials.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const finalOccupation = occupation === 'other_custom'
      ? (customOccupation.trim() || 'Custom Profession')
      : occupation;

    const citizenData = {
      name: regName,
      email: regEmail,
      password: regPassword,
      role: 'CITIZEN',
      homeLocation: homeLocation.trim() || 'Kolkata, West Bengal',
      ageBand,
      occupation: finalOccupation,
    };

    const res = await register(citizenData);
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Account registered successfully in database!');
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      setError(res.message || 'Registration failed. Check server/database connection.');
    }
  };

  const handleFastOfficer = async () => {
    setLoading(true);
    const res = await quickOfficerLogin();
    setLoading(false);
    if (res.success) onClose();
    else setError('Officer login failed.');
  };

  const handleFastAdmin = async () => {
    setLoading(true);
    const res = await quickAdminLogin();
    setLoading(false);
    if (res.success) onClose();
    else setError('Admin login failed.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900 dark:text-white font-mono tracking-tight">
              TAAP <span className="text-orange-600">CHETNA</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
              National Heat-Health Intelligence Access
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-800 mb-5 text-xs font-bold">
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${
              tab === 'register'
                ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
            }`}
          >
            Create New Citizen Account
          </button>
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${
              tab === 'login'
                ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
            }`}
          >
            Sign In with Email
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs mb-4">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs mb-4">
            {successMsg}
          </div>
        )}

        {/* CITIZEN REGISTRATION FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 font-bold mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Subir Ghosh"
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 dark:text-slate-300 font-bold mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="subir@example.com"
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 font-bold mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Location with GPS Auto-Detection & OSM Search */}
            <div>
              <PlaceSearchInput
                value={homeLocation}
                onChange={(val) => setHomeLocation(val)}
                label="Home City, Town or Village"
                placeholder="Search any Indian place or click Auto GPS..."
                badgeText="GPS Enabled"
                allowGPS={true}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-600" /> Age Demographic
                </label>
                <select
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:border-orange-500"
                >
                  <option value="0-12">Child (0-12)</option>
                  <option value="13-25">Youth (13-25)</option>
                  <option value="26-40">Adult (26-40)</option>
                  <option value="40-60">Middle-Aged (40-60)</option>
                  <option value="65+">Senior Citizen (65+)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Daily Work Environment
                </label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold text-xs cursor-pointer focus:outline-none focus:border-orange-500"
                >
                  {EXPANDED_OCCUPATIONS.map((occ) => (
                    <option key={occ.id} value={occ.id === 'other_custom' ? 'other_custom' : occ.label}>
                      [{occ.category}] {occ.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom write-in if other_custom selected */}
            {occupation === 'other_custom' && (
              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1">
                  Specify Your Occupation / Daily Outdoor Task:
                </label>
                <input
                  type="text"
                  value={customOccupation}
                  onChange={(e) => setCustomOccupation(e.target.value)}
                  placeholder="e.g. Masonry plastering in open sun, tea stall vendor..."
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-orange-400 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-semibold"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-orange w-full py-3 text-xs font-black tracking-wide flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Your Account in Database...' : 'Register Citizen Account'}
            </button>
          </form>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-stone-700 dark:text-slate-300 font-bold mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-slate-300 font-bold mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d btn-3d-orange w-full py-3 text-xs font-black tracking-wide flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Fast Authority Access for Municipal Officer & Admin */}
        <div className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800">
          <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Authority & Admin Quick Sign-In (Pre-Seeded):
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleFastOfficer}
              disabled={loading}
              className="btn-3d btn-3d-amber p-2.5 text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Building className="w-3.5 h-3.5" />
              Officer (Dr. Anita - KMC)
            </button>

            <button
              type="button"
              onClick={handleFastAdmin}
              disabled={loading}
              className="btn-3d btn-3d-danger p-2.5 text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              System Admin (Root)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
