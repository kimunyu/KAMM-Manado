import React, { useState } from 'react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { User, Posko } from '../../../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';
import { WilayahCascadeSelector } from '../../../components/WilayahCascadeSelector';
import { WilayahService } from '../../../services/wilayahService';
import { 
  X, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon,
  Calendar,
  DollarSign,
  Edit2,
  Save,
  MessageSquare
} from 'lucide-react';

interface ProspekDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition | null;
  currentUser: User;
  onUpdateStatus: (newStatus: SalesAcquisitionStatus, notes?: string) => Promise<boolean>;
  onOpenReassign: () => void;
  onOpenConvertCair: () => void;
  onOpenTolakBatal: (action: 'DITOLAK' | 'BATAL') => void;
  onRecordUpdated: () => void;
}

export const ProspekDetailModal: React.FC<ProspekDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onUpdateStatus,
  onOpenReassign,
  onOpenConvertCair,
  onOpenTolakBatal,
  onRecordUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [namaKonsumen, setNamaKonsumen] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [plafonPengajuan, setPlafonPengajuan] = useState<number>(0);
  const [catatanSurvei, setCatatanSurvei] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const isTerminal = ['CAIR', 'DITOLAK', 'BATAL'].includes(record.status);
  const isCmo = currentUser.role === 'CMO';
  const isKapos = currentUser.role === 'KAPOS';
  const isAdm = currentUser.role === 'ADM';
  const isKaops = currentUser.role === 'KAOPS';
  const isKacab = currentUser.role === 'KACAB';
  const isRm = currentUser.role === 'RM';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const canAdvancePipeline = isKapos || isAdm || isKaops || isKacab || isRm || isSuperAdmin || (
    isCmo && (record.status === 'PROSPEK_BARU' || record.status === 'PROSES_SURVEI')
  );

  const canConvertCair = (isKapos || isAdm || isKaops || isKacab || isRm || isSuperAdmin) && record.status === 'DISETUJUI';
  const canReassign = (isKapos || isKaops || isKacab || isRm || isSuperAdmin) && !isTerminal;

  const startEdit = () => {
    setNamaKonsumen(record.nama_calon_konsumen);
    setNoTelepon(record.no_telepon);
    setPlafonPengajuan(record.plafon_pengajuan || 0);
    setCatatanSurvei(record.catatan_survei || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await SalesAcquisitionService.updateLeadDetails(
      record.id,
      {
        nama_calon_konsumen: namaKonsumen.trim(),
        no_telepon: noTelepon.trim(),
        plafon_pengajuan: Number(plafonPengajuan),
        catatan_survei: catatanSurvei.trim()
      },
      currentUser
    );
    setIsSaving(false);
    setIsEditing(false);
    onRecordUpdated();
  };

  const wilayahFormatted = WilayahService.getFormattedName(
    record.wilayah_provinsi_id,
    record.wilayah_kabupaten_id,
    record.wilayah_kecamatan_id,
    record.wilayah_desa_id
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{record.nama_calon_konsumen}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  {record.jenis_jaminan}
                </span>
              </div>
              <p className="text-[11px] text-[#8e96a8] font-mono">{record.id} • Dibuat: {record.created_at.split('T')[0]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#8e96a8] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Status Ribbon & Quick Actions */}
          <div className="p-4 rounded-xl bg-[#161a26] border border-[#232734] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-[#8e96a8] block mb-1">STATUS SAAT INI</span>
              <span className="text-sm font-bold font-mono px-3 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800">
                {record.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Advance Pipeline */}
              {canAdvancePipeline && record.status === 'PROSPEK_BARU' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus('PROSES_SURVEI')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Mulai Survei</span>
                </button>
              )}

              {canAdvancePipeline && record.status === 'PROSES_SURVEI' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus('DISETUJUI')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Setujui Kredit</span>
                </button>
              )}

              {canConvertCair && (
                <button
                  type="button"
                  onClick={onOpenConvertCair}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Konversi CAIR</span>
                </button>
              )}

              {canReassign && (
                <button
                  type="button"
                  onClick={onOpenReassign}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-800 font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Alihkan AO</span>
                </button>
              )}

              {!isTerminal && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenTolakBatal('DITOLAK')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 font-semibold cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenTolakBatal('BATAL')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Details Form / Display */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3 p-4 bg-[#161a26] border border-[#232734] rounded-xl">
              <div className="font-bold text-white text-xs mb-1">Edit Informasi Dasar</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#8e96a8]">Nama Konsumen</label>
                  <input
                    type="text"
                    required
                    value={namaKonsumen}
                    onChange={(e) => setNamaKonsumen(e.target.value)}
                    className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#8e96a8]">Nomor HP</label>
                  <input
                    type="text"
                    required
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#8e96a8]">Plafon Pengajuan (Rp)</label>
                  <input
                    type="number"
                    value={plafonPengajuan}
                    onChange={(e) => setPlafonPengajuan(Number(e.target.value))}
                    className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#8e96a8]">Catatan Lapangan</label>
                  <input
                    type="text"
                    value={catatanSurvei}
                    onChange={(e) => setCatatanSurvei(e.target.value)}
                    className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#2c3345] text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
                  <span className="text-[10px] text-[#8e96a8]">Nomor Telepon</span>
                  <div className="font-mono font-bold text-white flex items-center space-x-1.5">
                    <span>{record.no_telepon}</span>
                    <a
                      href={`https://wa.me/${record.no_telepon.replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
                  <span className="text-[10px] text-[#8e96a8]">Sumber Lead</span>
                  <div className="font-bold text-white">{record.sumber_lead}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
                  <span className="text-[10px] text-[#8e96a8]">AO Ref</span>
                  <div className="font-bold text-indigo-300 font-mono">{record.kd_ao || '-'}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
                  <span className="text-[10px] text-[#8e96a8]">Plafon Pengajuan</span>
                  <div className="font-bold text-emerald-400 font-mono">
                    {record.plafon_pengajuan ? `Rp ${record.plafon_pengajuan.toLocaleString('id-ID')}` : '-'}
                  </div>
                </div>
              </div>

              {/* Mediator / Ref Details if any */}
              {record.kd_med && (
                <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-[11px] flex items-center justify-between">
                  <span className="text-blue-300">Kode Mediator (KD MED): <strong className="font-mono text-white">{record.kd_med}</strong></span>
                  <span className="text-[10px] text-blue-400">Mitra KAMM Manado</span>
                </div>
              )}

              {record.ref_no_psb_lama && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] flex items-center justify-between">
                  <span className="text-amber-300">Ref No. PSB Lama: <strong className="font-mono text-white">{record.ref_no_psb_lama}</strong></span>
                  <span className="text-[10px] text-amber-400">Ex-Customer BPKB Lunas</span>
                </div>
              )}

              {/* Wilayah Domisili */}
              <div className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
                <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-blue-400" />
                  <span>Wilayah Domisili</span>
                </span>
                <div className="font-medium text-white">{wilayahFormatted || 'Wilayah Belum Lengkap'}</div>
              </div>

              {/* Catatan Lapangan */}
              {record.catatan_survei && (
                <div className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
                  <span className="text-[10px] text-[#8e96a8]">Catatan Survei &amp; Lapangan</span>
                  <p className="text-white leading-relaxed">{record.catatan_survei}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#232734] bg-[#161a26]/50 flex justify-between items-center">
          {!isEditing && (
            <button
              type="button"
              onClick={startEdit}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Data Prospek</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#202534] hover:bg-[#282f42] text-xs font-semibold text-white ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
