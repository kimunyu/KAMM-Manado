import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  Building2, 
  User as UserIcon, 
  Phone, 
  Calendar, 
  FileCheck,
  Check,
  Lock,
  Link as LinkIcon
} from 'lucide-react';
import { SalesAcquisition } from '../types';
import { User } from '../../../types';
import { SalesControlRecord } from '../../kontrol-sales/types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';

interface ModalValidasiCairPsbProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  matchedRecord: SalesControlRecord;
  currentUser: User;
  onSuccess: (message: string) => void;
}

export const ModalValidasiCairPsb: React.FC<ModalValidasiCairPsbProps> = ({
  isOpen,
  onClose,
  record,
  matchedRecord,
  currentUser,
  onSuccess
}) => {
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Jika prospek sedang berstatus pending_cair_validation, gunakan resolveCairValidation
    if (record.is_pending_cair_validation) {
      const res = await SalesAcquisitionService.resolveCairValidation(
        record.id,
        'APPROVED',
        currentUser,
        catatan.trim() || 'Disahkan sebagai konsumen yang sama oleh KAOPS/Super Admin'
      );
      setIsSubmitting(false);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } else {
      // Jika dipicu langsung dari modal CAIR oleh KAOPS/Super Admin
      const res = await SalesAcquisitionService.convertToCair(
        record.id,
        {
          no_psb: matchedRecord.no_psb,
          tgl_cair: matchedRecord.tgl_cair,
          keterangan: catatan.trim() || `Tautkan ke Kontrol Sales No. PSB ${matchedRecord.no_psb}`,
          matched_control_id: matchedRecord.id
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
    }
  };

  const handleReject = async () => {
    if (!catatan.trim()) {
      setErrorMessage('Wajib mengisi catatan/alasan penolakan agar pemohon dapat memperbaiki No PSB!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    if (record.is_pending_cair_validation) {
      const res = await SalesAcquisitionService.resolveCairValidation(
        record.id,
        'REJECTED',
        currentUser,
        catatan.trim()
      );
      setIsSubmitting(false);
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } else {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#10131d] border border-[#272e42] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#222738] bg-gradient-to-r from-amber-950/60 via-[#181d2c] to-indigo-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Validasi Kecocokan Pencairan (KAOPS / Super Admin)</span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Perbandingan data Prospek Sales vs Data Pencairan Kontrol Sales (No. PSB: <span className="font-mono text-amber-300 font-bold">{matchedRecord.no_psb}</span>)
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner Otoritas */}
          <div className="p-3.5 bg-amber-950/30 border border-amber-700/40 rounded-xl text-xs text-amber-200/90 leading-relaxed flex items-start space-x-2.5">
            <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Ketetapan Single Source of Truth:</strong> Modul Kontrol Sales memegang hak tertinggi atas transaksi pencairan resmi. Jika disahkan sama, sistem akan mengubah status prospek menjadi <strong>CAIR</strong> dan menautkan referensi data tanpa menghapus atau menimpa data pencairan asli Kontrol Sales.
            </div>
          </div>

          {/* Side by Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SISI KIRI: DATA PROSPEK SALES */}
            <div className="bg-[#151824] border border-[#262c3e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#23283a] pb-2.5">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Data di Prospek Sales</span>
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-mono">
                  {record.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[11px] text-[#717b94]">Nama Calon Konsumen:</div>
                  <div className="text-white font-semibold text-sm">{record.nama_calon_konsumen}</div>
                </div>

                <div>
                  <div className="text-[11px] text-[#717b94]">No. Telepon / WA:</div>
                  <div className="font-mono text-emerald-400 font-medium">{record.no_telepon_clean}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="text-[11px] text-[#717b94]">Jenis Jaminan:</div>
                    <div className="text-amber-300 font-medium">{record.jenis_jaminan || 'R2'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#717b94]">Sumber Lead:</div>
                    <div className="text-white font-medium">{record.sumber_lead}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="text-[11px] text-[#717b94]">Petugas CMO / AO:</div>
                    <div className="text-white font-medium">{record.kd_ao || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#717b94]">Cabang / Posko:</div>
                    <div className="text-white font-medium">{record.kd_cabang} / {record.kd_posko}</div>
                  </div>
                </div>

                {record.alamat_detail && (
                  <div className="pt-1">
                    <div className="text-[11px] text-[#717b94]">Alamat Domisili:</div>
                    <div className="text-white text-[11px]">{record.alamat_detail}</div>
                  </div>
                )}
              </div>
            </div>

            {/* SISI KANAN: DATA KONTROL SALES EKSISTING */}
            <div className="bg-[#151824] border border-[#262c3e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#23283a] pb-2.5">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Data di Kontrol Sales</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                  matchedRecord.status === 'ACCEPT'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}>
                  Status: {matchedRecord.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[11px] text-[#717b94]">Nomor PSB Resmi:</div>
                  <div className="font-mono text-amber-300 font-bold text-sm">{matchedRecord.no_psb}</div>
                </div>

                <div>
                  <div className="text-[11px] text-[#717b94]">Nama Konsumen di Kontrol Sales:</div>
                  <div className="text-white font-semibold text-sm">{matchedRecord.nama_konsumen}</div>
                </div>

                <div>
                  <div className="text-[11px] text-[#717b94]">No. WhatsApp Tercatat:</div>
                  <div className="font-mono text-emerald-400 font-medium">{matchedRecord.no_wa || '-'}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="text-[11px] text-[#717b94]">Tgl Cair:</div>
                    <div className="text-white font-medium">{matchedRecord.tgl_cair}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#717b94]">Tgl JT:</div>
                    <div className="text-white font-medium">Tgl {matchedRecord.tgl_jt}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="text-[11px] text-[#717b94]">Cabang / Posko:</div>
                    <div className="text-white font-medium">{matchedRecord.cabang_id} / {matchedRecord.posko_id}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#717b94]">Diinput Oleh:</div>
                    <div className="text-white font-medium truncate" title={matchedRecord.created_by}>
                      {matchedRecord.created_by_name || matchedRecord.created_by || '-'}
                    </div>
                  </div>
                </div>

                {matchedRecord.keterangan && (
                  <div className="pt-1">
                    <div className="text-[11px] text-[#717b94]">Keterangan Pencairan:</div>
                    <div className="text-white text-[11px] italic">{matchedRecord.keterangan}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Catatan / Alasan Putusan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#e0e4eb]">
              Catatan Keputusan Validator KAOPS / Super Admin
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Terkonfirmasi data konsumen dan unit jaminan sama dengan pencairan cabang..."
              className="w-full bg-[#151824] border border-[#272e42] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#586177] focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#222738] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#272e42] text-xs font-bold text-[#8e96a8] hover:text-white hover:bg-[#181d2c] transition-colors"
            >
              Tutup
            </button>

            <div className="w-full sm:w-auto flex items-center space-x-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-xs font-bold text-rose-200 transition-colors flex items-center justify-center space-x-1.5"
                title="Tolak pencocokan jika No PSB yang diinput salah atau bukan konsumen yang sama"
              >
                <XCircle className="h-4 w-4 text-rose-400" />
                <span>Data Berbeda / Tolak PSB</span>
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center space-x-2"
                title="Sahkan bahwa kedua data adalah konsumen yang sama dan tautkan status CAIR"
              >
                <LinkIcon className="h-4 w-4" />
                <span>Sahkan Sama &amp; Tautkan CAIR</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
