import React from 'react';
import { MediatorKontrak, FULog } from '../types';
import { categorizeFU, getFUCategoryBadge, formatDateIndo } from '../utils/dateUtils';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  PhoneCall, 
  ArrowUpRight, 
  Activity,
  PhoneOff,
  Building,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { ActiveTab } from './Sidebar';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  mediators: MediatorKontrak[];
  fuLogs: FULog[];
  onNavigate: (tab: ActiveTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ mediators, fuLogs, onNavigate }) => {
  const { currentUser, canValidateKdMed, canRegisterMediator, canInputFU } = useAuth();

  const isCMO = currentUser?.role === 'CMO';
  const isKAPOS = currentUser?.role === 'KAPOS';
  const userAo = currentUser?.kd_ao;
  const userPosko = currentUser?.kd_posko;
  const userCabang = currentUser?.kd_cabang;
  const isBranchRestricted = !isCMO && !isKAPOS && currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'RM' && !!userCabang;

  // Filter based on user role (CMO locked by AO code, KAPOS locked by Posko, Branch roles locked by Cabang)
  const filteredMediators = React.useMemo(() => {
    if (isCMO) {
      return mediators.filter(m => {
        const matchAo = userAo ? (m.kd_ao || '').trim().toUpperCase() === userAo.trim().toUpperCase() : false;
        const matchCreated = !!(currentUser?.nama && m.created_by_user === currentUser.nama);
        return matchAo || matchCreated;
      });
    }
    if (isKAPOS) {
      return mediators.filter(m => {
        return userPosko ? m.kd_posko.trim().toUpperCase() === userPosko.trim().toUpperCase() : true;
      });
    }
    if (isBranchRestricted) {
      return mediators.filter(m => m.kd_cabang === userCabang);
    }
    return mediators;
  }, [mediators, isCMO, isKAPOS, userAo, userPosko, isBranchRestricted, userCabang, currentUser?.nama]);

  // Status Metrics
  const total = filteredMediators.length;
  const aktif = filteredMediators.filter(m => m.status === 'AKTIF').length;
  const pending = filteredMediators.filter(m => m.status === 'PENDING').length;
  const inaktif = filteredMediators.filter(m => m.status === 'INAKTIF').length;

  // FU Category Metrics
  let belumFu = 0;
  let lebih30 = 0;
  let lebih15 = 0;
  let sudahFu = 0;

  filteredMediators.forEach(m => {
    const cat = categorizeFU(m.tgl_akhir_fu);
    if (cat === 'BELUM_FU') belumFu++;
    else if (cat === 'LEBIH_30_HARI') lebih30++;
    else if (cat === 'LEBIH_15_HARI') lebih15++;
    else if (cat === 'SUDAH_FU') sudahFu++;
  });

  // Data for Charts
  const statusPieData = [
    { name: 'Aktif', value: aktif, color: '#10b981' },
    { name: 'Pending (Diajukan)', value: pending, color: '#f59e0b' },
    { name: 'Inaktif', value: inaktif, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const fuCategoryData = [
    { name: 'Belum di FU', count: belumFu, fill: '#ef4444', desc: 'Belum pernah di-follow up' },
    { name: 'FU > 30 Hari', count: lebih30, fill: '#f97316', desc: 'Terakhir FU > 30 hari lalu' },
    { name: 'FU > 15 Hari', count: lebih15, fill: '#3b82f6', desc: 'Terakhir FU 16-30 hari' },
    { name: 'Sudah di FU', count: sudahFu, fill: '#10b981', desc: 'Follow-up aktif ≤ 15 hari' },
  ];

  // Group by cabang
  const cabangMap: Record<string, { aktif: number; pending: number }> = {};
  filteredMediators.forEach(m => {
    const cab = m.kd_cabang || 'Lainnya';
    if (!cabangMap[cab]) cabangMap[cab] = { aktif: 0, pending: 0 };
    if (m.status === 'AKTIF') cabangMap[cab].aktif++;
    else if (m.status === 'PENDING') cabangMap[cab].pending++;
  });

  const cabangChartData = Object.keys(cabangMap).map(cab => ({
    cabang: cab,
    Aktif: cabangMap[cab].aktif,
    Pending: cabangMap[cab].pending,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#141824] via-[#1a2133] to-[#141824] text-white rounded-2xl p-6 shadow-xl border border-[#262c3e]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Activity className="h-4 w-4" />
              <span>Monitoring Kontrol Real-Time</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f1f3f7]">
              {isCMO ? 'Dashboard Mediator CMO' : isKAPOS ? `Dashboard Mediator Posko (${userPosko || 'Posko'})` : 'Dashboard Mediator Kontrak'}
            </h1>
            <p className="text-[#a6adbb] text-sm mt-1">
              {isCMO
                ? `Menampilkan ringkasan mediator yang Anda registrasikan (Kode CMO: ${userAo || 'CMO'}, Total ${total} mediator)`
                : isKAPOS
                ? `Menampilkan data khusus Posko ${userPosko || '-'} Cabang ${userCabang || '-'} (${currentUser?.nama}, Total ${total} mediator)`
                : isBranchRestricted
                ? `Menampilkan data khusus Cabang ${currentUser?.kd_cabang} (${currentUser?.nama})`
                : `Menampilkan seluruh data nasional (Total ${total} mediator terdaftar)`}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="dash-btn-daftar-mediator"
              onClick={() => onNavigate('daftar-mediator')}
              className="px-3.5 py-2 bg-[#1f2535] hover:bg-[#283044] text-[#e0e4eb] text-xs font-medium rounded-xl border border-[#323b52] transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Users className="h-4 w-4 text-blue-400" />
              <span>Lihat Seluruh Mediator</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#8e96a8]" />
            </button>

            {canRegisterMediator && (
              <button
                id="dash-btn-registrasi"
                onClick={() => onNavigate('registrasi')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>+ Registrasi Baru</span>
              </button>
            )}

            {canValidateKdMed && pending > 0 && (
              <button
                id="dash-btn-validasi"
                onClick={() => onNavigate('validasi')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer animate-pulse"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>Validasi KD MED ({pending})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1. STATUS REGISTRASI METRIC CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider flex items-center space-x-2">
            <span>Ringkasan Status Registrasi Mediator</span>
          </h2>
          <span className="text-xs text-[#6b7280]">Auto-update sistem</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Mediator */}
          <div className="bg-[#13151c] p-5 rounded-2xl border border-[#232734] shadow-md hover:border-[#32384a] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8] uppercase tracking-wider">Total Mediator</span>
              <div className="p-2 rounded-xl bg-blue-950/70 text-blue-400 border border-blue-800/50">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-[#f1f3f7]">{total}</div>
              <p className="text-xs text-[#8e96a8] mt-1 flex items-center">
                <TrendingUp className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                Total keseluruhan data mediator
              </p>
            </div>
          </div>

          {/* Status AKTIF */}
          <div className="bg-[#13151c] p-5 rounded-2xl border border-emerald-900/40 shadow-md hover:border-emerald-700/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Status AKTIF</span>
              <div className="p-2 rounded-xl bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-emerald-400">{aktif}</div>
              <p className="text-xs text-emerald-300/80 mt-1">
                {total > 0 ? Math.round((aktif / total) * 100) : 0}% telah memiliki KD MED resmi
              </p>
            </div>
          </div>

          {/* Status PENDING (Diajukan) */}
          <div 
            onClick={() => canValidateKdMed && onNavigate('validasi')}
            className={`bg-[#13151c] p-5 rounded-2xl border shadow-md transition-all ${
              pending > 0 
                ? 'border-amber-700/60 bg-[#161514] cursor-pointer hover:border-amber-500' 
                : 'border-[#232734]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">PENDING (Diajukan)</span>
              <div className="p-2 rounded-xl bg-amber-950/70 text-amber-400 border border-amber-800/50">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-amber-400">{pending}</div>
              <p className="text-xs text-amber-300/80 mt-1 flex items-center">
                <span>Menunggu input KD MED KAOPS</span>
                {canValidateKdMed && pending > 0 && <ArrowUpRight className="h-3 w-3 ml-1" />}
              </p>
            </div>
          </div>

          {/* Status INAKTIF */}
          <div className="bg-[#13151c] p-5 rounded-2xl border border-[#232734] shadow-md hover:border-[#32384a] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8] uppercase tracking-wider">INAKTIF</span>
              <div className="p-2 rounded-xl bg-[#1a1d27] text-[#8e96a8] border border-[#2e3446]">
                <PhoneOff className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-[#a6adbb]">{inaktif}</div>
              <p className="text-xs text-[#6b7280] mt-1">
                Mediator non-aktif / ditutup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOLLOW-UP (FU) CATEGORY SUMMARY & CHARTS (SPECIFICATION COMPLIANT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FU Category 4-Boxes Metric Summary */}
        <div className="lg:col-span-2 bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
                <PhoneCall className="h-5 w-5 text-blue-400" />
                <span>Kategori Follow-Up (FU) Berdasarkan Waktu</span>
              </h2>
              <p className="text-xs text-[#8e96a8] mt-0.5">
                Klasifikasi mediator berdasarkan tanggal kontak / follow-up terakhir aktif
              </p>
            </div>
            {canInputFU && (
              <button
                id="dash-btn-input-fu-top"
                onClick={() => onNavigate('follow-up')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>Input FU Baru</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 4 Category Cards in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
            {/* 1. Belum di FU */}
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                  1. Belum di FU
                </span>
                <p className="text-xs text-rose-400/80 mt-0.5">Belum pernah di-follow up sama sekali</p>
                <div className="mt-2 text-2xl font-black text-rose-400">{belumFu}</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>

            {/* 2. FU terakhir > 30 hari */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/50 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  2. FU Terakhir &gt; 30 Hari
                </span>
                <p className="text-xs text-amber-400/80 mt-0.5">Sudah lebih dari 30 hari tidak ada kontak</p>
                <div className="mt-2 text-2xl font-black text-amber-400">{lebih30}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/60">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* 3. FU terakhir > 15 hari */}
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                  3. FU Terakhir &gt; 15 Hari
                </span>
                <p className="text-xs text-blue-400/80 mt-0.5">Kontak terakhir 16 s/d 30 hari lalu</p>
                <div className="mt-2 text-2xl font-black text-blue-400">{lebih15}</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/60">
                <PhoneCall className="h-5 w-5" />
              </div>
            </div>

            {/* 4. Sudah di FU */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/50 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  4. Sudah di FU (Aktif)
                </span>
                <p className="text-xs text-emerald-400/80 mt-0.5">Follow-up berkala dalam 15 hari terakhir</p>
                <div className="mt-2 text-2xl font-black text-emerald-400">{sudahFu}</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* FU Category Bar Chart */}
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8e96a8' }} stroke="#282d3e" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8e96a8' }} stroke="#282d3e" />
                <Tooltip 
                  formatter={(val: any) => [`${val} Mediator`, 'Jumlah']}
                  contentStyle={{ backgroundColor: '#181a24', borderColor: '#2e3446', borderRadius: '10px', color: '#f1f3f7', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {fuCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Proporsi Status Registrasi</span>
            </h2>
            <p className="text-xs text-[#8e96a8] mt-0.5">Perbandingan Mediator Aktif vs Pending</p>

            <div className="h-48 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.color} stroke="#13151c" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} Mediator`, 'Jumlah']}
                    contentStyle={{ backgroundColor: '#181a24', borderColor: '#2e3446', borderRadius: '10px', color: '#f1f3f7', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="space-y-2 mt-2 border-t border-[#232734] pt-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                  <span className="text-[#c2c7d0] font-medium">AKTIF (KD MED Terbit)</span>
                </div>
                <span className="font-bold text-[#f1f3f7]">{aktif}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                  <span className="text-[#c2c7d0] font-medium">PENDING (Diajukan)</span>
                </div>
                <span className="font-bold text-amber-400">{pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full bg-slate-500"></span>
                  <span className="text-[#c2c7d0] font-medium">INAKTIF</span>
                </div>
                <span className="font-bold text-[#8e96a8]">{inaktif}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#232734]">
            <button
              id="dash-btn-daftar-mediator-footer"
              onClick={() => onNavigate('daftar-mediator')}
              className="w-full py-2 px-3 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Buka Menu Daftar Seluruh Mediator</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#8e96a8]" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BRANCH DISTRIBUTION BREAKDOWN */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-400" />
              <span>Distribusi Mediator per Cabang & Posko</span>
            </h2>
            <p className="text-xs text-[#8e96a8]">Rekapitulasi status kontrak mediator per cabang operasional</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.keys(cabangMap).map(cab => {
            const data = cabangMap[cab];
            return (
              <div key={cab} className="p-4 rounded-xl border border-[#272d3e] bg-[#181a24]">
                <div className="flex items-center justify-between text-xs font-bold text-[#f1f3f7] pb-2 border-b border-[#232734]">
                  <span>{cab}</span>
                  <span className="text-blue-400">{data.aktif + data.pending} Total</span>
                </div>
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#8e96a8]">
                    <span>Aktif:</span>
                    <span className="font-semibold text-emerald-400">{data.aktif}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8e96a8]">
                    <span>Pending:</span>
                    <span className="font-semibold text-amber-400">{data.pending}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
