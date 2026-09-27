import React, { useState } from 'react';
import { 
  X, 
  XCircle, 
  AlertTriangle, 
  FileText 
} from 'lucide-react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { User } from '../../../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';

interface TolakBatalModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  targetStatus: 'DITOLAK' | 'BATAL';
  currentUser: User;
  onSuccess: () => void;
}

export const TolakBatalModal: React.FC<TolakBatalModalProps> = ({
  isOpen,
  onClose,
  record,
  targetStatus,
  currentUser,
  onSuccess
}) => {
  const [alasan, setAlasan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDitolak = targetStatus === 'DITOLAK';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!alasan.trim() || alasan.trim().length < 5) {
      setErrorMessage(`Alasan ${isDitolak ? 'penolakan' : 'pembatalan'} wajib diisi minimal 5 karakter!`);
      return;
    }

    setIsSubmitting(true);

    const res = await SalesAcquisitionService.updateLeadStatus(
      record.id,
      targetStatus,
      alasan.trim(),
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
        <div className={`px-6 py-4 border-b border-[#232734] flex items-center justify-between ${
          isDitolak ? 'bg-rose-950/40' : 'bg-zinc-900/60'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl text-white shadow-md ${
              isDitolak ? 'bg-rose-600 shadow-rose-900/40' : 'bg-zinc-700 shadow-zinc-900/40'
            }`}>
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Konfirmasi {isDitolak ? 'Tolak Prospek' : 'Batalkan Prospek'}</span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Prospek akan dipindahkan ke status terminal {targetStatus}
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

          {/* Prospek Profile Box */}
          <div className="p-3.5 bg-[#181c28] border border-[#2c3345] rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Nama Calon Konsumen:</span>
              <strong className="text-white font-medium">{record.nama_calon_konsumen}</strong>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Status Saat Ini:</span>
              <span className="font-mono text-blue-400 font-semibold">{record.status}</span>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>AO Penanggung Jawab:</span>
              <span className="text-white">{record.kd_ao || '-'} • Posko {record.kd_posko}</span>
            </div>
          </div>

          {/* Input Alasan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
              <FileText className="h-3.5 w-3.5 text-rose-400" />
              <span>Alasan {isDitolak ? 'Penolakan' : 'Pembatalan'} <strong className="text-rose-400">*</strong></span>
            </label>
            <textarea
              required
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder={isDitolak ? 'Contoh: BI Checking macet, kapasitas angsuran tidak memadai...' : 'Contoh: Konsumen membatalkan permohonan karena unit motor dijual...'}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl p-3 text-xs text-white placeholder-[#5c6479] focus:outline-none focus:border-rose-500 resize-none"
            />
            <p className="text-[11px] text-[#8e96a8]">
              Catatan ini akan tersimpan permanen di riwayat audit prospek.
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-[11px] text-amber-300 leading-relaxed">
            <strong>Peringatan Terminal Freeze:</strong> Setelah prospek berstatus <code>{targetStatus}</code>, data tidak dapat diedit kembali secara operasional.
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#2c3345] text-xs font-bold text-[#8e96a8] hover:text-white hover:bg-[#181c28] transition-colors"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !alasan.trim()}
              className={`px-5 py-2.5 rounded-xl disabled:opacity-50 text-xs font-bold text-white shadow-lg transition-all flex items-center space-x-2 ${
                isDitolak ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50' : 'bg-zinc-700 hover:bg-zinc-600 shadow-zinc-950/50'
              }`}
            >
              <XCircle className="h-4 w-4" />
              <span>{isSubmitting ? 'Memproses...' : `Konfirmasi ${isDitolak ? 'Tolak' : 'Batal'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
