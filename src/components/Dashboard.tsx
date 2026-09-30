import React, { useMemo } from 'react';
import { MediatorKontrak } from '../types';
import { Users, UserCheck, Clock, FileEdit, Award, TrendingUp } from 'lucide-react';

interface DashboardProps {
  mediators: MediatorKontrak[];
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ mediators, onNavigateTab }) => {
  const stats = useMemo(() => {
    const total = mediators.length;
    const aktif = mediators.filter(m => m.status === 'AKTIF').length;
    const pending = mediators.filter(m => m.status === 'PENDING').length;
    const belumAktif = mediators.filter(m => m.status === 'BELUM_AKTIF').length;
    const ditolak = mediators.filter(m => m.status === 'DITOLAK').length;

    // By Posko
    const poskoCount: Record<string, number> = {};
    mediators.forEach(m => {
      const p = m.kd_posko || 'Lainnya';
      poskoCount[p] = (poskoCount[p] || 0) + 1;
    });

    return { total, aktif, pending, belumAktif, ditolak, poskoCount };
  }, [mediators]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-[#12151f] border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
            DASHBOARD MONITORING
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Pengendalian &amp; Kinerja Mediator KAMM Manado
          </h2>
          <p className="text-xs text-[#a3adc2] leading-relaxed">
            Pantau pertumbuhan mitra mediator, proses validasi KD MED dari pendaftaran draf hingga aktif, serta rekapitulasi per Posko di wilayah Manado, Tomohon, dan Bitung.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mediator */}
        <div 
          onClick={() => onNavigateTab('daftar-mediator')}
          className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] hover:border-blue-500/50 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Total Mediator</span>
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[11px] text-[#717b94] flex items-center space-x-1">
            <span>Terdaftar di sistem</span>
          </div>
        </div>

        {/* Aktif */}
        <div 
          onClick={() => onNavigateTab('daftar-mediator')}
          className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Mediator Aktif</span>
            <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.aktif}</div>
          <div className="text-[11px] text-emerald-500/80 flex items-center space-x-1">
            <span>Memiliki KD MED resmi</span>
          </div>
        </div>

        {/* Pending Validasi */}
        <div 
          onClick={() => onNavigateTab('validasi-kd-med')}
          className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] hover:border-amber-500/50 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Pending Penetapan KD</span>
            <div className="p-2 rounded-xl bg-amber-600/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.pending}</div>
          <div className="text-[11px] text-amber-500/80 flex items-center space-x-1">
            <span>Berkas valid, tunggu KAOPS</span>
          </div>
        </div>

        {/* Belum Aktif / Draf */}
        <div 
          onClick={() => onNavigateTab('validasi-kd-med')}
          className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] hover:border-indigo-500/50 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Draf Belum Aktif</span>
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileEdit className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-400">{stats.belumAktif}</div>
          <div className="text-[11px] text-indigo-400/80 flex items-center space-x-1">
            <span>Menunggu verifikasi admin</span>
          </div>
        </div>
      </div>

      {/* Breakdown per Posko */}
      <div className="bg-[#12151f] border border-[#232734] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Sebaran Mediator per Posko</h3>
            <p className="text-xs text-[#8e96a8]">Jumlah mitra aktif dan terdaftar di setiap posko</p>
          </div>
          <Award className="h-5 w-5 text-blue-400" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats.poskoCount).map(([posko, count]) => (
            <div key={posko} className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[11px] font-mono text-[#8e96a8]">Posko {posko}</span>
              <div className="text-lg font-bold text-white flex items-baseline justify-between">
                <span>{count}</span>
                <span className="text-[10px] text-blue-400 font-normal">Mediator</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
