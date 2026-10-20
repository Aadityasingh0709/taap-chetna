// client/src/components/AdminPortal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  UserCheck, 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  Building,
} from 'lucide-react';
import { getAdminRequests, approveAdminRequest, rejectAdminRequest, getAdminAuthorities } from '../services/api';

export default function AdminPortal() {
  const [requests, setRequests] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [actionNotice, setActionNotice] = useState(null);
  const [actionNoticeType, setActionNoticeType] = useState('success');
  const [loadError, setLoadError] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [reqRes, authRes] = await Promise.all([
          getAdminRequests(),
          getAdminAuthorities(),
        ]);
        setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
        setAuthorities(Array.isArray(authRes.data) ? authRes.data : []);
      } catch (err) {
        console.error('Could not load administrator data:', err.message);
        setRequests([]);
        setAuthorities([]);
        setLoadError('Administrator data could not be loaded. Check the connection and try again.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [loadAttempt]);

  const handleApprove = async (id, name) => {
    try {
      await approveAdminRequest(id);
      setRequests((current) => current.filter((request) => request._id !== id));
      try {
        const response = await getAdminAuthorities();
        setAuthorities(Array.isArray(response.data) ? response.data : []);
        setActionNotice(`Approved official account request for ${name}.`);
        setActionNoticeType('success');
      } catch (err) {
        console.error('Approval succeeded, but the officer directory could not be refreshed:', err.message);
        setActionNotice(`Approved ${name}'s request, but the officer directory could not be refreshed.`);
        setActionNoticeType('error');
      }
    } catch (err) {
      console.error(`Could not approve ${name}'s request:`, err.message);
      setActionNotice(`Could not approve ${name}'s request. Please try again.`);
      setActionNoticeType('error');
    }
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleReject = async (id, name) => {
    try {
      await rejectAdminRequest(id);
      setRequests((current) => current.filter((request) => request._id !== id));
      setActionNotice(`Rejected application for ${name}.`);
      setActionNoticeType('success');
    } catch (err) {
      console.error(`Could not reject ${name}'s request:`, err.message);
      setActionNotice(`Could not reject ${name}'s request. Please try again.`);
      setActionNoticeType('error');
    }
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 border border-red-400/30">
            <Settings className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                Administrator Console
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 border border-red-400/30">
                SYSTEM ADMIN
              </span>
            </div>
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Review municipal officer applications and manage verified accounts.
            </p>
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="btn-3d btn-3d-surface px-3 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {actionNotice && (
        <div role={actionNoticeType === 'error' ? 'alert' : 'status'} className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          actionNoticeType === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-500/70 text-emerald-800 dark:text-emerald-300'
        }`}>
          {actionNoticeType === 'error'
            ? <XCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{actionNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel card-3d p-4 rounded-2xl stagger-3 animate-fadeIn">
          <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 font-medium">
            <span>Pending Approvals</span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {loadingData || loadError ? '—' : `${requests.length} Requests`}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-slate-400 mt-0.5">Verification required</p>
        </div>

        <div className="glass-panel card-3d p-4 rounded-2xl stagger-4 animate-fadeIn">
          <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 font-medium">
            <span>Active Officers</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-stone-900 dark:text-white mt-1 font-mono">
            {loadingData || loadError ? '—' : `${authorities.length} Verified`}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-slate-400 mt-0.5">Assigned to wards</p>
        </div>
      </div>

      {/* Authority Requests Queue */}
      <div className="glass-panel card-3d p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            Authority Registration Requests (Pending Security Vetting)
          </h2>
          <span className="text-xs font-mono text-stone-400 dark:text-slate-400">
            {loadingData || loadError ? '—' : `${requests.length} in queue`}
          </span>
        </div>

        {loadingData ? (
          <p role="status" className="py-4 text-sm text-stone-500 dark:text-slate-400">Loading authority requests…</p>
        ) : loadError ? (
          <p className="py-4 text-sm text-stone-500 dark:text-slate-400">Request data is unavailable until the connection is restored.</p>
        ) : requests.length === 0 ? (
          <p className="py-4 text-sm text-stone-500 dark:text-slate-400">No pending authority requests.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req._id}
                className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-3d"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">{req.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-400/30">
                      ID: {req.officialId}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    {req.designation} • {req.municipality} ({req.ward})
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleReject(req._id, req.name)}
                    className="btn-3d btn-3d-danger px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>

                  <button
                    onClick={() => handleApprove(req._id, req.name)}
                    className="btn-3d btn-3d-emerald px-4 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve & Issue Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Authority Directory */}
      <div className="glass-panel card-3d p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-cyan-500" />
            Active Municipal Officers Directory
          </h2>
          <span className="text-xs font-mono text-stone-400 dark:text-slate-400">
            {loadingData || loadError ? '—' : `${authorities.length} Accounts`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 dark:bg-slate-900/80 text-stone-500 dark:text-slate-400 border-b border-stone-200 dark:border-slate-800 uppercase font-mono">
              <tr>
                <th className="p-3">Official Name</th>
                <th className="p-3">Gov Email / ID</th>
                <th className="p-3">Municipality</th>
                <th className="p-3">Jurisdiction Ward</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60 dark:divide-slate-800/60">
              {!loadingData && !loadError && authorities.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-sm text-stone-500 dark:text-slate-400">
                    No active municipal officer accounts.
                  </td>
                </tr>
              )}
              {loadingData && (
                <tr>
                  <td colSpan="5" role="status" className="py-6 text-center text-sm text-stone-500 dark:text-slate-400">
                    Loading officer directory…
                  </td>
                </tr>
              )}
              {authorities.map((auth) => (
                <tr key={auth._id} className="hover:bg-stone-50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-stone-900 dark:text-white">{auth.name}</td>
                  <td className="p-3 font-mono text-stone-600 dark:text-slate-300">{auth.email}</td>
                  <td className="p-3 text-stone-600 dark:text-slate-300">{auth.municipality}</td>
                  <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{auth.ward}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] border border-emerald-400/30">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
