// client/src/components/MunicipalDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Droplet, 
  AlertTriangle, 
  Users, 
  Trees, 
  Send, 
  CheckCircle, 
  Building2, 
  Radio, 
  Truck, 
  Home, 
  Wind,
  PlusCircle,
  X,
  Layers,
  BellRing,
  RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { getAuthorityAlerts, createAuthorityAlert, getAuthorityWards, getAuthorityDashboard } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HeatHealthBurdenPanel from './HeatHealthBurdenPanel';

// Default ward geographic metadata (fallback if server is offline or DB empty)
const DEFAULT_KMC_WARDS = [
  { 
    wardNumber: 'Ward 17', 
    name: 'Shyambazar / Hatibagan Market', 
    lat: 22.6001, 
    lng: 88.3712, 
    riskLevel: 'EXTREME', 
    heatIndex: 51, 
    temp: 42,
    popDensity: '42,000 / km²', 
    elderly: '18%', 
    treeCanopy: '4.2% (Severe Deficit)', 
    waterKiosks: 3, 
    coolingCenters: 1, 
    activeTankers: 2,
    interventionsNeeded: ['Dispatch Water Tankers', 'Enforce Vending Shade Tarpaulins', 'Open Night Shelter AC'] 
  },
  { 
    wardNumber: 'Ward 18', 
    name: 'Burtolla Slum Cluster', 
    lat: 22.5925, 
    lng: 88.3685, 
    riskLevel: 'HIGH', 
    heatIndex: 47, 
    temp: 40,
    popDensity: '48,000 / km²', 
    elderly: '14%', 
    treeCanopy: '6.1%', 
    waterKiosks: 4, 
    coolingCenters: 1, 
    activeTankers: 1,
    interventionsNeeded: ['Deploy Mobile ORS Van', 'Misting Fans at Bus Terminals'] 
  },
  { 
    wardNumber: 'Ward 19', 
    name: 'Sovabazar Ghat & Wharfs', 
    lat: 22.5975, 
    lng: 88.3585, 
    riskLevel: 'MODERATE', 
    heatIndex: 41, 
    temp: 38,
    popDensity: '28,000 / km²', 
    elderly: '12%', 
    treeCanopy: '14.5%', 
    waterKiosks: 6, 
    coolingCenters: 2, 
    activeTankers: 0,
    interventionsNeeded: ['Continuous Riverfront Drinking Water Inspection'] 
  },
  { 
    wardNumber: 'Ward 20', 
    name: 'Bagbazar Residential', 
    lat: 22.6035, 
    lng: 88.3650, 
    riskLevel: 'LOW', 
    heatIndex: 37, 
    temp: 36,
    popDensity: '19,000 / km²', 
    elderly: '15%', 
    treeCanopy: '22.8% (Green Buffer)', 
    waterKiosks: 8, 
    coolingCenters: 2, 
    activeTankers: 0,
    interventionsNeeded: ['Surveillance Only'] 
  },
  { 
    wardNumber: 'Ward 21', 
    name: 'Jorasanko Commercial Hub', 
    lat: 22.5855, 
    lng: 88.3600, 
    riskLevel: 'HIGH', 
    heatIndex: 46, 
    temp: 41,
    popDensity: '39,000 / km²', 
    elderly: '16%', 
    treeCanopy: '3.8%', 
    waterKiosks: 4, 
    coolingCenters: 1, 
    activeTankers: 1,
    interventionsNeeded: ['Water Tanker Deployment', 'Temporary Misting Canopy'] 
  },
  { 
    wardNumber: 'Ward 22', 
    name: 'Posta Wholesale Godowns', 
    lat: 22.5840, 
    lng: 88.3530, 
    riskLevel: 'MODERATE', 
    heatIndex: 42, 
    temp: 39,
    popDensity: '25,000 / km²', 
    elderly: '9%', 
    treeCanopy: '5.2%', 
    waterKiosks: 5, 
    coolingCenters: 1, 
    activeTankers: 0,
    interventionsNeeded: ['Provide Hydration Stations for Cart Pullers'] 
  },
  { 
    wardNumber: 'Ward 23', 
    name: 'Barabazar Trade Corridor', 
    lat: 22.5800, 
    lng: 88.3550, 
    riskLevel: 'EXTREME', 
    heatIndex: 52, 
    temp: 43,
    popDensity: '55,000 / km²', 
    elderly: '21%', 
    treeCanopy: '2.1% (Severe Urban Heat Island)', 
    waterKiosks: 2, 
    coolingCenters: 0, 
    activeTankers: 3,
    interventionsNeeded: ['Urgent Portable Water Distribution', 'Mandatory 12-3 PM Street Work Halt'] 
  },
  { 
    wardNumber: 'Ward 24', 
    name: 'Kolutola / College St.', 
    lat: 22.5740, 
    lng: 88.3620, 
    riskLevel: 'HIGH', 
    heatIndex: 45, 
    temp: 40,
    popDensity: '34,000 / km²', 
    elderly: '17%', 
    treeCanopy: '9.4%', 
    waterKiosks: 5, 
    coolingCenters: 2, 
    activeTankers: 1,
    interventionsNeeded: ['Distribute ORS at University & Book Market Gates'] 
  },
];

// Helper to pan map on ward selection
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 14, { duration: 1.2 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function MunicipalDashboard() {
  const { user } = useAuth();
  const [wards, setWards] = useState(DEFAULT_KMC_WARDS);
  const [selectedWard, setSelectedWard] = useState(DEFAULT_KMC_WARDS[0]);
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showNewAlertModal, setShowNewAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    ward: 'Ward 17',
    riskLevel: 'EXTREME',
    message: '',
    actions: 'Water tanker dispatch, Cooling center activation',
  });
  const [actionNotification, setActionNotification] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);

  const municipalityName = user?.municipality || 'Kolkata Municipal Corporation (KMC)';
  const officerName = user?.name || 'Dr. Anita Banerjee';
  const assignedWard = user?.ward || 'Ward 17';

  // Load wards and alerts from API
  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const [wardsRes, alertsRes] = await Promise.allSettled([
        getAuthorityWards(),
        getAuthorityAlerts(),
      ]);

      if (wardsRes.status === 'fulfilled' && wardsRes.value.data && wardsRes.value.data.length > 0) {
        // Enrich DB wards with geographic mapping from defaults if coordinates are missing
        const serverWards = wardsRes.value.data.map((sw, idx) => {
          const match = DEFAULT_KMC_WARDS.find((dw) => dw.wardNumber === sw.wardNumber) || DEFAULT_KMC_WARDS[idx % DEFAULT_KMC_WARDS.length];
          return {
            ...match,
            ...sw,
            lat: sw.lat || match.lat,
            lng: sw.lng || match.lng,
            heatIndex: sw.heatIndex || match.heatIndex,
            riskLevel: sw.riskLevel || match.riskLevel,
            name: sw.name || match.name,
            popDensity: sw.populationExposure ? `${sw.populationExposure} Exposure Density` : match.popDensity,
            interventionsNeeded: match.interventionsNeeded,
          };
        });
        setWards(serverWards);
        setSelectedWard((prev) => serverWards.find((w) => w.wardNumber === prev.wardNumber) || serverWards[0]);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value.data)) {
        setAlerts(alertsRes.value.data);
      }

      // Also fetch full dashboard weather for HeatHealthBurdenPanel
      try {
        const dashRes = await getAuthorityDashboard();
        if (dashRes?.data?.weather) setCurrentWeather(dashRes.data.weather);
      } catch (_) { /* ignore */ }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleTriggerAction = (actionMsg) => {
    setActionNotification(actionMsg);
    setTimeout(() => setActionNotification(null), 4000);
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!alertForm.message.trim()) return;

    const actionList = alertForm.actions.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      const res = await createAuthorityAlert({
        ward: alertForm.ward,
        riskLevel: alertForm.riskLevel,
        message: alertForm.message.trim(),
        actions: actionList,
      });

      if (res.data) {
        setAlerts((prev) => [res.data, ...prev]);
      } else {
        const localAlert = {
          _id: 'alert-' + Date.now(),
          ward: alertForm.ward,
          riskLevel: alertForm.riskLevel,
          status: 'ACTIVE',
          message: alertForm.message.trim(),
          actions: actionList,
          createdAt: new Date().toISOString(),
        };
        setAlerts((prev) => [localAlert, ...prev]);
      }
    } catch {
      const localAlert = {
        _id: 'alert-' + Date.now(),
        ward: alertForm.ward,
        riskLevel: alertForm.riskLevel,
        status: 'ACTIVE',
        message: alertForm.message.trim(),
        actions: actionList,
        createdAt: new Date().toISOString(),
      };
      setAlerts((prev) => [localAlert, ...prev]);
    }

    setShowNewAlertModal(false);
    setAlertForm({ ward: selectedWard.wardNumber, riskLevel: 'EXTREME', message: '', actions: 'Water tanker dispatch, Cooling center activation' });
    handleTriggerAction(`Emergency Alert broadcasted successfully for ${alertForm.ward}!`);
  };

  const getRiskColor = (lvl) => {
    switch (lvl) {
      case 'EXTREME': return '#9333ea';
      case 'HIGH': return '#ef4444';
      case 'MODERATE': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getRiskBadgeClasses = (lvl) => {
    switch (lvl) {
      case 'EXTREME': return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'HIGH': return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
      case 'MODERATE': return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default: return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Officer Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                {municipalityName}
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30">
                OFFICER COMMAND
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Officer: <strong>{officerName}</strong> • Jurisdiction Zone: <strong>North Division Wards</strong> • Assigned: <strong>{assignedWard}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={loadingData}
            title="Refresh Ward & Alert Telemetry"
            className="btn-3d btn-3d-surface p-2.5 text-stone-700 dark:text-stone-300 hover:text-orange-600 text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          <button
            onClick={() => {
              setAlertForm((prev) => ({ ...prev, ward: selectedWard.wardNumber }));
              setShowNewAlertModal(true);
            }}
            className="btn-3d btn-3d-danger px-4 py-2.5 text-xs font-black flex items-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Broadcast Ward Alert
          </button>
        </div>
      </div>

      {actionNotification && (
        <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-md animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotification}</span>
        </div>
      )}

      {/* Main Grid: OpenStreetMap on Left + Ward Selector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* OpenStreetMap Section */}
        <div className="lg:col-span-8 glass-panel card-3d p-5 rounded-2xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                  KMC Geographic Heat Vulnerability Map (OpenStreetMap)
                </h2>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Live satellite GIS rendering of municipal wards, active water tankers & cooling stations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Extreme
              </span>
              <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> High
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Mod
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low
              </span>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="w-full h-[420px] rounded-xl overflow-hidden relative border border-stone-200 dark:border-slate-800 shadow-inner">
            <MapContainer
              center={[selectedWard.lat || 22.5900, selectedWard.lng || 88.3620]}
              zoom={13}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter lat={selectedWard.lat} lng={selectedWard.lng} />

              {/* Render each ward marker */}
              {wards.map((ward) => {
                const color = getRiskColor(ward.riskLevel);
                const isSelected = selectedWard.wardNumber === ward.wardNumber;
                return (
                  <CircleMarker
                    key={ward.wardNumber}
                    center={[ward.lat, ward.lng]}
                    radius={isSelected ? 18 : 13}
                    pathOptions={{
                      color: isSelected ? '#000' : color,
                      fillColor: color,
                      fillOpacity: 0.8,
                      weight: isSelected ? 3 : 1.5,
                    }}
                    eventHandlers={{
                      click: () => setSelectedWard(ward),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent={isSelected}>
                      <span className="font-bold text-xs">{ward.wardNumber} ({ward.heatIndex || 38}°C)</span>
                    </Tooltip>
                    <Popup>
                      <div className="p-2 text-xs">
                        <p className="font-bold text-sm text-stone-900">{ward.wardNumber}: {ward.name}</p>
                        <p className="text-stone-600 mt-1">Heat Index: <strong>{ward.heatIndex || 38}°C</strong> ({ward.riskLevel})</p>
                        <p className="text-stone-600">Density: {ward.popDensity}</p>
                        <p className="text-stone-600">Water Kiosks: {ward.waterKiosks || 4} • Tankers: {ward.activeTankers || 1}</p>
                        <button
                          onClick={() => setSelectedWard(ward)}
                          className="mt-2 w-full py-1 px-2 bg-orange-600 text-white rounded text-[11px] font-bold"
                        >
                          Select Ward
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400 pt-1">
            <span>Click any circle marker to center and load ward diagnostics.</span>
            <span className="font-mono">Coordinates: 22.5726° N, 88.3639° E (Kolkata Region)</span>
          </div>
        </div>

        {/* Ward Selector List */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Ward Directory ({wards.length})
            </h3>
            <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-bold">
              Active Monitored
            </span>
          </div>

          <div className="overflow-y-auto max-h-[390px] space-y-2 pr-1">
            {wards.map((w) => {
              const isSelected = selectedWard.wardNumber === w.wardNumber;
              return (
                <button
                  key={w.wardNumber}
                  onClick={() => setSelectedWard(w)}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-400 shadow-sm'
                      : 'bg-white dark:bg-slate-900/60 border-stone-200 dark:border-slate-800 hover:border-stone-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 dark:text-white font-mono">
                      {w.wardNumber}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getRiskBadgeClasses(w.riskLevel)}`}>
                      {w.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 truncate">
                    {w.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-2">
                    <span>Heat Index: <strong className="text-stone-800 dark:text-white font-mono">{w.heatIndex || 38}°C</strong></span>
                    <span>Tankers: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{w.activeTankers || 0}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Ward Deep Dive & Interventions Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ward Telemetry */}
        <div className="lg:col-span-6 glass-panel card-3d p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-bold uppercase">
                Detailed Telemetry Analysis
              </span>
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                {selectedWard.wardNumber}: {selectedWard.name}
              </h3>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getRiskBadgeClasses(selectedWard.riskLevel)}`}>
              {selectedWard.riskLevel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-600" /> Population Density
              </span>
              <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">{selectedWard.popDensity || 'High'}</p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" /> Senior Citizens (60+)
              </span>
              <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">{selectedWard.elderly || '15%'}</p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Trees className="w-3.5 h-3.5 text-emerald-600" /> Tree Canopy Coverage
              </span>
              <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">{selectedWard.treeCanopy || '6.5%'}</p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-cyan-600" /> Drinking Water Kiosks
              </span>
              <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">{selectedWard.waterKiosks || 4} locations</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Automated Response Checklist:
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
              {(selectedWard.interventionsNeeded || ['Deploy Emergency Water Tankers', 'Activate Area Cooling Center']).map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-stone-50 dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Instant Municipal Interventions */}
        <div className="lg:col-span-6 glass-panel card-3d p-6 rounded-2xl space-y-4">
          <div className="border-b border-stone-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-600 animate-pulse" />
              1-Click Municipal Intervention Units ({selectedWard.wardNumber})
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Direct telemetry orders dispatched directly to ground teams in {selectedWard.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleTriggerAction(`Dispatched 2x 10,000L Emergency Water Tankers to ${selectedWard.wardNumber} (${selectedWard.name})`)}
              className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-300 dark:border-cyan-800 text-left cursor-pointer group card-3d active:translate-y-1"
            >
              <Truck className="w-5 h-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-stone-900 dark:text-white mt-2">Dispatch Water Tankers</h4>
              <p className="text-[11px] text-cyan-800 dark:text-cyan-200 mt-0.5">Send 20,000L drinking water supply</p>
            </button>

            <button
              onClick={() => handleTriggerAction(`Activated Community Cooling Shelter in ${selectedWard.wardNumber}`)}
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-left cursor-pointer group card-3d active:translate-y-1"
            >
              <Home className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-stone-900 dark:text-white mt-2">Open Cooling Shelters</h4>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-200 mt-0.5">Activate 24/7 air-conditioned shelter</p>
            </button>

            <button
              onClick={() => handleTriggerAction(`Deployed misting fans and ORS booths at transit stops in ${selectedWard.wardNumber}`)}
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-left cursor-pointer group card-3d active:translate-y-1"
            >
              <Wind className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-stone-900 dark:text-white mt-2">Deploy Misting Fans</h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5">Deploy misting stations at bus terminals</p>
            </button>

            <button
              onClick={() => handleTriggerAction(`Issued Section 144 / Work Stoppage Advisory (12-3 PM) for ${selectedWard.wardNumber}`)}
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-left cursor-pointer group card-3d active:translate-y-1"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-stone-900 dark:text-white mt-2">Halt Outdoor Labor</h4>
              <p className="text-[11px] text-rose-800 dark:text-rose-200 mt-0.5">Enforce mandatory midday work suspension</p>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              KMC Disaster Control Helpline: <strong>033-2286-1212</strong>
            </span>
            <span className="text-[11px] text-stone-400 font-mono">Response Protocol: &lt;15 mins</span>
          </div>
        </div>
      </div>

      {/* Layer A: Historical Supervised ML Heat-Health Burden Panel */}
      <HeatHealthBurdenPanel
        defaultState={(() => {
          const m = user?.municipality || 'Kolkata Municipal Corporation';
          const map = {
            'Kolkata Municipal Corporation': 'West Bengal',
            'Brihanmumbai Municipal Corporation': 'Maharashtra',
            'Municipal Corporation of Delhi': 'Delhi',
            'Greater Chennai Corporation': 'Tamil Nadu',
            'Bruhat Bengaluru Mahanagara Palike': 'Karnataka',
            'Greater Hyderabad Municipal Corporation': 'Andhra Pradesh',
            'Patna Municipal Corporation': 'Bihar',
            'Lucknow Municipal Corporation': 'Uttar Pradesh',
          };
          return map[m] || 'West Bengal';
        })()}
        currentWeather={currentWeather}
      />

      {/* Active Broadcast Heat Alerts & Bulletins List */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-red-600 animate-bounce" />
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Official Municipal Heat Alerts & Public Advisories ({alerts.length})
            </h3>
          </div>
          <button
            onClick={() => {
              setAlertForm((prev) => ({ ...prev, ward: selectedWard.wardNumber }));
              setShowNewAlertModal(true);
            }}
            className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Issue New Advisory
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-xs space-y-2">
            <ShieldAlert className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-stone-700 dark:text-stone-300">
              No active heat alerts issued for this jurisdiction.
            </p>
            <p>All wards are operating under baseline parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-stone-900 dark:text-white">
                      {alert.ward}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-slate-700">
                      {alert.status}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getRiskBadgeClasses(alert.riskLevel)}`}>
                    {alert.riskLevel}
                  </span>
                </div>

                <p className="text-xs text-stone-700 dark:text-slate-300 font-medium">
                  {alert.message}
                </p>

                {alert.actions && alert.actions.length > 0 && (
                  <div className="pt-1.5 flex flex-wrap gap-1.5">
                    {alert.actions.map((act, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300"
                      >
                        ✓ {act}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 text-[10px] text-stone-400 dark:text-stone-500 flex items-center justify-between border-t border-stone-100 dark:border-slate-800/80">
                  <span>Issued by: {officerName}</span>
                  <span>{new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Alert Modal */}
      {showNewAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Broadcast Heatwave Emergency Alert ({municipalityName})
              </h3>
              <button
                onClick={() => setShowNewAlertModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 dark:text-slate-300 font-semibold mb-1">Target Ward</label>
                <select
                  value={alertForm.ward}
                  onChange={(e) => setAlertForm({ ...alertForm, ward: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg p-2.5 text-stone-900 dark:text-white"
                >
                  {wards.map((w) => (
                    <option key={w.wardNumber} value={w.wardNumber}>
                      {w.wardNumber} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 font-semibold mb-1">Alert Severity</label>
                <select
                  value={alertForm.riskLevel}
                  onChange={(e) => setAlertForm({ ...alertForm, riskLevel: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg p-2.5 text-stone-900 dark:text-white"
                >
                  <option value="EXTREME">RED ALERT (Extreme Risk)</option>
                  <option value="HIGH">ORANGE ALERT (Severe Heatwave)</option>
                  <option value="MODERATE">YELLOW ALERT (Heat Advisory)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 font-semibold mb-1">Mandatory Interventions (Comma-separated)</label>
                <input
                  type="text"
                  value={alertForm.actions}
                  onChange={(e) => setAlertForm({ ...alertForm, actions: e.target.value })}
                  placeholder="e.g. Water tanker dispatch, Cooling center activation"
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg p-2.5 text-stone-900 dark:text-white placeholder-stone-400"
                />
              </div>

              <div>
                <label className="block text-stone-700 dark:text-slate-300 font-semibold mb-1">Advisory Message for Citizens</label>
                <textarea
                  rows="3"
                  value={alertForm.message}
                  onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                  placeholder="e.g. Extreme thermal load recorded. Mandatory hydration halts in place. Water tankers positioned at..."
                  className="w-full bg-stone-50 dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-lg p-2.5 text-stone-900 dark:text-white placeholder-stone-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAlertModal(false)}
                  className="btn-3d btn-3d-surface px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-3d btn-3d-danger px-4 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Broadcast Live Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
