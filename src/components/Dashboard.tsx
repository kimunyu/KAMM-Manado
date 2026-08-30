import React, { useState, useMemo } from 'react';
import { MediatorKontrak, FULog, MediatorStatus } from '../types';
import { categorizeFU, formatDateIndo } from '../utils/dateUtils';
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
  FileCheck2,
  Filter,
  RotateCcw,
  MapPin,
  UserCheck,
  ShieldCheck,
  Building2,
  ChevronDown
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
  const { 
    currentUser, 
    canValidateKdMed, 
    canReviewMediator, 
    canInputKdMed, 
    canRegisterMediator, 
    canInputFU,
    allCabang,
    allPosko,
    allUsers
  } = useAuth();

  const isNational = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'RM';
  const isCMO = currentUser?.role === 'CMO';
  const isKAPOS = currentUser?.role === 'KAPOS';
  const userAo = currentUser?.kd_ao;
  const userPosko = currentUser?.kd_posko;
  const userCabang = currentUser?.kd_cabang;
  const isBranchRestricted = !isNational && !!userCabang;
  const isPoskoRestricted = !isNational && !!userPosko;

  // Filter States for Dashboard Analytics
  const [filterCabang, setFilterCabang] = useState<string>('ALL');
  const [filterPosko, setFilterPosko] = useState<string>('ALL');
  const [filterAo, setFilterAo] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Base scope filtering based on user role & assigned territory
  const scopedMediators = useMemo(() => {
    if (isNational) {
      return mediators;
    }

    return mediators.filter(m => {
      // CMO restriction
      if (isCMO) {
        const matchAo = userAo ? (m.kd_ao || '').trim().toUpperCase() === userAo.trim().toUpperCase() : false;
        const matchCreated = !!(currentUser?.nama && m.created_by_user === currentUser.nama);
        if (!matchAo && !matchCreated) {
          return false;
        }
      }

      // Posko restriction (for KAPOS, ADM with Posko, etc.)
      if (userPosko) {
        if (!m.kd_posko || m.kd_posko.trim().toUpperCase() !== userPosko.trim().toUpperCase()) {
          return false;
        }
      }

      // Cabang restriction
      if (userCabang) {
        if (!m.kd_cabang || m.kd_cabang.trim().toUpperCase() !== userCabang.trim().toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [mediators, isNational, isCMO, userAo, userPosko, userCabang, currentUser?.nama]);

  // Extract unique options for filter dropdowns with strict hierarchy
  const availableCabangs = useMemo(() => {
    const list = new Set<string>();
    allCabang.forEach(c => list.add(c.kd_cabang));
    scopedMediators.forEach(m => { if (m.kd_cabang) list.add(m.kd_cabang); });
    return Array.from(list).sort();
  }, [allCabang, scopedMediators]);

  // Effective Cabang & Posko for cascading logic
  const effectiveCabang = isBranchRestricted && userCabang ? userCabang : filterCabang;
  const isPoskoSelectionAllowed = isBranchRestricted || filterCabang !== 'ALL';

  const availablePoskos = useMemo(() => {
    if (!isPoskoSelectionAllowed || effectiveCabang === 'ALL') {
      return [];
    }
    const list = new Set<string>();
    allPosko.forEach(p => {
      if (p.kd_cabang.toUpperCase() === effectiveCabang.toUpperCase()) {
        list.add(p.kd_posko);
      }
    });
    scopedMediators.forEach(m => {
      if (m.kd_cabang && m.kd_cabang.toUpperCase() === effectiveCabang.toUpperCase()) {
        if (m.kd_posko) list.add(m.kd_posko);
      }
    });
    return Array.from(list).sort();
  }, [allPosko, scopedMediators, effectiveCabang, isPoskoSelectionAllowed]);

  const effectivePosko = isPoskoRestricted && userPosko ? userPosko : filterPosko;
  const isAoSelectionAllowed = isPoskoRestricted || (isPoskoSelectionAllowed && filterPosko !== 'ALL');

  const availableAos = useMemo(() => {
    if (!isAoSelectionAllowed || effectivePosko === 'ALL') {
      return [];
    }
    const list = new Set<string>();
    allUsers.filter(u => u.role === 'CMO' && u.kd_ao).forEach(u => {
      const matchCab = !effectiveCabang || effectiveCabang === 'ALL' || !u.kd_cabang || u.kd_cabang.toUpperCase() === effectiveCabang.toUpperCase();
      const matchPos = !effectivePosko || effectivePosko === 'ALL' || !u.kd_posko || u.kd_posko.toUpperCase() === effectivePosko.toUpperCase();
      if (matchCab && matchPos) {
        list.add(u.kd_ao!);
      }
    });

    scopedMediators.forEach(m => {
      const matchCab = !effectiveCabang || effectiveCabang === 'ALL' || (m.kd_cabang && m.kd_cabang.toUpperCase() === effectiveCabang.toUpperCase());
      const matchPos = !effectivePosko || effectivePosko === 'ALL' || (m.kd_posko && m.kd_posko.toUpperCase() === effectivePosko.toUpperCase());
      if (matchCab && matchPos && m.kd_ao) {
        list.add(m.kd_ao);
      }
    });
    return Array.from(list).sort();
  }, [allUsers, scopedMediators, effectiveCabang, effectivePosko, isAoSelectionAllowed]);

  // Apply Interactive Filters to Scoped Data
  const filteredMediators = useMemo(() => {
    return scopedMediators.filter(m => {
      // Cabang filter
      if (filterCabang !== 'ALL') {
        if (!m.kd_cabang || m.kd_cabang.toUpperCase() !== filterCabang.toUpperCase()) {
          return false;
        }
      }

      // Posko filter
      if (filterPosko !== 'ALL') {
        if (!m.kd_posko || m.kd_posko.toUpperCase() !== filterPosko.toUpperCase()) {
          return false;
        }
      }

      // AO filter
      if (filterAo !== 'ALL') {
        if (!m.kd_ao || m.kd_ao.toUpperCase() !== filterAo.toUpperCase()) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'ALL') {
        if (m.status !== filterStatus) {
          return false;
        }
      }

      return true;
    });
  }, [scopedMediators, filterCabang, filterPosko, filterAo, filterStatus]);

  const handleResetFilters = () => {
    setFilterCabang('ALL');
    setFilterPosko('ALL');
    setFilterAo('ALL');
    setFilterStatus('ALL');
  };

  const hasActiveFilter = filterCabang !== 'ALL' || filterPosko !== 'ALL' || filterAo !== 'ALL' || filterStatus !== 'ALL';

  // Status Metrics Breakdown
  const total = filteredMediators.length;
  const belumAktif = filteredMediators.filter(m => m.status === 'BELUM_AKTIF').length;
  const pending = filteredMediators.filter(m => m.status === 'PENDING').length;
  const aktif = filteredMediators.filter(m => m.status === 'AKTIF').length;
  const inaktif = filteredMediators.filter(m => m.status === 'INAKTIF').length;
  const ditolak = filteredMediators.filter(m => m.status === 'DITOLAK').length;

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
    { name: 'Aktif (Resmi)', value: aktif, color: '#10b981' },
    { name: 'Pending (Validasi)', value: pending, color: '#f59e0b' },
    { name: 'Belum Aktif (Review)', value: belumAktif, color: '#3b82f6' },
    { name: 'Inaktif', value: inaktif, color: '#94a3b8' },
    { name: 'Ditolak', value: ditolak, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const fuCategoryData = [
    { name: 'Belum di FU', count: belumFu, fill: '#ef4444', desc: 'Belum pernah di-follow up' },
    { name: 'FU > 30 Hari', count: lebih30, fill: '#f97316', desc: 'Terakhir FU > 30 hari lalu' },
    { name: 'FU > 15 Hari', count: lebih15, fill: '#3b82f6', desc: 'Terakhir FU 16-30 hari' },
    { name: 'Sudah di FU', count: sudahFu, fill: '#10b981', desc: 'Follow-up aktif ≤ 15 hari' },
  ];

  // Group by cabang for breakdown
  const cabangMap: Record<string, { total: number; aktif: number; pending: number; belumAktif: number }> = {};
  filteredMediators.forEach(m => {
    const cab = m.kd_cabang || 'Lainnya';
    if (!cabangMap[cab]) cabangMap[cab] = { total: 0, aktif: 0, pending: 0, belumAktif: 0 };
    cabangMap[cab].total++;
    if (m.status === 'AKTIF') cabangMap[cab].aktif++;
    else if (m.status === 'PENDING') cabangMap[cab].pending++;
    else if (m.status === 'BELUM_AKTIF') cabangMap[cab].belumAktif++;
  });

  // Group by Posko for breakdown table
  const poskoMap: Record<string, { posko: string; cabang: string; total: number; aktif: number; pending: number; belumAktif: number }> = {};
  filteredMediators.forEach(m => {
    const pos = m.kd_posko || 'POSKO UTAMA';
    if (!poskoMap[pos]) poskoMap[pos] = { posko: pos, cabang: m.kd_cabang || '-', total: 0, aktif: 0, pending: 0, belumAktif: 0 };
    poskoMap[pos].total++;
    if (m.status === 'AKTIF') poskoMap[pos].aktif++;
    else if (m.status === 'PENDING') poskoMap[pos].pending++;
    else if (m.status === 'BELUM_AKTIF') poskoMap[pos].belumAktif++;
  });

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
              {isCMO 
                ? 'Dashboard Mediator CMO' 
                : isKAPOS 
                ? `Dashboard Mediator Posko (${userPosko || 'Posko'})` 
                : isBranchRestricted 
                ? `Dashboard Kontrol Cabang ${userCabang}` 
                : 'Dashboard Mediator Kontrak (Nasional)'}
            </h1>
            <p className="text-[#a6adbb] text-sm mt-1">
              {isCMO
                ? `Menampilkan ringkasan mediator yang Anda registrasikan (Kode CMO: ${userAo || 'CMO'}, Total ${total} mediator)`
                : isKAPOS
                ? `Menampilkan data khusus Posko ${userPosko || '-'} Cabang ${userCabang || '-'} (${currentUser?.nama})`
                : isBranchRestricted
                ? `Menampilkan data ringkasan seluruh posko di bawah Cabang ${currentUser?.kd_cabang} (${currentUser?.nama})`
                : `Menampilkan analisis data terpusat seluruh cabang dan posko nasional`}
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
              <span>Daftar Seluruh Mediator</span>
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

            {/* Tahap 1: Peninjauan Berkas (Admin & Super Admin) */}
            {canReviewMediator && belumAktif > 0 && (
              <button
                id="dash-btn-review-admin"
                onClick={() => onNavigate('validasi')}
                className="px-3.5 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer animate-pulse"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>Tinjau Berkas ({belumAktif})</span>
              </button>
            )}

            {/* Tahap 2: Input KD MED (KAPOS & Super Admin) */}
            {canInputKdMed && pending > 0 && (
              <button
                id="dash-btn-validasi-kapos"
                onClick={() => onNavigate('validasi')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer animate-pulse"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Input KD MED ({pending})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER CONTROL BAR (CABANG, POSKO, AO, STATUS) */}
      <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#232734]">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#f1f3f7]">
            <Filter className="h-4 w-4 text-blue-400" />
            <span>Filter Kontrol Ringkasan Data</span>
            {hasActiveFilter && (
              <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800 font-semibold">
                Filter Aktif: {filteredMediators.length} dari {scopedMediators.length} mediator
              </span>
            )}
          </div>
          {hasActiveFilter && (
            <button
              id="dash-btn-reset-filters"
              onClick={handleResetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Filter Cabang (Step 1) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8e96a8] mb-1">
              1. Cabang Operasional {isBranchRestricted && '(Terkunci)'}
            </label>
            <select
              id="dash-filter-cabang"
              value={filterCabang}
              disabled={isBranchRestricted}
              onChange={(e) => {
                const val = e.target.value;
                setFilterCabang(val);
                setFilterPosko('ALL'); // Reset posko when cabang changes
                setFilterAo('ALL'); // Reset AO when cabang changes
              }}
              className={`w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isBranchRestricted ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <option value="ALL">-- Pilih / Semua Cabang --</option>
              {availableCabangs.map(cab => (
                <option key={cab} value={cab}>{cab}</option>
              ))}
            </select>
          </div>

          {/* 2. Filter Posko (Step 2: Enabled only after Cabang selected or branch restricted) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8e96a8] mb-1">
              2. Posko Operasional {isPoskoRestricted ? '(Terkunci)' : !isPoskoSelectionAllowed ? '(Pilih Cabang Dulu)' : ''}
            </label>
            <select
              id="dash-filter-posko"
              value={filterPosko}
              disabled={!isPoskoSelectionAllowed || isPoskoRestricted}
              onChange={(e) => {
                setFilterPosko(e.target.value);
                setFilterAo('ALL'); // Reset AO when posko changes
              }}
              className={`w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                !isPoskoSelectionAllowed || isPoskoRestricted ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {!isPoskoSelectionAllowed ? (
                <option value="ALL">-- Pilih Cabang Dahulu --</option>
              ) : (
                <>
                  <option value="ALL">
                    {effectiveCabang !== 'ALL' ? `-- Semua Posko di ${effectiveCabang} --` : '-- Semua Posko --'}
                  </option>
                  {availablePoskos.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 3. Filter AO / CMO (Step 3: Enabled only after Posko selected or posko restricted) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8e96a8] mb-1">
              3. Petugas / Kode AO {isCMO ? '(Terkunci CMO)' : !isAoSelectionAllowed ? '(Pilih Posko Dulu)' : ''}
            </label>
            <select
              id="dash-filter-ao"
              value={filterAo}
              disabled={!isAoSelectionAllowed || isCMO}
              onChange={(e) => setFilterAo(e.target.value)}
              className={`w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                !isAoSelectionAllowed || isCMO ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {!isAoSelectionAllowed ? (
                <option value="ALL">-- Pilih Posko Dahulu --</option>
              ) : (
                <>
                  <option value="ALL">
                    {effectivePosko !== 'ALL' ? `-- Semua Petugas AO di Posko ${effectivePosko} --` : '-- Semua Petugas AO --'}
                  </option>
                  {availableAos.map(ao => (
                    <option key={ao} value={ao}>{ao}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* 4. Filter Status Registrasi */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8e96a8] mb-1">
              4. Status Alur Pendaftaran
            </label>
            <select
              id="dash-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="ALL">-- Semua Status --</option>
              <option value="BELUM_AKTIF">Tahap 1: BELUM AKTIF (Review Admin)</option>
              <option value="PENDING">Tahap 2: PENDING (Input KD MED)</option>
              <option value="AKTIF">Tahap 3: AKTIF (KD MED Resmi)</option>
              <option value="INAKTIF">Status: INAKTIF</option>
              <option value="DITOLAK">Status: DITOLAK</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. STATUS REGISTRASI 5 METRIC CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider flex items-center space-x-2">
            <span>Ringkasan Alur & Status Registrasi Mediator</span>
          </h2>
          <span className="text-xs text-[#6b7280]">Sinkronisasi waktu nyata</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Mediator */}
          <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md hover:border-[#32384a] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8] uppercase tracking-wider">Total Terdaftar</span>
              <div className="p-2 rounded-xl bg-blue-950/70 text-blue-400 border border-blue-800/50">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-[#f1f3f7]">{total}</div>
              <p className="text-[11px] text-[#8e96a8] mt-0.5 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-emerald-400" />
                Semua data tersaring
              </p>
            </div>
          </div>

          {/* 2. Status BELUM AKTIF (Tahap 1: Peninjauan Admin) */}
          <div 
            onClick={() => canReviewMediator && onNavigate('validasi')}
            className={`p-4 rounded-2xl border shadow-md transition-all ${
              belumAktif > 0 
                ? 'bg-blue-950/20 border-blue-800/70 hover:border-blue-500 cursor-pointer' 
                : 'bg-[#13151c] border-[#232734]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">1. Belum Aktif</span>
              <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-blue-400">{belumAktif}</div>
              <p className="text-[11px] text-blue-300/80 mt-0.5 flex items-center">
                <span>Tinjau berkas (Admin)</span>
                {canReviewMediator && belumAktif > 0 && <ArrowUpRight className="h-3 w-3 ml-1" />}
              </p>
            </div>
          </div>

          {/* 3. Status PENDING (Tahap 2: Input KD MED KAPOS/Super Admin) */}
          <div 
            onClick={() => canInputKdMed && onNavigate('validasi')}
            className={`p-4 rounded-2xl border shadow-md transition-all ${
              pending > 0 
                ? 'bg-amber-950/20 border-amber-800/70 hover:border-amber-500 cursor-pointer' 
                : 'bg-[#13151c] border-[#232734]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">2. Pending</span>
              <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-amber-400">{pending}</div>
              <p className="text-[11px] text-amber-300/80 mt-0.5 flex items-center">
                <span>Input KD MED (KAPOS)</span>
                {canInputKdMed && pending > 0 && <ArrowUpRight className="h-3 w-3 ml-1" />}
              </p>
            </div>
          </div>

          {/* 4. Status AKTIF (Tahap 3: KD MED Resmi) */}
          <div className="bg-[#13151c] p-4 rounded-2xl border border-emerald-900/40 shadow-md hover:border-emerald-700/60 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">3. Aktif Resmi</span>
              <div className="p-2 rounded-xl bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-emerald-400">{aktif}</div>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                {total > 0 ? Math.round((aktif / total) * 100) : 0}% KD MED aktif
              </p>
            </div>
          </div>

          {/* 5. Status INAKTIF / Ditolak */}
          <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md hover:border-[#32384a] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8] uppercase tracking-wider">Inaktif / Ditolak</span>
              <div className="p-2 rounded-xl bg-[#1a1d27] text-[#8e96a8] border border-[#2e3446]">
                <PhoneOff className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-extrabold text-[#a6adbb]">{inaktif + ditolak}</div>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                {inaktif} Inaktif • {ditolak} Ditolak
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOLLOW-UP (FU) CATEGORY SUMMARY & CHARTS */}
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
              <span>Proporsi Status Alur</span>
            </h2>
            <p className="text-xs text-[#8e96a8] mt-0.5">Distribusi Tahapan Mediator</p>

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
            <div className="space-y-1.5 mt-2 border-t border-[#232734] pt-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[#c2c7d0] font-medium">AKTIF (KD MED Terbit)</span>
                </div>
                <span className="font-bold text-[#f1f3f7]">{aktif}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-[#c2c7d0] font-medium">PENDING (Input KD MED)</span>
                </div>
                <span className="font-bold text-amber-400">{pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-[#c2c7d0] font-medium">BELUM AKTIF (Review)</span>
                </div>
                <span className="font-bold text-blue-400">{belumAktif}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500"></span>
                  <span className="text-[#c2c7d0] font-medium">INAKTIF / DITOLAK</span>
                </div>
                <span className="font-bold text-[#8e96a8]">{inaktif + ditolak}</span>
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

      {/* 3. BRANCH & POSKO & AO SUMMARY MATRICES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cabang Breakdown Cards */}
        <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-400" />
                <span>Ringkasan per Cabang</span>
              </h2>
              <p className="text-xs text-[#8e96a8]">Distribusi status pendaftaran di tiap cabang</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {Object.keys(cabangMap).length === 0 ? (
              <p className="text-xs text-[#8e96a8] italic col-span-2 text-center py-6">
                Belum ada data mediator pada filter ini
              </p>
            ) : (
              Object.keys(cabangMap).map(cab => {
                const data = cabangMap[cab];
                return (
                  <div key={cab} className="p-3.5 rounded-xl border border-[#272d3e] bg-[#181a24] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#f1f3f7] pb-1.5 border-b border-[#232734]">
                      <span>{cab}</span>
                      <span className="text-blue-400 bg-blue-950/70 px-2 py-0.5 rounded border border-blue-800/60 font-mono">
                        {data.total} Total
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] pt-1">
                      <div className="text-center bg-[#11131a] p-1.5 rounded-lg border border-[#232734]">
                        <span className="text-[#8e96a8] block text-[10px]">Aktif</span>
                        <span className="font-bold text-emerald-400">{data.aktif}</span>
                      </div>
                      <div className="text-center bg-[#11131a] p-1.5 rounded-lg border border-[#232734]">
                        <span className="text-[#8e96a8] block text-[10px]">Pending</span>
                        <span className="font-bold text-amber-400">{data.pending}</span>
                      </div>
                      <div className="text-center bg-[#11131a] p-1.5 rounded-lg border border-[#232734]">
                        <span className="text-[#8e96a8] block text-[10px]">Review</span>
                        <span className="font-bold text-blue-400">{data.belumAktif}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rekapitulasi per Posko Operasional */}
        <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-emerald-400" />
                <span>Rekapitulasi per Posko Operasional</span>
              </h2>
              <p className="text-xs text-[#8e96a8]">Distribusi mediator per titik posko wilayah</p>
            </div>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800/60 font-mono">
              {Object.keys(poskoMap).length} Posko
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {Object.keys(poskoMap).length === 0 ? (
              <p className="text-xs text-[#8e96a8] italic text-center py-6">
                Belum ada data mediator di posko ini
              </p>
            ) : (
              Object.entries(poskoMap).map(([poskoCode, data]) => (
                <div key={poskoCode} className="p-3 rounded-xl bg-[#181a24] border border-[#272d3e] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#f1f3f7] font-mono">{poskoCode}</span>
                      <span className="text-[11px] text-[#8e96a8] ml-2">({data.cabang})</span>
                    </div>
                    <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 font-mono">
                      {data.total} Mediator
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1">
                    <div className="text-center bg-[#11131a] p-1.5 rounded-lg border border-[#232734]">
                      <span className="text-[#8e96a8] block text-[10px]">Aktif</span>
                      <span className="font-bold text-emerald-400">{data.aktif}</span>
                    </div>
                    <div className="text-center bg-[#11131a] p-1.5 rounded-lg border border-[#232734]">
                      <span className="text-[#8e96a8] block text-[10px]">Pending</span>
                      <span className="font-bold text-amber-400">{data.pending}</span>
                    </div>
                    <div className="text-center bg-[#11131a] p-1.5 rounded-lg border border-[#232734]">
                      <span className="text-[#8e96a8] block text-[10px]">Review</span>
                      <span className="font-bold text-blue-400">{data.belumAktif}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
