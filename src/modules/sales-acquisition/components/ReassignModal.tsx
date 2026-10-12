import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  UserCheck, 
  Building2, 
  AlertTriangle 
} from 'lucide-react';
import { SalesAcquisition } from '../types';
import { User, Cabang, Posko } from '../../../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  currentUser: User;
  allUsers: User[];
  allCabang: Cabang[];
  allPosko: Posko[];
  onSuccess: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  allUsers,
  allCabang,
  allPosko,
  onSuccess
}) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available AO users based on current user scope
  const availableAOs = useMemo(() => {
    return allUsers.filter(u => {
      if (u.status !== 'AKTIF') return false;
      if (u.role !== 'CMO' && u.role !== 'KAPOS') return false;
      if (u.id === record.assigned_user_id) return false; // don't show current assignee

      // Role Scope check
      if (currentUser.role === 'KAPOS' && currentUser.kd_posko) {
        return u.kd_posko === currentUser.kd_posko;
      }
      if (currentUser.role === 'KAOPS' || currentUser.role === 'KACAB') {
        return u.kd_cabang === currentUser.kd_cabang;
      }
      return true;
    });
  }, [allUsers, currentUser, record.assigned_user_id]);

  if (!isOpen) return null;

  const targetUser = allUsers.find(u => u.id === targetUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetUserId || !targetUser) {
      setErrorMessage('Pilih petugas AO baru untuk mutasi prospek!');
      return;
    }

    setIsSubmitting(true);

    const res = await SalesAcquisitionService.reassignLead(
      record.id,
      {
        new_assigned_user_id: targetUser.id,
        new_kd_ao: targetUser.kd_ao || '',
        new_kd_cabang: targetUser.kd_cabang || record.kd_cabang,
        new_kd_posko: targetUser.kd_posko || record.kd_posko
      },
      currentUser
    );

    setIsSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232734] bg-indigo-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-900/40">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Penugasan / Alihkan Petugas Survei (AO)</span>
              </h2>
              <p className="text-xs text-indigo-300/80">
                Tentukan atau alihkan penugasan survei prospek (Wewenang KAPOS, KACAB, RM, Super Admin)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Prospek Info */}
          <div className="p-3.5 bg-[#181c28] border border-[#2c3345] rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Nama Calon Konsumen:</span>
              <strong className="text-white font-medium text-sm">{record.nama_calon_konsumen}</strong>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Status Saat Ini:</span>
              <span className="font-mono text-blue-400 font-semibold">{record.status}</span>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>AO Saat Ini:</span>
              <span className="text-amber-300 font-bold">{record.kd_ao || '-'} (ID: {record.assigned_user_id})</span>
            </div>
          </div>

          {/* Select New AO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Pilih Petugas AO Penerima Baru <strong className="text-rose-400">*</strong></span>
            </label>
            <select
              required
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">-- Pilih Petugas AO / CMO --</option>
              {availableAOs.map((ao) => (
                <option key={ao.id} value={ao.id}>
                  {ao.nama} (KD AO: {ao.kd_ao || '-'} • Posko: {ao.kd_posko || '-'} • {ao.role})
                </option>
              ))}
            </select>
            {availableAOs.length === 0 && (
              <p className="text-xs text-amber-400">
                Tidak ada petugas AO lain yang memenuhi lingkup wilayah kerja Anda.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#2c3345] text-xs font-bold text-[#8e96a8] hover:text-white hover:bg-[#181c28] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetUserId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-indigo-950/50 transition-all flex items-center space-x-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Simpan Mutasi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
