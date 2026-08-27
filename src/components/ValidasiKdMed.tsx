import React, { useState } from 'react';
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
  X
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
  const { currentUser } = useAuth();

  const isKaopsOrSuperAdmin = currentUser?.role === 'KAOPS' || currentUser?.role === 'SUPER_ADMIN';
  const isAdm = currentUser?.role === 'ADM';

  // Filter pending mediators (filtered by branch if KAOPS/ADM is branch-restricted)
  const isBranchRestricted = currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'RM' && !!currentUser?.kd_cabang;
  const pendingMediators = mediators.filter(m => {
    if (m.status !== 'PENDING') return false;
    if (isBranchRestricted && m.kd_cabang !== currentUser?.kd_cabang) return false;
    return true;
  });

  // Modal State for Manual Input of KD MED
  const [selectedForActivation, setSelectedForActivation] = useState<MediatorKontrak | null>(null);
  const [manualKdMed, setManualKdMed] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenActivationModal = (med: MediatorKontrak) => {
    setSelectedForActivation(med);
    setManualKdMed('');
    setModalFeedback(null);
  };

  const handleConfirmActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForActivation) return;
    if (!manualKdMed.trim()) {
      setModalFeedback({ type: 'error', message: 'Kode Mediator (KD MED) wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setModalFeedback(null);

    const result = DatabaseService.validateAndActivateKdMed({
      targetTempOrCode: selectedForActivation.kd_med || selectedForActivation.temp_id || '',
      new_kd_med: manualKdMed.trim(),
      validated_by: currentUser?.nama || 'KAOPS / SUPER_ADMIN'
    });

    setIsSubmitting(false);

    if (result.success) {
      setModalFeedback({ type: 'success', message: result.message });
      onValidationSuccess();
      setTimeout(() => {
        setSelectedForActivation(null);
      }, 1200);
    } else {
      setModalFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#232734]">
        <h1 className="text-xl font-bold text-[#f1f3f7] tracking-tight flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          <span>Menu Validasi & Input KD MED</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 font-bold border border-amber-800/60">
            {pendingMediators.length} Pengajuan Pending
          </span>
        </h1>
        <p className="text-xs text-[#8e96a8] mt-0.5">
          Tinjau berkas pendaftaran mediator, perbaiki data jika ada ketidaksesuaian, dan input <strong className="text-[#f1f3f7]">KD MED</strong> manual untuk mengaktifkan mediator.
        </p>
      </div>

      {/* Role permission info banner */}
      <div className="p-4 rounded-2xl bg-[#13151c] border border-[#232734] text-xs text-[#c2c7d0] flex items-start space-x-3">
        <KeyRound className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[#f1f3f7]">Hak Akses Modul Validasi:</span>
          <p className="text-[#8e96a8]">
            • <strong className="text-[#e0e4eb]">ADM:</strong> Dapat meninjau dan mengoreksi (edit) data pendaftaran mediator yang diajukan oleh CMO, KAPOS, atau sesama ADM.<br />
            • <strong className="text-[#e0e4eb]">KAOPS & SUPER_ADMIN:</strong> Memiliki wewenang mengoreksi data dan melakukan <strong className="text-amber-400">input KD MED manual</strong> yang otomatis mengubah status dari <em className="text-amber-300">PENDING (Diajukan)</em> menjadi <strong className="text-emerald-400">AKTIF</strong>.
          </p>
        </div>
      </div>

      {/* Table of Pending Mediators */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden">
        <div className="p-4 border-b border-[#232734] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-[#f1f3f7] text-sm">Daftar Antrean Pengajuan Mediator (Status PENDING)</span>
          </div>
          <span className="text-xs text-[#8e96a8]">{pendingMediators.length} Mediator menunggu validasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                <th className="py-3.5 px-4">Kode Sementara</th>
                <th className="py-3.5 px-4">Nama Mediator</th>
                <th className="py-3.5 px-4">Kontak / WA</th>
                <th className="py-3.5 px-4">Cabang / Posko</th>
                <th className="py-3.5 px-4">Pendaftar (AO)</th>
                <th className="py-3.5 px-4">Tgl Pengajuan</th>
                <th className="py-3.5 px-4 text-right">Aksi Validasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2330] text-xs">
              {pendingMediators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8e96a8]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400" />
                      <p className="font-semibold text-[#f1f3f7]">Semua pengajuan telah divalidasi</p>
                      <p className="text-xs text-[#8e96a8]">Tidak ada mediator dengan status PENDING yang menunggu penetapan KD MED.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingMediators.map((med) => {
                  return (
                    <tr key={med.kd_med || med.temp_id} className="hover:bg-[#181b24] transition-colors">
                      {/* Kode Sementara */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-800/60">
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
                        <div className="text-[10px] text-[#6b7280]">{med.kd_posko}</div>
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
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit Button (Available to ADM, KAOPS, SUPER_ADMIN) */}
                          <button
                            id={`btn-edit-pending-${med.kd_med}`}
                            onClick={() => onEditMediator(med)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Edit / Koreksi Ketidaksesuaian Data"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#8e96a8]" />
                            <span>Koreksi</span>
                          </button>

                          {/* Input KD MED (Only KAOPS & SUPER_ADMIN) */}
                          {isKaopsOrSuperAdmin ? (
                            <button
                              id={`btn-activate-med-${med.kd_med}`}
                              onClick={() => handleOpenActivationModal(med)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Input KD MED Resmi & Aktivasi"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              <span>Input KD MED & Aktivasi</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#6b7280] italic px-2.5 py-1 bg-[#0d0e12] rounded-lg border border-[#232734]">
                              Menunggu KAOPS
                            </span>
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

      {/* ACTIVATION MODAL: INPUT KD MED MANUALLY */}
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
                  <p className="text-xs text-[#8e96a8]">Wewenang Khusus KAOPS & SUPER ADMIN</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForActivation(null)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{modalFeedback.message}</span>
              </div>
            )}

            {/* Target Mediator Review Box */}
            <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8e96a8]">Kode Pengajuan:</span>
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
                <span className="font-semibold text-[#c2c7d0]">{selectedForActivation.kd_cabang} / {selectedForActivation.kd_posko}</span>
              </div>
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
                  Harap ketik KD MED resmi sesuai penomoran registrasi cabang. Setelah disimpan, status mediator akan <strong className="text-emerald-400">otomatis berubah dari PENDING menjadi AKTIF</strong>.
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
