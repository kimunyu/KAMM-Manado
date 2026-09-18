import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User as UserIcon, 
  ShieldCheck,
  AlertTriangle,
  Lock,
  Clock
} from 'lucide-react';
import { SalesControlRecord } from '../types';
import { SalesService } from '../services/salesService';
import { checkHoldDanaSla, getWhatsAppUrl, checkAcceptLockStatus, extractDayDD, isUbahJt } from '../utils/slaUtils';
import { User } from '../../../types';
import { SingleDatePicker } from './SingleDatePicker';
import { Calendar } from 'lucide-react';

interface ModalValidasiAdmDeProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesControlRecord | null;
  currentUser: User;
  onSuccess?: () => void;
}

export const ModalValidasiAdmDe: React.FC<ModalValidasiAdmDeProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onSuccess
}) => {
  // Form states - defined unconditionally at the top level
  const [targetStatus, setTargetStatus] = useState<'ACCEPT' | 'BELUM SELESAI'>('ACCEPT');
  const [tglCair, setTglCair] = useState<string>('');
  const [tglJt, setTglJt] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [namaKonsumen, setNamaKonsumen] = useState<string>('');
  const [noWa, setNoWa] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setTargetStatus(record.status === 'BELUM SELESAI' ? 'BELUM SELESAI' : 'ACCEPT');
      setTglCair(record.tgl_cair || '');
      setTglJt(extractDayDD(record.tgl_jt || record.tgl_cair));
      setKeterangan(
        record.status === 'ACCEPT' 
          ? (record.keterangan || 'SESUAI') 
          : (record.keterangan || '')
      );
      setNamaKonsumen(record.nama_konsumen || '');
      setNoWa(record.no_wa || '');
      setErrorMsg(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const isAlreadyAccept = record.status === 'ACCEPT';
  const sla = checkHoldDanaSla(record.tgl_cair, record.status);
  const acceptLock = checkAcceptLockStatus(record);
  const isLocked = acceptLock.isLocked;

  // Poin 1: Khusus ADM_DE & SUPER_ADMIN berhak mengedit Tgl Cair
  const canEditTglCair = (currentUser.role === 'ADM_DE' || currentUser.role === 'SUPER_ADMIN') && !isLocked;

  // Handle status toggle switch
  const handleSelectStatus = (st: 'ACCEPT' | 'BELUM SELESAI') => {
    if (isLocked) return;
    setTargetStatus(st);
    if (st === 'ACCEPT') {
      if (!keterangan || keterangan.trim() === '') {
        setKeterangan('SESUAI');
      }
    } else {
      if (keterangan === 'SESUAI') {
        setKeterangan('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg(`Aksi validasi ditutup: Status ACCEPT telah melewati batas waktu 1x24 jam (divalidasi: ${acceptLock.formattedValidationDate}) dan telah terkunci.`);
      return;
    }
    setErrorMsg(null);

    if (targetStatus === 'BELUM SELESAI' && !keterangan.trim()) {
      setErrorMsg('Poin kekurangan atau catatan belum lengkap wajib diisi.');
      return;
    }

    if (!tglCair.trim()) {
      setErrorMsg('Tanggal Pencairan (Tgl Cair) tidak boleh kosong.');
      return;
    }

    if (!tglJt.trim()) {
      setErrorMsg('Tanggal Jatuh Tempo (Tgl JT) tidak boleh kosong.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await SalesService.validateStatusByAdmDe(
        record.no_psb,
        {
          status: targetStatus,
          keterangan: keterangan.trim(),
          tgl_cair: canEditTglCair ? tglCair.trim() : undefined,
          tgl_jt: tglJt.trim(),
          nama_konsumen: namaKonsumen.trim().toUpperCase(),
          no_wa: noWa.trim(),
        },
        currentUser
      );

      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const waUrl = getWhatsAppUrl(record.no_wa, `Halo Bapak/Ibu ${record.nama_konsumen}, kami dari KAMM Manado terkait pencairan no PSB ${record.no_psb}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="modal-validasi-adm-de"
        className="bg-[#141721] border border-[#272d3e] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232734] bg-[#181a24]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Validasi Data Pencairan ADM_DE</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#232734] text-purple-300 font-bold border border-purple-500/30">
                  {record.no_psb}
                </span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Posko: {record.posko_id} • Cabang: {record.cabang_id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8e96a8] hover:text-white p-1 rounded-lg hover:bg-[#232734] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 pb-16">
          {/* Banner Kunci Validasi 1x24 Jam */}
          {isAlreadyAccept && isLocked && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-start space-x-3">
              <Lock className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Aksi Validasi Ditutup / Terkunci (1x24 Jam)</p>
                <p className="text-[11px] text-[#c4ccd9] mt-0.5 leading-relaxed">
                  Status data ini telah berstatus <strong>ACCEPT</strong> lebih dari 1x24 jam (divalidasi: <strong>{acceptLock.formattedValidationDate}</strong>).
                  Sesuai aturan sistem kontrol sales, validasi tidak dapat diubah kembali dan data telah terkunci permanen.
                </p>
              </div>
            </div>
          )}

          {/* Info sisa waktu jika masih dalam rentang 1x24 jam */}
          {isAlreadyAccept && !isLocked && (
            <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-400 shrink-0" />
                <span>
                  Status ACCEPT dapat disesuaikan kembali hingga <strong>{Math.floor(acceptLock.hoursRemaining)} jam</strong> ke depan sebelum terkunci otomatis.
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Status & SLA Bar */}
          <div className="p-3.5 bg-[#181a24] rounded-xl border border-[#272d3e] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#8e96a8]">Status Saat Ini:</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                record.status === 'ACCEPT'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                  : record.status === 'BELUM SELESAI'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  : 'bg-blue-950/80 text-blue-300 border-blue-800/60'
              }`}>
                {record.status}
              </span>
            </div>

            {sla.isHoldDana && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white border border-rose-400 shadow-md animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>HOLD DANA ({sla.workingDays} Hari Kerja)</span>
              </span>
            )}
          </div>

          {/* Poin 1 & 2: Single Date Pickers for TGL CAIR & TGL JT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SingleDatePicker
                id="modal-tgl-cair"
                label="TGL CAIR (Kalender)"
                value={tglCair}
                onChange={setTglCair}
                disabled={!canEditTglCair}
                helperText={
                  canEditTglCair 
                    ? 'Buka gembok koreksi tgl pencairan (ADM_DE / Super Admin).' 
                    : 'Terkunci: Hanya ADM_DE / Super Admin yang dapat mengedit.'
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5">
                TGL JT (Hari / Tanggal DD Saja) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={tglJt}
                  onChange={(e) => setTglJt(e.target.value)}
                  disabled={isLocked}
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono disabled:opacity-60"
                >
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((dd) => (
                    <option key={dd} value={dd}>
                      Tanggal {dd} {dd === extractDayDD(tglCair) ? '(Sama dengan Hari Cair)' : ''}
                    </option>
                  ))}
                </select>
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-[#8e96a8] pointer-events-none" />
              </div>
              <p className="text-[11px] text-[#8e96a8] mt-1">
                Format baru: Hanya hari saja (DD: 01 - 31).{' '}
                {isUbahJt(tglCair, tglJt) ? (
                  <span className="text-amber-400 font-bold">⚡ Terdeteksi UBAH JT (Hari Cair: {extractDayDD(tglCair)} ≠ Hari JT: {tglJt})</span>
                ) : (
                  <span className="text-emerald-400 font-medium">Sesuai hari pencairan (Tanggal {extractDayDD(tglCair)})</span>
                )}
              </p>
            </div>
          </div>

          {/* Info & Editable Fields of Consumer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5">
                Nama Konsumen
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={namaKonsumen}
                  onChange={(e) => setNamaKonsumen(e.target.value.toUpperCase())}
                  disabled={isAlreadyAccept}
                  maxLength={100}
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:outline-none focus:border-purple-500 disabled:opacity-60"
                />
                <UserIcon className="absolute right-3 top-3 h-4 w-4 text-[#8e96a8]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5">
                Nomor WhatsApp (08...)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value)}
                  disabled={isAlreadyAccept}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 disabled:opacity-60"
                />
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Hubungi via WhatsApp"
                  className="shrink-0 p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Decision Buttons (ACCEPT vs BELUM LENGKAP) */}
          <div>
            <label className="block text-xs font-bold text-[#c2c7d0] mb-2 uppercase tracking-wide">
              Keputusan Validasi ADM_DE
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectStatus('ACCEPT')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                  targetStatus === 'ACCEPT'
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-[#181a24] border-[#272d3e] text-[#8e96a8] hover:bg-[#1f2330]'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>1. ACCEPT</span>
                </div>
                <span className="text-[11px] mt-1 opacity-80 text-center">
                  Dokumen lengkap & sesuai
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectStatus('BELUM SELESAI')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                  targetStatus === 'BELUM SELESAI'
                    ? 'bg-amber-950/90 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-[#181a24] border-[#272d3e] text-[#8e96a8] hover:bg-[#1f2330]'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <span>2. BELUM LENGKAP</span>
                </div>
                <span className="text-[11px] mt-1 opacity-80 text-center">
                  Ada kekurangan berkas
                </span>
              </button>
            </div>
          </div>

          {/* Keterangan (Poin 4: Hanya diisi saat validasi Data Konsumen) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#8e96a8]">
                {targetStatus === 'ACCEPT' ? 'Keterangan (Default "SESUAI")' : 'Poin Kekurangan (Wajib Diisi)'}
              </label>
              <span className="text-[11px] text-[#8e96a8]">{keterangan.length}/500</span>
            </div>
            <textarea
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              maxLength={500}
              placeholder={targetStatus === 'ACCEPT' ? 'SESUAI (atau catatan lainnya)' : 'Sebutkan poin kekurangan dokumen atau alasan pending...'}
              className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors cursor-pointer"
            >
              {isLocked ? 'Tutup' : 'Batal'}
            </button>
            {isLocked ? (
              <button
                type="button"
                disabled
                className="px-6 py-2.5 bg-[#1a1e2b] border border-[#2d364a] text-[#717b94] rounded-xl text-xs font-bold flex items-center space-x-2 cursor-not-allowed opacity-80"
              >
                <Lock className="h-4 w-4 text-amber-400" />
                <span>Validasi Terkunci (1x24 Jam)</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Menyimpan Validasi...' : 'Simpan Keputusan Validasi'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
