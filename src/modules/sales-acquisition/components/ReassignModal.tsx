import React, { useState, useMemo } from 'react';
import { SalesAcquisition } from '../types';
import { User } from '../../../types';
import { ArrowRightLeft, X, UserCheck, AlertTriangle } from 'lucide-react';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  allUsers: User[];
  currentUser: User;
  onReassign: (targetUserId: string, targetUserNama: string, newKdAo: string, notes?: string) => Promise<boolean>;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  record,
  allUsers,
  currentUser,
  onReassign
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableAOs = useMemo(() => {
    return allUsers.filter(u => {
      if (u.status !== 'AKTIF') return false;
      if (u.role !== 'CMO' && u.role !== 'KAPOS') return false;
      if (u.id === record.assigned_user_id) return false;
      return true;
    });
  }, [allUsers, record.assigned_user_id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUserId) {
      setErrorMessage('Pilih petugas AO baru penerima tugas!');
      return;
    }

    const target = allUsers.find(u => u.id === selectedUserId);
    if (!target) return;

    setIsSubmitting(true);
    const success = await onReassign(
      target.id,
      target.nama,
      target.kd_ao || record.kd_ao,
      notes.trim()
    );
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMessage('Gagal mengalihkan penugasan!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#232734] bg-indigo-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Penugasan / Alihkan Petugas Survei (AO)
              </h2>
              <p className="text-xs text-indigo-300/80">
                Tentukan atau alihkan penugasan survei prospek (Wewenang KAPOS, KACAB, RM, Super Admin)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8e96a8] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 bg-[#181c28] border border-[#2c3345] rounded-xl space-y-1.5">
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Calon Konsumen:</span>
              <strong className="text-white font-medium text-sm">{record.nama_calon_konsumen}</strong>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Status:</span>
              <span className="font-mono text-blue-400 font-semibold">{record.status}</span>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>AO Saat Ini:</span>
              <span className="text-amber-300 font-bold">{record.kd_ao || '-'} ({record.assigned_user_nama || record.assigned_user_id})</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-white flex items-center space-x-1.5">
              <UserCheck className="h-4 w-4 text-indigo-400" />
              <span>Pilih Petugas Survei / AO Baru <strong className="text-rose-400">*</strong></span>
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Pilih Petugas Lapangan --</option>
              {availableAOs.map(ao => (
                <option key={ao.id} value={ao.id}>
                  {ao.nama} (KD AO: {ao.kd_ao || '-'} • Posko: {ao.kd_posko})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-white">Alasan / Instruksi Pengalihan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Domisili konsumen lebih dekat dengan posko Tuminting..."
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2c3345] text-[#8e96a8] hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              {isSubmitting ? 'Mengalihkan...' : 'Alihkan Penugasan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
