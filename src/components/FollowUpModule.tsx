import React, { useState, useEffect } from 'react';
import { MediatorKontrak, FULog, HasilFU } from '../types';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { formatDateTimeIndo, formatDateIndo } from '../utils/dateUtils';
import { 
  PhoneCall, 
  Search, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  MessageSquare, 
  Eye, 
  Building2, 
  ExternalLink,
  Phone,
  User,
  History,
  X
} from 'lucide-react';

interface FollowUpModuleProps {
  mediators: MediatorKontrak[];
  preSelectedKdMed?: string | null;
  onFollowUpSuccess: () => void;
}

export const FollowUpModule: React.FC<FollowUpModuleProps> = ({
  mediators,
  preSelectedKdMed,
  onFollowUpSuccess,
}) => {
  const { currentUser } = useAuth();

  const isCMO = currentUser?.role === 'CMO';
  const isKAPOS = currentUser?.role === 'KAPOS';
  const userAo = currentUser?.kd_ao;
  const userPosko = currentUser?.kd_posko;
  const userCabang = currentUser?.kd_cabang;
  const isBranchRestricted = !isCMO && !isKAPOS && currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'RM' && !!userCabang;

  const accessibleMediators = React.useMemo(() => {
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

  // Search / Selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediator, setSelectedMediator] = useState<MediatorKontrak | null>(null);

  // Form State
  const [hasilFu, setHasilFu] = useState<HasilFU>('WA/Tlpn Aktif, ada respon');
  const [catatanFu, setCatatanFu] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Logs state
  const [last5Logs, setLast5Logs] = useState<FULog[]>([]);
  const [selectedLogDetail, setSelectedLogDetail] = useState<FULog | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<'last5' | 'mediatorHistory'>('last5');

  // Load last 5 logs on mount or after submit
  const refreshLogs = () => {
    setLast5Logs(DatabaseService.getLast5FULogs());
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  // Handle preselection if navigated from another screen
  useEffect(() => {
    if (preSelectedKdMed) {
      const found = accessibleMediators.find(m => m.kd_med === preSelectedKdMed || m.temp_id === preSelectedKdMed);
      if (found) {
        setSelectedMediator(found);
        setSearchQuery(found.nama_mediator);
      }
    } else if (!selectedMediator && accessibleMediators.length > 0) {
      // Default to first active mediator
      const firstActive = accessibleMediators.find(m => m.status === 'AKTIF') || accessibleMediators[0];
      setSelectedMediator(firstActive);
      setSearchQuery(firstActive.nama_mediator);
    }
  }, [preSelectedKdMed, accessibleMediators]);

  // Autocomplete matching mediators
  const matchedMediators = searchQuery.trim()
    ? accessibleMediators.filter(m => 
        m.nama_mediator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.kd_med.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.no_tlpn.includes(searchQuery)
      ).slice(0, 8)
    : [];

  const handleSelectMediator = (med: MediatorKontrak) => {
    setSelectedMediator(med);
    setSearchQuery(med.nama_mediator);
    setFeedback(null);
  };

  const handleSubmitFU = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMediator) {
      setFeedback({ type: 'error', message: 'Silakan pilih mediator terlebih dahulu!' });
      return;
    }

    if (!catatanFu.trim()) {
      setFeedback({ type: 'error', message: 'Catatan FU wajib diisi!' });
      return;
    }

    if (catatanFu.length > 100) {
      setFeedback({ type: 'error', message: 'Catatan FU melebihi batas maksimal 100 karakter!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = DatabaseService.submitFollowUp({
      kd_med: selectedMediator.kd_med,
      hasil_fu: hasilFu,
      catatan_fu: catatanFu.trim(),
      user_fu: currentUser?.nama || 'Petugas FU',
      kd_ao: currentUser?.kd_ao || selectedMediator.kd_ao,
      kd_posko: selectedMediator.kd_posko,
      kd_cabang: selectedMediator.kd_cabang
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setCatatanFu('');
      refreshLogs();
      onFollowUpSuccess();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // WhatsApp Link Helper
  const getCleanWaPhone = (phone?: string) => {
    if (!phone) return '';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  const mediatorLogs = selectedMediator 
    ? DatabaseService.getFULogsByMediator(selectedMediator.kd_med)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#232734]">
        <h1 className="text-xl font-bold text-[#f1f3f7] tracking-tight flex items-center space-x-2">
          <PhoneCall className="h-5 w-5 text-blue-400" />
          <span>Modul Follow-Up (FU) Mediator</span>
        </h1>
        <p className="text-xs text-[#8e96a8] mt-0.5">
          Pencarian mediator, input hasil kontak berkala, dan rekam riwayat 5 log follow-up terakhir
        </p>
      </div>

      {/* Main 2-Column Grid: Left Search & Details, Right Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Mediator Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mediator Search Card */}
          <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md">
            <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
              Cari & Pilih Mediator
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#6b7280]" />
              <input
                id="input-search-fu-mediator"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik Nama atau KD MED..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>

            {/* Suggestions list */}
            {searchQuery && matchedMediators.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-[#232734] rounded-xl divide-y divide-[#1f2330] bg-[#0d0e12] shadow-lg">
                {matchedMediators.map((med) => (
                  <button
                    key={med.kd_med || med.temp_id}
                    onClick={() => handleSelectMediator(med)}
                    className="w-full p-2.5 text-left text-xs hover:bg-[#181b24] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-[#f1f3f7]">{med.nama_mediator}</div>
                      <div className="text-[11px] text-[#8e96a8]">
                        {med.kd_med} | {med.kd_cabang}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      med.status === 'AKTIF' 
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' 
                        : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                    }`}>
                      {med.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SPECIFICATION COMPLIANT DETAILS DISPLAY: 
              [KD MED | NAMA MEDIATOR | NO TLPN/WA | KD AO | KD POSKO | KD CABANG] */}
          {selectedMediator ? (
            <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
                <span className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider">
                  Informasi Detail Mediator
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedMediator.status === 'AKTIF'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                    : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                }`}>
                  {selectedMediator.status}
                </span>
              </div>

              {/* Grid of the 6 required spec columns */}
              <div className="space-y-3 text-xs">
                {/* 1. KD MED */}
                <div className="flex items-center justify-between py-1 border-b border-[#1f2330]">
                  <span className="text-[#8e96a8] font-medium">KD MED:</span>
                  <span className="font-mono font-bold text-blue-300 bg-blue-950/70 px-2.5 py-0.5 rounded-lg border border-blue-800/60">
                    {selectedMediator.kd_med}
                  </span>
                </div>

                {/* 2. NAMA MEDIATOR */}
                <div className="flex items-center justify-between py-1 border-b border-[#1f2330]">
                  <span className="text-[#8e96a8] font-medium">NAMA MEDIATOR:</span>
                  <span className="font-bold text-[#f1f3f7] text-sm">
                    {selectedMediator.nama_mediator}
                  </span>
                </div>

                {/* 3. NO TLPN / WA */}
                <div className="flex items-center justify-between py-1 border-b border-[#1f2330]">
                  <span className="text-[#8e96a8] font-medium">NO TLPN / WA:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[#c2c7d0]">{selectedMediator.no_tlpn}</span>
                    {selectedMediator.no_tlpn && (
                      <a
                        href={`https://wa.me/${getCleanWaPhone(selectedMediator.no_tlpn)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60 transition-colors"
                        title="Buka WhatsApp Langsung"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 4. KD AO */}
                <div className="flex items-center justify-between py-1 border-b border-[#1f2330]">
                  <span className="text-[#8e96a8] font-medium">KD AO:</span>
                  <span className="font-semibold text-[#c2c7d0] bg-[#0d0e12] px-2.5 py-0.5 rounded-lg border border-[#272d3e]">
                    {selectedMediator.kd_ao || '-'}
                  </span>
                </div>

                {/* 5. KD POSKO */}
                <div className="flex items-center justify-between py-1 border-b border-[#1f2330]">
                  <span className="text-[#8e96a8] font-medium">KD POSKO:</span>
                  <span className="font-semibold text-[#c2c7d0]">
                    {selectedMediator.kd_posko || '-'}
                  </span>
                </div>

                {/* 6. KD CABANG */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#8e96a8] font-medium">KD CABANG:</span>
                  <span className="font-semibold text-[#c2c7d0]">
                    {selectedMediator.kd_cabang || '-'}
                  </span>
                </div>

                {/* Last FU info */}
                <div className="pt-2 mt-2 border-t border-[#1f2330] flex items-center justify-between text-[#8e96a8]">
                  <span>Tgl Terakhir FU:</span>
                  <span className="font-medium text-[#f1f3f7]">
                    {formatDateIndo(selectedMediator.tgl_akhir_fu)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#13151c] rounded-2xl border border-dashed border-[#232734] text-[#8e96a8] text-xs">
              <User className="h-8 w-8 mx-auto mb-2 text-[#6b7280]" />
              <span>Pilih mediator dari pencarian di atas untuk melihat detail lengkap.</span>
            </div>
          )}
        </div>

        {/* Right Column: FU Input Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-5 shadow-md">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#232734]">
              <h2 className="text-sm font-bold text-[#f1f3f7] uppercase tracking-wide flex items-center space-x-2">
                <Send className="h-4 w-4 text-blue-400" />
                <span>Form Input Follow-Up (FU)</span>
              </h2>
              <span className="text-xs text-[#8e96a8]">
                Petugas: <strong className="text-[#f1f3f7]">{currentUser?.nama}</strong> ({currentUser?.role})
              </span>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium mb-4 flex items-center space-x-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFU} className="space-y-4">
              {/* Mediator target indicator */}
              <div className="p-3 bg-[#0d0e12] rounded-xl border border-[#232734] flex items-center justify-between text-xs">
                <span className="text-[#8e96a8]">Target Mediator FU:</span>
                <span className="font-bold text-[#f1f3f7]">
                  {selectedMediator ? `${selectedMediator.nama_mediator} (${selectedMediator.kd_med})` : 'Belum dipilih'}
                </span>
              </div>

              {/* SPEC REQUIREMENT: Dropdown for hasil_fu (3 precise options) */}
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
                  1. Hasil Follow-Up (Hasil FU) <span className="text-rose-400">*</span>
                </label>
                <select
                  id="select-hasil-fu"
                  value={hasilFu}
                  onChange={(e) => setHasilFu(e.target.value as HasilFU)}
                  className="w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                  required
                >
                  <option value="WA/Tlpn Aktif, ada respon">
                    1. WA/Tlpn Aktif, ada respon
                  </option>
                  <option value="WA/Tlpn Aktif, tidak ada respon">
                    2. WA/Tlpn Aktif, tidak ada respon
                  </option>
                  <option value="WA/Tlpn Tidak Aktif">
                    3. WA/Tlpn Tidak Aktif
                  </option>
                </select>
                <p className="text-[11px] text-[#6b7280] mt-1">
                  Pilih kondisi komunikasi saat petugas menghubungi mediator.
                </p>
              </div>

              {/* SPEC REQUIREMENT: Text input for catatan_fu (strictly max 100 characters) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide">
                    2. Catatan Follow-Up (Catatan FU) <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      catatanFu.length > 90 ? 'text-amber-400' : 'text-[#6b7280]'
                    } ${catatanFu.length >= 100 ? 'text-rose-400 font-bold' : ''}`}
                  >
                    {catatanFu.length} / 100 Karakter
                  </span>
                </div>
                <textarea
                  id="textarea-catatan-fu"
                  rows={3}
                  maxLength={100}
                  value={catatanFu}
                  onChange={(e) => setCatatanFu(e.target.value)}
                  placeholder="Masukkan ringkasan komunikasi singkat (strictly max 100 karakter)..."
                  className="w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
                  required
                />
                <div className="flex items-center justify-between text-[11px] text-[#6b7280] mt-1">
                  <span>Maksimal 100 karakter sesuai spesifikasi teknis sistem.</span>
                  {catatanFu.length === 100 && (
                    <span className="text-rose-400 font-bold">Maksimal karakter tercapai</span>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  id="btn-submit-fu"
                  type="submit"
                  disabled={isSubmitting || !selectedMediator}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  <span>Simpan Log Follow-Up & Perbarui TGL Akhir FU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* SPEC REQUIREMENT: BOTTOM TABLE SHOWING LAST 5 FU LOGS SORTED BY NEWEST + 'LIHAT DETAIL' BUTTON */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden">
        <div className="p-4 border-b border-[#232734] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#f1f3f7] flex items-center space-x-2">
              <History className="h-4 w-4 text-blue-400" />
              <span>5 Log Follow-Up (FU) Terakhir</span>
            </h2>
            <p className="text-xs text-[#8e96a8]">
              Riwayat 5 aktivitas kontak mediator terbaru sistem terurut waktu terkini
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#8e96a8]">Total Log Sistem: {DatabaseService.getFULogs().length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                <th className="py-3 px-4">Waktu FU</th>
                <th className="py-3 px-4">KD MED</th>
                <th className="py-3 px-4">Nama Mediator</th>
                <th className="py-3 px-4">Hasil FU</th>
                <th className="py-3 px-4">Catatan FU (Max 100)</th>
                <th className="py-3 px-4">Petugas / AO</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2330] text-xs">
              {last5Logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8e96a8]">
                    Belum ada riwayat log Follow-Up.
                  </td>
                </tr>
              ) : (
                last5Logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-[#181b24] transition-colors">
                      {/* Waktu FU */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[#8e96a8]">
                        {formatDateTimeIndo(log.tgl_fu)}
                      </td>

                      {/* KD MED */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {log.kd_med}
                      </td>

                      {/* Nama Mediator */}
                      <td className="py-3 px-4 font-semibold text-[#f1f3f7]">
                        {log.nama_mediator}
                      </td>

                      {/* Hasil FU */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          log.hasil_fu.includes('ada respon') && !log.hasil_fu.includes('tidak ada respon')
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                            : log.hasil_fu.includes('tidak ada respon')
                            ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                            : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                        }`}>
                          {log.hasil_fu}
                        </span>
                      </td>

                      {/* Catatan FU */}
                      <td className="py-3 px-4 text-[#c2c7d0] max-w-xs truncate" title={log.catatan_fu}>
                        "{log.catatan_fu}"
                      </td>

                      {/* Petugas */}
                      <td className="py-3 px-4 text-[#c2c7d0]">
                        <span className="font-medium">{log.user_fu}</span>
                        <span className="text-[10px] text-[#6b7280] block">{log.kd_cabang} / {log.kd_ao}</span>
                      </td>

                      {/* SPEC REQUIREMENT: 'Lihat Detail' button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          id={`btn-detail-fu-${log.id}`}
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2.5 py-1 rounded-xl bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 border border-blue-800/60 text-xs font-semibold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Lihat Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL: LIHAT DETAIL LOG FU */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <h3 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
                <PhoneCall className="h-4 w-4 text-blue-400" />
                <span>Detail Catatan Follow-Up</span>
              </h3>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734]">
                <div>
                  <span className="text-[#6b7280] block">ID Log FU:</span>
                  <span className="font-mono font-bold text-[#e0e4eb]">{selectedLogDetail.id}</span>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Waktu Tercatat:</span>
                  <span className="font-medium text-[#e0e4eb]">{formatDateTimeIndo(selectedLogDetail.tgl_fu)}</span>
                </div>
                <div>
                  <span className="text-[#6b7280] block">KD MED:</span>
                  <span className="font-mono font-bold text-blue-400">{selectedLogDetail.kd_med}</span>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Nama Mediator:</span>
                  <span className="font-bold text-[#f1f3f7]">{selectedLogDetail.nama_mediator}</span>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Cabang / Posko:</span>
                  <span className="font-medium text-[#c2c7d0]">{selectedLogDetail.kd_cabang} / {selectedLogDetail.kd_posko}</span>
                </div>
                <div>
                  <span className="text-[#6b7280] block">Petugas FU (AO):</span>
                  <span className="font-medium text-[#c2c7d0]">{selectedLogDetail.user_fu} ({selectedLogDetail.kd_ao})</span>
                </div>
              </div>

              <div>
                <span className="text-[#8e96a8] font-bold uppercase tracking-wider block mb-1">Hasil Follow-Up:</span>
                <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-blue-950/70 text-blue-300 border border-blue-800/60">
                  {selectedLogDetail.hasil_fu}
                </span>
              </div>

              <div>
                <span className="text-[#8e96a8] font-bold uppercase tracking-wider block mb-1">Catatan Komunikasi:</span>
                <div className="p-3 bg-[#0d0e12] rounded-xl border border-[#232734] text-[#e0e4eb] text-xs italic leading-relaxed">
                  "{selectedLogDetail.catatan_fu}"
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
