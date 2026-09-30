import React, { useState } from 'react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { X, AlertOctagon, XCircle } from 'lucide-react';

interface TolakBatalModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  actionType: 'DITOLAK' | 'BATAL';
  onSubmit: (reason: string) => Promise<boolean>;
}

export const TolakBatalModal: React.FC<TolakBatalModalProps> = ({
  isOpen,
  onClose,
  record,
  actionType,
  onSubmit
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    const ok = await onSubmit(reason.trim());
    setIsSubmitting(false);
    if (ok) onClose();
  };

  const isReject = actionType === 'DITOLAK';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className={`px-6 py-4 border-b border-[#232734] flex items-center justify-between ${isReject ? 'bg-rose-950/40 text-rose-400' : 'bg-amber-950/40 text-amber-400'}`}>
          <div className="flex items-center space-x-2">
            {isReject ? <AlertOctagon className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <h3 className="text-sm font-bold text-white">
              {isReject ? 'Tolak Pengajuan Prospek' : 'Batalkan Prospek Konsumen'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8e96a8] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-[#181c28] border border-[#2c3345] rounded-xl space-y-1">
            <div className="text-sm font-bold text-white">{record.nama_calon_konsumen}</div>
            <div className="text-[11px] text-[#8e96a8]">
              Jaminan: {record.jenis_jaminan} • Telp: {record.no_telepon}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-white">
              Alasan {isReject ? 'Penolakan' : 'Pembatalan'} <strong className="text-rose-400">*</strong>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isReject ? 'Contoh: BI Checking macet, kapasitas tidak memadai...' : 'Contoh: Konsumen membatalkan sepihak karena sudah dapat dana lain...'}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl p-3 text-white focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2c3345] text-[#8e96a8] hover:text-white"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-white font-bold ${isReject ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'}`}
            >
              {isSubmitting ? 'Memproses...' : (isReject ? 'Konfirmasi Tolak' : 'Konfirmasi Batal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
