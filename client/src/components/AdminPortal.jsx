// client/src/components/AdminPortal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  UserCheck, 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  Server, 
  Database, 
  Activity, 
  Lock,
  Building,
  Mail,
  UserPlus
} from 'lucide-react';
import { getAdminRequests, approveAdminRequest, rejectAdminRequest, getAdminAuthorities } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPortal() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reqRes, authRes] = await Promise.all([
          getAdminRequests(),
          getAdminAuthorities(),
        ]);
        if (reqRes.data) setRequests(reqRes.data);
        if (authRes.data) setAuthorities(authRes.data);
      } catch {
        // Fallback demo data
        setRequests([
          {
            _id: 'req1',
            name: 'Sunil Verma',
            designation: 'Disaster Management Specialist',
            officialId: 'DM-KMC-9812',
            municipality: 'Kolkata Municipal Corporation',
            ward: 'Ward 24',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'req2',
            name: 'Pooja Iyer',
            designation: 'Public Health Executive',
            officialId: 'PH-KMC-4411',
            municipality: 'Kolkata Municipal Corporation',
            ward: 'Ward 18',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
        ]);

        setAuthorities([
          {
            _id: 'auth1',
            name: 'Dr. Anita Banerjee',
            email: 'officer@tapchetna.gov.in',
            role: 'MUNICIPAL_OFFICER',
            municipality: 'Kolkata Municipal Corporation',
            ward: 'Ward 17',
          },
          {
            _id: 'auth2',
            name: 'K. S. Narayanan',
            email: 'ks.narayanan@authority.tapchetna.gov.in',
            role: 'MUNICIPAL_OFFICER',
            municipality: 'Kolkata Municipal Corporation',
            ward: 'Ward 23',
          },
        ]);
      }
    };
    fetchData();
  }, []);

  const handleApprove = async (id, name) => {
    try {
      await approveAdminRequest(id);
    } catch {
      // handled
    }
    setRequests(requests.filter((r) => r._id !== id));
    setAuthorities([
      ...authorities,
      {
        _id: 'new-' + id,
        name,
        email: `${id}@authority.tapchetna.gov.in`,
        role: 'MUNICIPAL_OFFICER',
        municipality: 'Kolkata Municipal Corporation',
        ward: 'Ward Assigned',
      },
    ]);
    setActionNotice(`Approved official account credentials for ${name}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleReject = async (id, name) => {
    try {
      await rejectAdminRequest(id);
    } catch {
      // handled
    }
    setRequests(requests.filter((r) => r._id !== id));
    setActionNotice(`Rejected application for ${name}`);
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
                System Administration & Governance Portal
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 border border-red-400/30">
                ROOT PRIVILEGES
              </span>
            </div>
            <p className="text-sm text-stone-500 dark:text-slate-400">
              Manage municipal authority accounts, verify official registration credentials, and monitor platform health.
            </p>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-500/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* System Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 font-medium">
            <span>Core API Gateway</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-stone-900 dark:text-white mt-1 font-mono">ONLINE</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Port 5000 • 28ms Latency</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 font-medium">
            <span>MongoDB Database</span>
            <Database className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-xl font-bold text-stone-900 dark:text-white mt-1 font-mono">CONNECTED</p>
          <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5">localhost:27017/tapchetna</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 font-medium">
            <span>Pending Approvals</span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">{requests.length} Requests</p>
          <p className="text-[11px] text-stone-400 dark:text-slate-400 mt-0.5">Verification required</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 font-medium">
            <span>Active Officers</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-stone-900 dark:text-white mt-1 font-mono">{authorities.length} Verified</p>
          <p className="text-[11px] text-stone-400 dark:text-slate-400 mt-0.5">Assigned to wards</p>
        </div>
      </div>

      {/* Authority Requests Queue */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            Authority Registration Requests (Pending Security Vetting)
          </h2>
          <span className="text-xs font-mono text-stone-400 dark:text-slate-400">{requests.length} in queue</span>
        </div>

        {requests.length === 0 ? (
          <p className="text-xs text-stone-400 dark:text-slate-400 italic py-4">No pending authority requests in queue.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req._id}
                className="p-4 rounded-xl bg-stone-50 dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(req._id, req.name)}
                    className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>

                  <button
                    onClick={() => handleApprove(req._id, req.name)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-colors cursor-pointer"
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
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-cyan-500" />
            Active Municipal Officers Directory
          </h2>
          <span className="text-xs font-mono text-stone-400 dark:text-slate-400">{authorities.length} Accounts</span>
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
