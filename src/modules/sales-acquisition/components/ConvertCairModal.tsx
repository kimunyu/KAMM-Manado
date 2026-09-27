import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  FileCheck, 
  AlertTriangle,
  Building2,
  DollarSign
} from 'lucide-react';
import { SalesAcquisition } from '../types';
import { User } from '../../../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';

interface ConvertCairModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  currentUser: User;
  onSuccess: () => void;
}

export const ConvertCairModal: React.FC<ConvertCairModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSuccess
}) => {
  const [noPsb, setNoPsb] = useState('');
  const [tglCair, setTglCair] = useState(() => new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!noPsb.trim() || noPsb.trim().length < 3) {
      setErrorMessage('Nomor PSB resmi wajib diisi minimal 3 karakter!');
      return;
    }

    setIsSubmitting(true);

    const res = await SalesAcquisitionService.convertToCair(
      record.id,
      {
        no_psb: noPsb.trim().toUpperCase(),
        tgl_cair: tglCair,
        keterangan: keterangan.trim()
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
        <div className="px-6 py-4 border-b border-[#232734] bg-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/40">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Konversi ke Nasabah CAIR</span>
              </h2>
              <p className="text-xs text-emerald-300/80">
                Pencairan pinjaman &amp; bridging otomatis ke Kontrol Sales
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
          <div className="p-3.5 bg-[#181c28] border border-[#2c3345] rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Nama Calon Konsumen:</span>
              <strong className="text-white font-medium text-sm">{record.nama_calon_konsumen}</strong>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>No. Telepon / WA:</span>
              <span className="font-mono text-emerald-400 font-semibold">{record.no_telepon_clean}</span>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Petugas AO:</span>
              <span className="text-white">{record.kd_ao || '-'} • Cabang {record.kd_cabang} / Posko {record.kd_posko}</span>
            </div>
            <div className="flex justify-between items-center text-[#8e96a8]">
              <span>Sumber Lead:</span>
              <span className="text-blue-300 font-medium">{record.sumber_lead}</span>
            </div>
          </div>

          {/* Input Nomor PSB */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
              <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Nomor PSB Baru KAMM <strong className="text-rose-400">*</strong></span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={noPsb}
              onChange={(e) => setNoPsb(e.target.value.toUpperCase())}
              placeholder="Contoh: PSB-2025-0012"
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-[#5c6479] focus:outline-none focus:border-emerald-500 transition-colors uppercase"
            />
            <p className="text-[11px] text-[#8e96a8]">
              Nomor PSB ini akan menjadi Primary Key resmi pada modul Kontrol Sales.
            </p>
          </div>

          {/* Tanggal Pencairan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tanggal Realisasi Pencairan <strong className="text-rose-400">*</strong></span>
            </label>
            <input
              type="date"
              required
              value={tglCair}
              onChange={(e) => setTglCair(e.target.value)}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#e0e4eb]">
              Catatan Pencairan (Opsional)
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan tambahan pencairan..."
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5c6479] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Atomic Notice */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-[11px] text-emerald-300/90 leading-relaxed">
            <strong>Proses Atomik V14.2.3:</strong> Status prospek akan dikunci permanen menjadi <code>CAIR</code> dan record data baru akan otomatis dibuat di tabel <code>sales_control_records</code> untuk verifikasi ADM_DE.
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi CAIR'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
