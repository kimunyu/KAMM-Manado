import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  FileCheck, 
  AlertTriangle, 
  Building2, 
  DollarSign,
  ShieldCheck,
  Lock,
  Link as LinkIcon,
  Send
} from 'lucide-react';
import { SalesAcquisition } from '../types';
import { User } from '../../../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';
import { SalesService } from '../../kontrol-sales/services/salesService';
import { SalesControlRecord } from '../../kontrol-sales/types';
import { ModalValidasiCairPsb } from './ModalValidasiCairPsb';

interface ConvertCairModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  currentUser: User;
  onSuccess: (msg?: string) => void;
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
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  // Ambil semua records Kontrol Sales untuk deteksi instan saat pengetikan No PSB
  const allSalesControl = useMemo(() => {
    return SalesService.getRecords();
  }, []);

  const cleanInputPsb = useMemo(() => {
    return noPsb.trim().toUpperCase();
  }, [noPsb]);

  // Cek apakah No PSB sudah terdaftar di Kontrol Sales
  const matchedControlRecord = useMemo<SalesControlRecord | null>(() => {
    if (!cleanInputPsb || cleanInputPsb.length < 3) return null;
    return allSalesControl.find(r => r.no_psb.trim().toUpperCase() === cleanInputPsb) || null;
  }, [allSalesControl, cleanInputPsb]);

  const isKaopsOrSuperAdmin = currentUser.role === 'KAOPS' || currentUser.role === 'SUPER_ADMIN';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!cleanInputPsb || cleanInputPsb.length < 3) {
      setErrorMessage('Nomor PSB resmi wajib diisi minimal 3 karakter!');
      return;
    }

    // SKENARIO 1: No PSB sudah ada di Kontrol Sales dan User BUKAN KAOPS/Super Admin
    if (matchedControlRecord && !isKaopsOrSuperAdmin) {
      setIsSubmitting(true);
      const res = await SalesAcquisitionService.requestCairValidation(
        record.id,
        {
          no_psb: cleanInputPsb,
          tgl_cair: tglCair,
          keterangan: keterangan.trim(),
          matched_control_id: matchedControlRecord.id
        },
        currentUser
      );
      setIsSubmitting(false);

      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
      return;
    }

    // SKENARIO 2: No PSB sudah ada di Kontrol Sales dan User ADALAH KAOPS/Super Admin
    if (matchedControlRecord && isKaopsOrSuperAdmin) {
      // Buka modal komparasi dua sisi untuk pengesahan resmi
      setIsValidationModalOpen(true);
      return;
    }

    // SKENARIO 3: No PSB baru (belum ada di Kontrol Sales)
    setIsSubmitting(true);

    const res = await SalesAcquisitionService.convertToCair(
      record.id,
      {
        no_psb: cleanInputPsb,
        tgl_cair: tglCair,
        keterangan: keterangan.trim()
      },
      currentUser
    );

    setIsSubmitting(false);

    if (res.success) {
      onSuccess(res.message);
      onClose();
    } else {
      if (res.requireValidation && res.matchedControlRecord) {
        // Jika backend mendeteksi bentrok yang belum tercache
        setErrorMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  return (
    <>
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
                  Pencairan resmi &amp; integrasi terlindungi ke Kontrol Sales
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
                <span>Petugas AO / Posko:</span>
                <span className="text-white">{record.kd_ao || '-'} • Posko {record.kd_posko} (Cabang {record.kd_cabang})</span>
              </div>
              <div className="flex justify-between items-center text-[#8e96a8]">
                <span>Jenis Jaminan &amp; Sumber:</span>
                <span className="text-blue-300 font-medium">{record.jenis_jaminan || 'R2'} • {record.sumber_lead}</span>
              </div>
            </div>

            {/* Input Nomor PSB */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#e0e4eb] flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Nomor PSB Resmi KAMM <strong className="text-rose-400">*</strong></span>
                </span>
                {matchedControlRecord && (
                  <span className="text-[10px] font-semibold text-amber-400 flex items-center space-x-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Terdaftar di Kontrol Sales</span>
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                autoFocus
                value={noPsb}
                onChange={(e) => setNoPsb(e.target.value)}
                placeholder="Contoh: 12345678"
                className={`w-full bg-[#181c28] border rounded-xl px-3.5 py-2.5 text-sm font-mono placeholder-[#5c6479] focus:outline-none transition-colors uppercase ${
                  matchedControlRecord 
                    ? 'border-amber-500/80 text-amber-200 focus:border-amber-400' 
                    : 'border-[#2c3345] text-white focus:border-emerald-500'
                }`}
              />

              {/* Status Detection Panel */}
              {matchedControlRecord ? (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1.5 text-xs text-amber-200 animate-in fade-in">
                  <div className="font-semibold flex items-center space-x-1.5 text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>No. PSB Sudah Diinput Terlebih Dahulu di Kontrol Sales</span>
                  </div>
                  <div className="text-[11px] text-amber-200/90 leading-relaxed pl-5">
                    Konsumen: <strong>{matchedControlRecord.nama_konsumen}</strong> ({matchedControlRecord.cabang_id} - Posko {matchedControlRecord.posko_id}) • Status: <strong>{matchedControlRecord.status}</strong>
                  </div>
                  <div className="text-[11px] text-[#8e96a8] pl-5">
                    {isKaopsOrSuperAdmin ? (
                      <span className="text-emerald-300">
                        Sebagai <strong>{currentUser.role}</strong>, Anda dapat meninjau komparasi data dan mengesahkan penautan tanpa menimpa data pencairan asli.
                      </span>
                    ) : (
                      <span>
                        Kontrol Sales memegang hak tertinggi. Data tidak boleh tertimpa. Pengajuan akan dikirimkan ke <strong>KAOPS / Super Admin</strong> untuk divalidasi.
                      </span>
                    )}
                  </div>
                </div>
              ) : cleanInputPsb.length >= 3 ? (
                <p className="text-[11px] text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Nomor PSB baru (akan didaftarkan otomatis ke Kontrol Sales).</span>
                </p>
              ) : (
                <p className="text-[11px] text-[#8e96a8]">
                  Nomor PSB resmi 8 digit sesuai tanda bukti pencairan kas/operasional.
                </p>
              )}
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

            {/* Protection Notice */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl text-[11px] text-emerald-300/80 leading-relaxed flex items-start space-x-2">
              <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Perlindungan Integritas Data:</strong> Sistem menjamin data pencairan di Kontrol Sales tidak akan tertimpa atau terhapus, dan seluruh data profil prospek tetap terjaga utuh.
              </span>
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

              {matchedControlRecord && !isKaopsOrSuperAdmin ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-amber-950/50 transition-all flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Mengirim...' : 'Ajukan Validasi ke KAOPS'}</span>
                </button>
              ) : matchedControlRecord && isKaopsOrSuperAdmin ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-950/50 transition-all flex items-center space-x-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Tinjau &amp; Validasi Kecocokan</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center space-x-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'Memproses...' : 'Konfirmasi CAIR'}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Modal Komparasi untuk KAOPS/Super Admin jika PSB terdeteksi */}
      {isValidationModalOpen && matchedControlRecord && (
        <ModalValidasiCairPsb
          isOpen={isValidationModalOpen}
          onClose={() => setIsValidationModalOpen(false)}
          record={record}
          matchedRecord={matchedControlRecord}
          currentUser={currentUser}
          onSuccess={(msg) => {
            setIsValidationModalOpen(false);
            onSuccess(msg);
            onClose();
          }}
        />
      )}
    </>
  );
};
