import React, { useMemo, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Building2, 
  MessageSquare,
  Percent,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { SalesControlRecord, SalesKPISummary } from '../types';
import { checkHoldDanaSla } from '../utils/slaUtils';
import { Cabang, Posko, User } from '../../../types';

interface DashboardRekapitulasiProps {
  records: SalesControlRecord[];
  allCabang: Cabang[];
  allPosko: Posko[];
  currentUser: User;
  onOpenCopyWaModal: (cabangId: string, namaCabang: string) => void;
  onNavigateToHoldDana?: () => void;
}

interface PoskoStat {
  posko_id: string;
  nama_posko: string;
  submiss: number;
  accept: number;
  belumSelesai: number;
  holdDana: number;
  total: number;
}

interface CabangMatrixRow {
  cabang_id: string;
  nama_cabang: string;
  total_posko: number;
  submiss: number;
  accept: number;
  belumSelesai: number;
  holdDana: number;
  total: number;
  poskos: PoskoStat[];
}

export const DashboardRekapitulasi: React.FC<DashboardRekapitulasiProps> = ({
  records,
  allCabang,
  allPosko,
  currentUser,
  onOpenCopyWaModal,
  onNavigateToHoldDana,
}) => {
  // Hanya SUPER_ADMIN, ADM_DE, dan RM yang memiliki akses nasional dan hak Lapor WA Cabang
  const isNationalAccess = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADM_DE' || currentUser.role === 'RM';
  const canCopyWa = isNationalAccess;

  // State expand/collapse rincian posko per-cabang untuk role nasional
  const [expandedCabangs, setExpandedCabangs] = useState<Set<string>>(new Set());

  const toggleExpand = (cabangId: string) => {
    setExpandedCabangs((prev) => {
      const next = new Set(prev);
      if (next.has(cabangId)) {
        next.delete(cabangId);
      } else {
        next.add(cabangId);
      }
      return next;
    });
  };

  // Filter records berdasarkan role user untuk KPI
  const scopedRecords = useMemo(() => {
    if (isNationalAccess) return records;
    if (currentUser.role === 'ADM' || currentUser.role === 'KAPOS') {
      return records.filter(r => 
        (!currentUser.kd_posko || r.posko_id === currentUser.kd_posko || (r as any).kd_posko === currentUser.kd_posko) &&
        (!currentUser.kd_cabang || r.cabang_id === currentUser.kd_cabang || (r as any).kd_cabang === currentUser.kd_cabang)
      );
    }
    if (currentUser.role === 'KAOPS' || currentUser.role === 'KACAB') {
      return records.filter(r => 
        !currentUser.kd_cabang || r.cabang_id === currentUser.kd_cabang || (r as any).kd_cabang === currentUser.kd_cabang
      );
    }
    return records;
  }, [records, isNationalAccess, currentUser]);

  // 1. Calculate KPI Summary
  const kpiSummary: SalesKPISummary = useMemo(() => {
    let totalAccept = 0;
    let totalSubmiss = 0;
    let totalBelumSelesai = 0;
    let totalHoldDana = 0;

    scopedRecords.forEach(r => {
      if (r.status === 'ACCEPT') {
        totalAccept++;
      } else if (r.status === 'BELUM SELESAI') {
        totalBelumSelesai++;
      } else if (r.status === 'SUBMISS') {
        totalSubmiss++;
      }

      const sla = checkHoldDanaSla(r.tgl_cair, r.status);
      if (sla.isHoldDana) {
        totalHoldDana++;
      }
    });

    return {
      totalKonsumen: scopedRecords.length,
      totalAccept,
      totalSubmiss,
      totalBelumSelesai,
      totalHoldDana,
    };
  }, [scopedRecords]);

  // 2. Aggregate matrix
  // Untuk Role Nasional (SUPER_ADMIN, ADM_DE, RM): Langsung per-CABANG untuk mempermudah Copy WA Cabang!
  const cabangRows: CabangMatrixRow[] = useMemo(() => {
    if (isNationalAccess) {
      // Tampilkan seluruh cabang
      return allCabang.map((cabang) => {
        const cabangRecords = records.filter(
          (r) => r.cabang_id === cabang.kd_cabang || (r as any).kd_cabang === cabang.kd_cabang
        );
        const poskosInCabang = allPosko.filter((p) => p.kd_cabang === cabang.kd_cabang);

        let submiss = 0;
        let accept = 0;
        let belumSelesai = 0;
        let holdDana = 0;

        cabangRecords.forEach((r) => {
          if (r.status === 'ACCEPT') accept++;
          else if (r.status === 'BELUM SELESAI') belumSelesai++;
          else if (r.status === 'SUBMISS') submiss++;

          const sla = checkHoldDanaSla(r.tgl_cair, r.status);
          if (sla.isHoldDana) holdDana++;
        });

        // Sub-stat posko
        const poskos: PoskoStat[] = poskosInCabang.map((p) => {
          const pRecs = cabangRecords.filter(
            (r) => r.posko_id === p.kd_posko || (r as any).kd_posko === p.kd_posko
          );
          let pSubmiss = 0;
          let pAccept = 0;
          let pBelum = 0;
          let pHold = 0;
          pRecs.forEach((r) => {
            if (r.status === 'ACCEPT') pAccept++;
            else if (r.status === 'BELUM SELESAI') pBelum++;
            else if (r.status === 'SUBMISS') pSubmiss++;

            const sla = checkHoldDanaSla(r.tgl_cair, r.status);
            if (sla.isHoldDana) pHold++;
          });
          return {
            posko_id: p.kd_posko,
            nama_posko: p.nama_posko,
            submiss: pSubmiss,
            accept: pAccept,
            belumSelesai: pBelum,
            holdDana: pHold,
            total: pRecs.length,
          };
        }).sort((a, b) => b.holdDana - a.holdDana || b.total - a.total);

        return {
          cabang_id: cabang.kd_cabang,
          nama_cabang: cabang.nama_cabang,
          total_posko: poskosInCabang.length,
          submiss,
          accept,
          belumSelesai,
          holdDana,
          total: cabangRecords.length,
          poskos,
        };
      }).sort((a, b) => {
        // Prioritaskan cabang dengan HOLD DANA terbanyak, lalu total konsumen terbanyak
        if (b.holdDana !== a.holdDana) return b.holdDana - a.holdDana;
        return b.total - a.total;
      });
    }

    // Role Lokal (KAOPS, KACAB, ADM, KAPOS): Tampilkan cabang penugasan
    const targetCabangs = allCabang.filter((c) => 
      !currentUser.kd_cabang || c.kd_cabang === currentUser.kd_cabang
    );

    return targetCabangs.map((cabang) => {
      let poskosInCabang = allPosko.filter((p) => p.kd_cabang === cabang.kd_cabang);
      if (currentUser.role === 'ADM' || currentUser.role === 'KAPOS') {
        if (currentUser.kd_posko) {
          poskosInCabang = poskosInCabang.filter((p) => p.kd_posko === currentUser.kd_posko);
        }
      }

      const cabangRecords = records.filter(
        (r) => r.cabang_id === cabang.kd_cabang || (r as any).kd_cabang === cabang.kd_cabang
      );

      let submiss = 0;
      let accept = 0;
      let belumSelesai = 0;
      let holdDana = 0;

      cabangRecords.forEach((r) => {
        if (currentUser.kd_posko && (r.posko_id !== currentUser.kd_posko && (r as any).kd_posko !== currentUser.kd_posko)) {
          return;
        }
        if (r.status === 'ACCEPT') accept++;
        else if (r.status === 'BELUM SELESAI') belumSelesai++;
        else if (r.status === 'SUBMISS') submiss++;

        const sla = checkHoldDanaSla(r.tgl_cair, r.status);
        if (sla.isHoldDana) holdDana++;
      });

      const poskos: PoskoStat[] = poskosInCabang.map((p) => {
        const pRecs = cabangRecords.filter(
          (r) => r.posko_id === p.kd_posko || (r as any).kd_posko === p.kd_posko
        );
        let pSubmiss = 0;
        let pAccept = 0;
        let pBelum = 0;
        let pHold = 0;
        pRecs.forEach((r) => {
          if (r.status === 'ACCEPT') pAccept++;
          else if (r.status === 'BELUM SELESAI') pBelum++;
          else if (r.status === 'SUBMISS') pSubmiss++;

          const sla = checkHoldDanaSla(r.tgl_cair, r.status);
          if (sla.isHoldDana) pHold++;
        });
        return {
          posko_id: p.kd_posko,
          nama_posko: p.nama_posko,
          submiss: pSubmiss,
          accept: pAccept,
          belumSelesai: pBelum,
          holdDana: pHold,
          total: pRecs.length,
        };
      });

      return {
        cabang_id: cabang.kd_cabang,
        nama_cabang: cabang.nama_cabang,
        total_posko: poskosInCabang.length,
        submiss,
        accept,
        belumSelesai,
        holdDana,
        total: submiss + accept + belumSelesai,
        poskos,
      };
    });
  }, [records, allCabang, allPosko, isNationalAccess, currentUser]);

  // Aggregate Totals Keseluruhan
  const matrixTotals = useMemo(() => {
    return cabangRows.reduce(
      (acc, curr) => ({
        submiss: acc.submiss + curr.submiss,
        accept: acc.accept + curr.accept,
        belumSelesai: acc.belumSelesai + curr.belumSelesai,
        holdDana: acc.holdDana + curr.holdDana,
        total: acc.total + curr.total,
      }),
      { submiss: 0, accept: 0, belumSelesai: 0, holdDana: 0, total: 0 }
    );
  }, [cabangRows]);

  const acceptRate = kpiSummary.totalKonsumen > 0 
    ? Math.round((kpiSummary.totalAccept / kpiSummary.totalKonsumen) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Konsumen */}
        <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Total Pencairan</span>
            <div className="h-9 w-9 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-white">{kpiSummary.totalKonsumen}</div>
            <span className="text-[11px] text-[#8e96a8]">Konsumen</span>
          </div>
          <div className="mt-2 text-[11px] text-[#8e96a8] flex items-center space-x-1">
            <Percent className="h-3 w-3 text-emerald-400" />
            <span>Accept Rate: <strong className="text-emerald-400">{acceptRate}%</strong></span>
          </div>
        </div>

        {/* Accept (ADM_DE Verified) */}
        <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Total ACCEPT</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-emerald-400">{kpiSummary.totalAccept}</div>
            <span className="text-[11px] text-emerald-500 font-semibold">Tervalidasi ADM_DE</span>
          </div>
          <div className="mt-2 text-[11px] text-[#8e96a8]">
            Berkas lengkap &amp; proses clear
          </div>
        </div>

        {/* Belum Selesai (Pending) */}
        <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8e96a8]">Belum Selesai</span>
            <div className="h-9 w-9 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-amber-400">{kpiSummary.totalBelumSelesai}</div>
            <span className="text-[11px] text-amber-500 font-semibold">Perlu Revisi Cabang</span>
          </div>
          <div className="mt-2 text-[11px] text-[#8e96a8]">
            Menunggu kelengkapan dokumen cabang
          </div>
        </div>

        {/* Hold Dana (> 2 Hari Kerja) */}
        <div 
          onClick={onNavigateToHoldDana}
          className={`bg-[#141721] border border-rose-900/50 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all ${
            onNavigateToHoldDana ? 'cursor-pointer hover:border-rose-500/80 hover:bg-[#181a28] group' : ''
          }`}
        >
          {kpiSummary.totalHoldDana > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">HOLD DANA (&gt;2 HK)</span>
            <div className="h-9 w-9 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 group-hover:bg-rose-900/80 transition-colors">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-rose-400">{kpiSummary.totalHoldDana}</div>
            <span className={`text-[11px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 ${
              onNavigateToHoldDana ? 'group-hover:bg-rose-900 group-hover:text-white transition-colors' : ''
            }`}>
              {onNavigateToHoldDana ? 'Lihat Detail →' : 'Critical Alert'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-rose-300/80">
            Pencairan pending melebihi SLA 2 hari kerja {onNavigateToHoldDana && '(Klik untuk filter)'}
          </div>
        </div>
      </div>

      {/* Matriks Rekapitulasi - Langsung Per-Cabang untuk Akses Nasional */}
      <div className="bg-[#141721] border border-[#272d3e] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#232734] bg-[#181a24] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">
                {isNationalAccess 
                  ? 'Matriks Rekapitulasi Per-Cabang (Nasional)' 
                  : 'Matriks Rekapitulasi Cabang & Posko'}
              </h2>
              {isNationalAccess && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                  Per-Cabang Langsung
                </span>
              )}
            </div>
            <p className="text-xs text-[#8e96a8] mt-1">
              {isNationalAccess
                ? 'Data diagregasi langsung per-cabang untuk kemudahan monitoring & salin laporan WA Cabang. Klik cabang untuk melihat rincian posko.'
                : 'Monitoring distribusi pencairan, status validasi ADM_DE, dan peringatan Hold Dana wilayah Anda.'}
            </p>
          </div>

          {isNationalAccess && (
            <div className="flex items-center space-x-2 text-xs text-[#8e96a8]">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#10121a] border border-[#272d3e]">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                <span>{allCabang.length} Cabang Terdaftar</span>
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#272d3e] bg-[#10121a] text-[#8e96a8] font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Cabang</th>
                <th className="px-4 py-3 text-center">Posko</th>
                <th className="px-4 py-3 text-center">SUBMISS</th>
                <th className="px-4 py-3 text-center">ACCEPT</th>
                <th className="px-4 py-3 text-center">BELUM SELESAI</th>
                <th className="px-4 py-3 text-center text-rose-400 bg-rose-950/20">HOLD DANA</th>
                <th className="px-4 py-3 text-center">TOTAL</th>
                {canCopyWa && <th className="px-4 py-3 text-center">Laporan WA Cabang</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]">
              {cabangRows.length === 0 ? (
                <tr>
                  <td colSpan={canCopyWa ? 8 : 7} className="px-4 py-8 text-center text-[#8e96a8] italic">
                    Belum ada data pencairan yang tercatat.
                  </td>
                </tr>
              ) : (
                cabangRows.map((row) => {
                  const isExpanded = expandedCabangs.has(row.cabang_id);
                  const hasPoskos = row.poskos.length > 0;

                  return (
                    <React.Fragment key={row.cabang_id}>
                      {/* Baris Utama Cabang */}
                      <tr 
                        className={`hover:bg-[#181a24]/80 transition-colors ${
                          isExpanded ? 'bg-[#181a24]/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {hasPoskos && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(row.cabang_id)}
                                className="p-1 rounded hover:bg-[#272d3e] text-[#8e96a8] hover:text-white transition-colors cursor-pointer"
                                title={isExpanded ? 'Sembunyikan Rincian Posko' : 'Lihat Rincian Posko'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-purple-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                                <Building2 className="h-3.5 w-3.5 text-purple-400 inline shrink-0" />
                                <span>{row.nama_cabang}</span>
                              </span>
                              <span className="text-[10px] text-[#8e96a8] font-mono">
                                Kode: {row.cabang_id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.cabang_id)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#10121a] text-[#8e96a8] hover:text-white hover:border-[#3e4559] border border-[#272d3e] transition-colors cursor-pointer"
                            title="Klik untuk melihat/menutup daftar posko"
                          >
                            <span>{row.total_posko} Posko</span>
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 text-purple-400" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-blue-400">
                          {row.submiss}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">
                          {row.accept}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-amber-400">
                          {row.belumSelesai}
                        </td>
                        <td className="px-4 py-3 text-center font-black bg-rose-950/10">
                          {row.holdDana > 0 ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm animate-pulse">
                              <span>{row.holdDana}</span>
                            </span>
                          ) : (
                            <span className="text-[#8e96a8]/50">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-extrabold text-white">
                          {row.total}
                        </td>

                        {/* Fitur LAPOR WA CABANG: Eksklusif untuk Role Nasional */}
                        {canCopyWa && (
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onOpenCopyWaModal(row.cabang_id, row.nama_cabang)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-800/90 text-emerald-300 hover:text-white border border-emerald-700/70 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-emerald-900/30"
                              title={`Salin Laporan WhatsApp Cabang ${row.nama_cabang}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Copy WA Cabang</span>
                            </button>
                          </td>
                        )}
                      </tr>

                      {/* Baris Rincian Posko (Accordion Dropdown) */}
                      {isExpanded && row.poskos.length > 0 && (
                        <tr className="bg-[#10121a]/90">
                          <td colSpan={canCopyWa ? 8 : 7} className="px-6 py-3 border-l-2 border-purple-500">
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-purple-300 flex items-center space-x-1.5 mb-2">
                                <Layers className="h-3.5 w-3.5 text-purple-400" />
                                <span>Rincian Posko di Bawah Cabang {row.nama_cabang}:</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {row.poskos.map((posko) => (
                                  <div 
                                    key={posko.posko_id}
                                    className="p-2.5 bg-[#141721] border border-[#272d3e] rounded-xl flex flex-col justify-between"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-white text-xs">
                                        {posko.nama_posko}
                                      </span>
                                      <span className="text-[10px] font-mono text-[#8e96a8] bg-[#181a24] px-1.5 py-0.5 rounded">
                                        {posko.posko_id}
                                      </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-4 gap-1 text-[11px] text-center border-t border-[#1e2330] pt-1.5">
                                      <div>
                                        <div className="text-[9px] text-[#8e96a8]">SUBMISS</div>
                                        <div className="font-bold text-blue-400">{posko.submiss}</div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] text-[#8e96a8]">ACCEPT</div>
                                        <div className="font-bold text-emerald-400">{posko.accept}</div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] text-[#8e96a8]">BELUM</div>
                                        <div className="font-bold text-amber-400">{posko.belumSelesai}</div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] text-rose-400">HOLD</div>
                                        <div className={`font-bold ${posko.holdDana > 0 ? 'text-rose-400' : 'text-[#8e96a8]/50'}`}>
                                          {posko.holdDana}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-1 text-right text-[10px] text-[#8e96a8]">
                                      Total: <strong className="text-white">{posko.total}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {cabangRows.length > 0 && (
              <tfoot className="bg-[#10121a] font-bold border-t-2 border-[#272d3e]">
                <tr>
                  <td className="px-4 py-3.5 text-white uppercase tracking-wider font-extrabold">
                    TOTAL KESELURUHAN
                  </td>
                  <td className="px-4 py-3.5 text-center text-[#8e96a8] font-mono text-xs">
                    {allPosko.length} Posko
                  </td>
                  <td className="px-4 py-3.5 text-center text-blue-400 font-extrabold">
                    {matrixTotals.submiss}
                  </td>
                  <td className="px-4 py-3.5 text-center text-emerald-400 font-extrabold">
                    {matrixTotals.accept}
                  </td>
                  <td className="px-4 py-3.5 text-center text-amber-400 font-extrabold">
                    {matrixTotals.belumSelesai}
                  </td>
                  <td className="px-4 py-3.5 text-center text-rose-400 font-black bg-rose-950/20">
                    {matrixTotals.holdDana}
                  </td>
                  <td className="px-4 py-3.5 text-center text-white font-black text-sm">
                    {matrixTotals.total}
                  </td>
                  {canCopyWa && <td className="px-4 py-3.5 text-center">-</td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
