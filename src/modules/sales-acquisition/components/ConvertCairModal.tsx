import React, { useState } from 'react';
import { SalesAcquisition } from '../types';
import { User } from '../../../types';
import { CheckCircle2, X, DollarSign, AlertTriangle } from 'lucide-react';

interface ConvertCairModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  currentUser: User;
  onConvertCair: (noPsbBaru: string, plafonCair: number, tglCair: string, notes?: string) => Promise<boolean>;
}

export const ConvertCairModal: React.FC<ConvertCairModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onConvertCair
}) => {
  const [noPsbBaru, setNoPsbBaru] = useState('');
  const [plafonCair, setPlafonCair] = useState<number>(record.plafon_disetujui || record.plafon_pengajuan || 10000000);
  const [tglCair, setTglCair] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!noPsbBaru.trim()) {
      setErrorMessage('Wajib memasukkan Nomor Kontrak / No. PSB Baru!');
      return;
    }

    if (plafonCair <= 0) {
      setErrorMessage('Nominal plafon cair harus lebih dari 0!');
      return;
    }

    setIsSubmitting(true);
    const success = await onConvertCair(noPsbBaru.trim().toUpperCase(), plafonCair, tglCair, notes.trim());
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMessage('Gagal memproses konversi pencairan!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#232734] bg-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Konversi Prospek Menjadi CAIR
              </h2>
              <p className="text-xs text-emerald-300/80">
                Pencatatan realisasi kredit konsumen baru
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

          <div className="p-3.5 bg-[#181c28] border border-[#2c3345] rounded-xl space-y-1">
            <div className="text-sm font-bold text-white">{record.nama_calon_konsumen}</div>
            <div className="text-[11px] text-[#8e96a8]">
              Jaminan: <strong className="text-white">{record.jenis_jaminan}</strong> • AO: <strong className="text-white">{record.kd_ao}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-white">Nomor Kontrak / No. PSB Baru <strong className="text-rose-400">*</strong></label>
            <input
              type="text"
              required
              value={noPsbBaru}
              onChange={(e) => setNoPsbBaru(e.target.value.toUpperCase())}
              placeholder="Contoh: PSB-2024-9988"
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-white">Plafon Realisasi (Rp)</label>
              <input
                type="number"
                required
                value={plafonCair}
                onChange={(e) => setPlafonCair(Number(e.target.value))}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-white">Tanggal Cair</label>
              <input
                type="date"
                required
                value={tglCair}
                onChange={(e) => setTglCair(e.target.value)}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-white">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan akad atau realisasi dana..."
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 resize-none"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSubmitting ? 'Memproses...' : 'Konfirmasi CAIR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
