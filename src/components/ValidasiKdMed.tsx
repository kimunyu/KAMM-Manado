import React, { useState, useMemo } from 'react';
import { MediatorKontrak } from '../types';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { formatDateIndo, formatDateTimeIndo } from '../utils/dateUtils';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  KeyRound, 
  Building2, 
  User, 
  Phone, 
  FileText,
  X,
  FileCheck2,
  XCircle,
  Search,
  Filter,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface ValidasiKdMedProps {
  mediators: MediatorKontrak[];
  onValidationSuccess: () => void;
  onNavigate: (tab: ActiveTab) => void;
  onEditMediator: (mediator: MediatorKontrak) => void;
}

export const ValidasiKdMed: React.FC<ValidasiKdMedProps> = ({
  mediators,
  onValidationSuccess,
  onNavigate,
  onEditMediator
}) => {
  const { currentUser, canReviewMediator, canInputKdMed, canEditMediator } = useAuth();

  const isNational = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'RM';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isKapos = currentUser?.role === 'KAPOS';
  const isAdm = currentUser?.role === 'ADM';
  const userCabang = currentUser?.kd_cabang;
  const userPosko = currentUser?.kd_posko;
  const isBranchRestricted = !isNational && !!userCabang;
  const isPoskoRestricted = !isNational && !!userPosko;

  // Sub-tabs: 'review' (BELUM_AKTIF) vs 'activation' (PENDING)
  const [activeStage, setActiveStage] = useState<'review' | 'activation'>(
    isKapos && !isAdm && !isSuperAdmin ? 'activation' : 'review'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [cabangFilter, setCabangFilter] = useState('ALL');
  const [poskoFilter, setPoskoFilter] = useState('ALL');

  // Modal State for Review (BELUM_AKTIF -> PENDING)
  const [selectedForReview, setSelectedForReview] = useState<MediatorKontrak | null>(null);
  const [reviewCatatan, setReviewCatatan] = useState('');

  // Modal State for Reject (BELUM_AKTIF / PENDING -> DITOLAK)
  const [selectedForReject, setSelectedForReject] = useState<MediatorKontrak | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal State for Input KD MED (PENDING -> AKTIF)
  const [selectedForActivation, setSelectedForActivation] = useState<MediatorKontrak | null>(null);
  const [manualKdMed, setManualKdMed] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scoped territory filtering
  const territoryMediators = useMemo(() => {
    return mediators.filter(m => {
      if (isNational) return true;
      if (currentUser?.kd_posko && m.kd_posko?.trim().toUpperCase() !== currentUser.kd_posko.trim().toUpperCase()) {
        return false;
      }
      if (currentUser?.kd_cabang && m.kd_cabang?.trim().toUpperCase() !== currentUser.kd_cabang.trim().toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [mediators, isNational, currentUser?.kd_posko, currentUser?.kd_cabang]);

  // Stage 1: BELUM_AKTIF (Need Admin Review)
  const belumAktifList = useMemo(() => {
    return territoryMediators.filter(m => m.status === 'BELUM_AKTIF');
  }, [territoryMediators]);

  // Stage 2: PENDING (Need Kapos / Super Admin KD MED)
  const pendingList = useMemo(() => {
    return territoryMediators.filter(m => m.status === 'PENDING');
  }, [territoryMediators]);

  // Unique cabangs in active stage
  const cabangList = useMemo(() => {
    const set = new Set<string>();
    const list = activeStage === 'review' ? belumAktifList : pendingList;
    list.forEach(m => {
      if (m.kd_cabang) set.add(m.kd_cabang);
    });
    return Array.from(set).sort();
  }, [belumAktifList, pendingList, activeStage]);

  // Cascading posko list: only enabled/populated if Cabang is selected or branch restricted
  const isPoskoSelectionAllowed = isBranchRestricted || cabangFilter !== 'ALL';
  const effectiveCabang = isBranchRestricted && userCabang ? userCabang : cabangFilter;

  const poskoList = useMemo(() => {
    if (!isPoskoSelectionAllowed || effectiveCabang === 'ALL') {
      return [];
    }
    const set = new Set<string>();
    const list = activeStage === 'review' ? belumAktifList : pendingList;
    list.forEach(m => {
      if (m.kd_cabang && m.kd_cabang.toUpperCase() === effectiveCabang.toUpperCase()) {
        if (m.kd_posko) set.add(m.kd_posko);
      }
    });
    return Array.from(set).sort();
  }, [belumAktifList, pendingList, activeStage, effectiveCabang, isPoskoSelectionAllowed]);

  // Filtered list based on search, cabang, and posko filter
  const currentList = useMemo(() => {
    const list = activeStage === 'review' ? belumAktifList : pendingList;
    return list.filter(m => {
      if (isNational && cabangFilter !== 'ALL' && m.kd_cabang?.toUpperCase() !== cabangFilter.toUpperCase()) {
        return false;
      }
      if (!isPoskoRestricted && poskoFilter !== 'ALL' && m.kd_posko?.toUpperCase() !== poskoFilter.toUpperCase()) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = m.kd_med?.toLowerCase().includes(term);
        const matchName = m.nama_mediator?.toLowerCase().includes(term);
        const matchPhone = m.no_tlpn?.toLowerCase().includes(term);
        const matchAo = m.kd_ao?.toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchPhone && !matchAo) return false;
      }
      return true;
    });
  }, [activeStage, belumAktifList, pendingList, isNational, cabangFilter, isPoskoRestricted, poskoFilter, searchTerm]);

  // Handlers
  const handleOpenReviewModal = (med: MediatorKontrak) => {
    setSelectedForReview(med);
    setReviewCatatan(med.catatan_admin || '');
    setFeedback(null);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForReview) return;

    setIsSubmitting(true);
    setFeedback(null);

    const result = await DatabaseService.reviewAndApproveToPending({
      targetTempOrCode: selectedForReview.kd_med || selectedForReview.temp_id || '',
      reviewed_by: currentUser?.nama || 'ADMIN',
      catatan_admin: reviewCatatan.trim()
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      onValidationSuccess();
      setTimeout(() => {
        setSelectedForReview(null);
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleOpenRejectModal = (med: MediatorKontrak) => {
    setSelectedForReject(med);
    setRejectReason('');
    setFeedback(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForReject) return;
    if (!rejectReason.trim()) {
      setFeedback({ type: 'error', message: 'Alasan penolakan wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await DatabaseService.rejectMediator({
      targetTempOrCode: selectedForReject.kd_med || selectedForReject.temp_id || '',
      rejected_by: currentUser?.nama || 'ADMIN / KAPOS',
      alasan: rejectReason.trim()
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      onValidationSuccess();
      setTimeout(() => {
        setSelectedForReject(null);
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handleOpenActivationModal = (med: MediatorKontrak) => {
    setSelectedForActivation(med);
    setManualKdMed('');
    setFeedback(null);
  };

  const handleConfirmActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForActivation) return;
    if (!manualKdMed.trim()) {
      setFeedback({ type: 'error', message: 'Kode Mediator (KD MED) resmi wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await DatabaseService.validateAndActivateKdMed({
      targetTempOrCode: selectedForActivation.kd_med || selectedForActivation.temp_id || '',
      new_kd_med: manualKdMed.trim(),
      validated_by: currentUser?.nama || 'KAPOS / SUPER_ADMIN'
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      onValidationSuccess();
      setTimeout(() => {
        setSelectedForActivation(null);
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#232734]">
        <h1 className="text-xl font-bold text-[#f1f3f7] tracking-tight flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5 text-blue-400" />
          <span>Alur Peninjauan & Validasi KD MED</span>
        </h1>
        <p className="text-xs text-[#8e96a8] mt-0.5">
          Proses verifikasi 2 tahap: Peninjauan berkas oleh <strong className="text-[#f1f3f7]">ADMIN</strong> &rarr; Penetapan KD MED resmi oleh <strong className="text-[#f1f3f7]">KAPOS / Super Admin</strong>.
        </p>
      </div>

      {/* Workflow Step Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1 Card */}
        <button
          type="button"
          onClick={() => {
            setActiveStage('review');
            setPoskoFilter('ALL');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeStage === 'review'
              ? 'bg-[#181d2c] border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
              : 'bg-[#13151c] border-[#232734] hover:border-[#333a4d]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <span className="font-bold text-sm text-[#f1f3f7]">
                Tahap 1: Peninjauan Berkas
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 font-bold border border-blue-800/60">
              {belumAktifList.length} Belum Aktif
            </span>
          </div>
          <p className="text-xs text-[#8e96a8] leading-relaxed">
            Pendaftaran awal dari CMO/KAPOS/ADM. <strong className="text-blue-300">ADMIN</strong> meninjau kelengkapan & menyetujui menjadi status <strong className="text-amber-400">PENDING</strong>.
          </p>
          {canReviewMediator && (
            <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
              Anda memiliki hak peninjauan (ADMIN)
            </span>
          )}
        </button>

        {/* Step 2 Card */}
        <button
          type="button"
          onClick={() => {
            setActiveStage('activation');
            setPoskoFilter('ALL');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeStage === 'activation'
              ? 'bg-[#181d2c] border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
              : 'bg-[#13151c] border-[#232734] hover:border-[#333a4d]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="h-6 w-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <span className="font-bold text-sm text-[#f1f3f7]">
                Tahap 2: Input KD MED & Aktivasi
              </span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 font-bold border border-amber-800/60">
              {pendingList.length} Pending
            </span>
          </div>
          <p className="text-xs text-[#8e96a8] leading-relaxed">
            Berkas lolos review. <strong className="text-amber-300">KAPOS & Super Admin</strong> menetapkan KD MED resmi untuk mengaktifkan mediator menjadi <strong className="text-emerald-400">AKTIF</strong>.
          </p>
          {canInputKdMed && (
            <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
              Anda memiliki hak aktivasi KD MED (KAPOS / SUPER ADMIN)
            </span>
          )}
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && !selectedForReview && !selectedForReject && !selectedForActivation && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium space-y-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
              : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="font-bold">{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#6b7280]" />
          <input
            type="text"
            placeholder="Cari Kode Sementara, Nama Mediator, No HP, Posko, AO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Cabang Filter (Step 1 for National Users) */}
        {!isBranchRestricted && cabangList.length > 0 && (
          <div className="w-full md:w-48">
            <select
              value={cabangFilter}
              onChange={(e) => {
                setCabangFilter(e.target.value);
                setPoskoFilter('ALL');
              }}
              className="w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="ALL">Semua Cabang ({cabangList.length})</option>
              {cabangList.map(cab => (
                <option key={cab} value={cab}>{cab}</option>
              ))}
            </select>
          </div>
        )}

        {/* Posko Filter (Step 2: Cascading after Cabang) */}
        {!isPoskoRestricted && (
          <div className="w-full md:w-52">
            <select
              value={poskoFilter}
              disabled={!isPoskoSelectionAllowed}
              onChange={(e) => setPoskoFilter(e.target.value)}
              className={`w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                !isPoskoSelectionAllowed ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {!isPoskoSelectionAllowed ? (
                <option value="ALL">-- Pilih Cabang Dahulu --</option>
              ) : (
                <>
                  <option value="ALL">
                    {effectiveCabang !== 'ALL' ? `Semua Posko (${effectiveCabang})` : 'Semua Posko'}
                  </option>
                  {poskoList.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Main Table for Active Stage */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden">
        <div className="p-4 border-b border-[#232734] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activeStage === 'review' ? (
              <FileCheck2 className="h-4 w-4 text-blue-400" />
            ) : (
              <KeyRound className="h-4 w-4 text-amber-400" />
            )}
            <span className="font-bold text-[#f1f3f7] text-sm">
              {activeStage === 'review'
                ? 'Daftar Pendaftaran Baru (BELUM AKTIF) - Menunggu Peninjauan Admin'
                : 'Daftar Lolos Review (PENDING) - Menunggu Input KD MED oleh KAPOS / Super Admin'}
            </span>
          </div>
          <span className="text-xs text-[#8e96a8] font-mono">
            {currentList.length} Mediator
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                <th className="py-3.5 px-4">Kode Pendaftaran</th>
                <th className="py-3.5 px-4">Nama Mediator</th>
                <th className="py-3.5 px-4">Kontak / WA</th>
                <th className="py-3.5 px-4">Cabang / Posko</th>
                <th className="py-3.5 px-4">Pendaftar (AO)</th>
                <th className="py-3.5 px-4">Tgl Pengajuan</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2330] text-xs">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8e96a8]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400" />
                      <p className="font-semibold text-[#f1f3f7]">
                        {activeStage === 'review'
                          ? 'Tidak ada berkas BELUM AKTIF yang menunggu review'
                          : 'Tidak ada mediator PENDING yang menunggu penetapan KD MED'}
                      </p>
                      <p className="text-xs text-[#8e96a8]">
                        Semua data telah diproses sesuai alur kerja.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((med) => {
                  return (
                    <tr key={med.kd_med || med.temp_id} className="hover:bg-[#181b24] transition-colors">
                      {/* Kode Pendaftaran */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs ${
                          med.status === 'BELUM_AKTIF'
                            ? 'bg-blue-950/70 text-blue-300 border border-blue-800/60'
                            : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                        }`}>
                          {med.kd_med}
                        </span>
                      </td>

                      {/* Nama */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#f1f3f7]">{med.nama_mediator}</div>
                        {med.catatan_admin && (
                          <div className="text-[11px] text-[#8e96a8] truncate max-w-xs italic mt-0.5">
                            "{med.catatan_admin}"
                          </div>
                        )}
                      </td>

                      {/* Kontak */}
                      <td className="py-3.5 px-4 text-[#c2c7d0] font-medium">
                        {med.no_tlpn}
                      </td>

                      {/* Cabang & Posko */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#f1f3f7]">{med.kd_cabang}</div>
                        <div className="text-[10px] text-[#6b7280]">{med.kd_posko || 'Bebas Posko'}</div>
                      </td>

                      {/* Pendaftar */}
                      <td className="py-3.5 px-4 text-[#c2c7d0]">
                        <span className="font-medium">{med.created_by_user || '-'}</span>
                        <span className="text-[10px] text-[#6b7280] block">Role: {med.created_by_role || '-'} (AO: {med.kd_ao})</span>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-[#8e96a8]">
                        {formatDateIndo(med.created_at)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Koreksi Data (Edit) */}
                          {canEditMediator(med.status) && (
                            <button
                              id={`btn-koreksi-${med.kd_med}`}
                              onClick={() => onEditMediator(med)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Koreksi Data Mediator"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                              <span>Koreksi</span>
                            </button>
                          )}

                          {activeStage === 'review' ? (
                            <>
                              {/* Tolak Button */}
                              {canReviewMediator && (
                                <button
                                  id={`btn-reject-${med.kd_med}`}
                                  onClick={() => handleOpenRejectModal(med)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="Tolak Pendaftaran"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Tolak</span>
                                </button>
                              )}

                              {/* Review & Approve Button (Admin) */}
                              {canReviewMediator ? (
                                <button
                                  id={`btn-review-${med.kd_med}`}
                                  onClick={() => handleOpenReviewModal(med)}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-950/40 transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="Setujui Berkas & Teruskan ke KAPOS (Status PENDING)"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Tinjau & Setujui</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-[#6b7280] italic px-2.5 py-1 bg-[#0d0e12] rounded-lg border border-[#232734]">
                                  Menunggu Admin
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Input KD MED & Aktivasi (KAPOS & Super Admin) */}
                              {canInputKdMed ? (
                                <button
                                  id={`btn-activate-med-${med.kd_med}`}
                                  onClick={() => handleOpenActivationModal(med)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors flex items-center space-x-1 cursor-pointer"
                                  title="Input KD MED Resmi & Aktifkan Mediator"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                  <span>Input KD MED & Aktifkan</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-[#6b7280] italic px-2.5 py-1 bg-[#0d0e12] rounded-lg border border-[#232734]">
                                  Menunggu KAPOS / Super Admin
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TAHAP 1 - PENINJAUAN OLEH ADMIN (BELUM_AKTIF -> PENDING) */}
      {selectedForReview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-800/60 text-blue-400">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f3f7]">
                    Peninjauan Berkas Pendaftaran
                  </h3>
                  <p className="text-xs text-[#8e96a8]">Wewenang Admin: Menyetujui ke Status PENDING</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForReview(null)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
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

            {/* Target Mediator Review Box */}
            <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Kode Registrasi:</span>
                <span className="font-mono font-bold text-blue-300">{selectedForReview.kd_med}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Nama Mediator:</span>
                <span className="font-bold text-[#f1f3f7]">{selectedForReview.nama_mediator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">No. Telepon / WA:</span>
                <span className="font-semibold text-[#c2c7d0]">{selectedForReview.no_tlpn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Cabang / Posko:</span>
                <span className="font-semibold text-[#c2c7d0]">{selectedForReview.kd_cabang} / {selectedForReview.kd_posko || 'Bebas Posko'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Pendaftar (AO):</span>
                <span className="font-semibold text-[#c2c7d0]">{selectedForReview.created_by_user} ({selectedForReview.kd_ao})</span>
              </div>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
                  Catatan Hasil Peninjauan Berkas (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={reviewCatatan}
                  onChange={(e) => setReviewCatatan(e.target.value)}
                  placeholder="Contoh: Berkas identitas lengkap dan terverifikasi valid."
                  className="w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-[#e0e4eb] resize-none"
                />
                <p className="text-[11px] text-[#8e96a8] mt-1.5 leading-relaxed">
                  Setelah disetujui, status akan berubah dari <strong className="text-blue-300">BELUM AKTIF</strong> menjadi <strong className="text-amber-400">PENDING</strong> dan diteruskan ke KAPOS / Super Admin untuk penetapan KD MED.
                </p>
              </div>

              <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedForReview(null)}
                  className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-review-pending"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>Setujui Berkas (Jadikan PENDING)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TOLAK PENDAFTARAN */}
      {selectedForReject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-800/60 text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f3f7]">
                    Tolak Pengajuan Mediator
                  </h3>
                  <p className="text-xs text-[#8e96a8]">Kode: {selectedForReject.kd_med}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForReject(null)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {feedback && (
              <div className="p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border bg-rose-950/60 text-rose-200 border-rose-800/70">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
                  Alasan Penolakan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Sebutkan alasan penolakan berkas (misal: nomor kontak tidak aktif, nama ganda, dll)..."
                  className="w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-[#e0e4eb] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedForReject(null)}
                  className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-reject"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-950/40 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Konfirmasi Tolak</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAHAP 2 - INPUT KD MED & AKTIVASI (PENDING -> AKTIF) */}
      {selectedForActivation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f3f7]">
                    Input KD MED & Aktivasi Mediator
                  </h3>
                  <p className="text-xs text-[#8e96a8]">Wewenang Khusus: KAPOS & SUPER ADMIN</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForActivation(null)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
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

            {/* Target Mediator Review Box */}
            <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Kode Pending:</span>
                <span className="font-mono font-bold text-amber-300">{selectedForActivation.kd_med}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Nama Mediator:</span>
                <span className="font-bold text-[#f1f3f7]">{selectedForActivation.nama_mediator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">No. Telepon / WA:</span>
                <span className="font-semibold text-[#c2c7d0]">{selectedForActivation.no_tlpn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Cabang & Posko:</span>
                <span className="font-semibold text-[#c2c7d0]">{selectedForActivation.kd_cabang} / {selectedForActivation.kd_posko || 'Bebas Posko'}</span>
              </div>
              {selectedForActivation.reviewed_by && (
                <div className="flex justify-between text-[11px] text-blue-300 pt-1 border-t border-[#1f2330]">
                  <span>Ditinjau oleh:</span>
                  <span>{selectedForActivation.reviewed_by}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmActivation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
                  Kode Mediator Baru (KD MED Resmi) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-manual-kd-med"
                  type="text"
                  required
                  value={manualKdMed}
                  onChange={(e) => setManualKdMed(e.target.value.toUpperCase())}
                  placeholder="Ketik KD MED resmi (contoh: MED-001, MED-JKT-001)"
                  className="w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono font-bold text-emerald-400 uppercase"
                />
                <p className="text-[11px] text-[#8e96a8] mt-1.5 leading-relaxed">
                  Ketik KD MED resmi. Setelah disimpan, mediator otomatis menjadi <strong className="text-emerald-400">AKTIF</strong> dan siap menerima follow-up (FU) serta monitoring.
                </p>
              </div>

              <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedForActivation(null)}
                  className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-confirm-activate-kd-med"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-950/40 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Tetapkan KD MED & Aktifkan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
