import React, { useState } from 'react';
import { 
  X, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  Building2, 
  Share2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Edit3, 
  Save, 
  FileCheck, 
  ArrowRightLeft, 
  XCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { SalesAcquisition, SalesAcquisitionStatus, SalesAcquisitionSourceLead } from '../types';
import { User, Cabang, Posko } from '../../../types';
import { SalesAcquisitionService, cleanPhoneNumber } from '../services/salesAcquisitionService';
import { WilayahCascadeSelector } from '../../../components/WilayahCascadeSelector';
import { SelectedWilayahState } from '../../../types';

interface ProspekDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalesAcquisition;
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  onOpenConvertCair: (rec: SalesAcquisition) => void;
  onOpenReassign: (rec: SalesAcquisition) => void;
  onOpenTolakBatal: (rec: SalesAcquisition, status: 'DITOLAK' | 'BATAL') => void;
  onSuccess: () => void;
}

export const ProspekDetailModal: React.FC<ProspekDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  allCabang,
  allPosko,
  onOpenConvertCair,
  onOpenReassign,
  onOpenTolakBatal,
  onSuccess
}) => {
  const isTerminal = ['CAIR', 'DITOLAK', 'BATAL'].includes(record.status);
  const canEdit = !isTerminal || currentUser.role === 'SUPER_ADMIN';

  // Permission check for pipeline actions
  const isCmo = currentUser.role === 'CMO';
  const isKapos = currentUser.role === 'KAPOS';
  const isAdm = currentUser.role === 'ADM';
  const isKaops = currentUser.role === 'KAOPS';
  const isKacab = currentUser.role === 'KACAB';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const canAdvancePipeline = isKapos || isAdm || isKaops || isSuperAdmin || (
    isCmo && (record.status === 'PROSPEK_BARU' || record.status === 'PROSES_SURVEI')
  );

  const canConvertCair = (isKapos || isAdm || isKaops || isSuperAdmin) && record.status === 'DISETUJUI';
  const canReassign = (isKapos || isKaops || isKacab || isSuperAdmin) && !isTerminal;

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [namaKonsumen, setNamaKonsumen] = useState(record.nama_calon_konsumen);
  const [noTelepon, setNoTelepon] = useState(record.no_telepon);
  const [sumberLead, setSumberLead] = useState<SalesAcquisitionSourceLead>(record.sumber_lead);
  const [kdMed, setKdMed] = useState(record.kd_med || '');
  const [refNoPsbLama, setRefNoPsbLama] = useState(record.ref_no_psb_lama || '');
  const [wilayahState, setWilayahState] = useState<SelectedWilayahState>({
    provinsiId: record.wilayah_provinsi_id || '',
    kabupatenId: record.wilayah_kabupaten_id || '',
    kecamatanId: record.wilayah_kecamatan_id || '',
    desaId: record.wilayah_desa_id || ''
  });
  const [alamatDetail, setAlamatDetail] = useState(record.alamat_detail || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format Helper
  const formatDate = (isoOrTimestamp: any) => {
    if (!isoOrTimestamp) return '-';
    try {
      const d = new Date(isoOrTimestamp);
      return isNaN(d.getTime()) ? String(isoOrTimestamp) : d.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return String(isoOrTimestamp);
    }
  };

  const handleSaveEdit = async () => {
    setErrorMessage(null);
    setIsSaving(true);

    const res = await SalesAcquisitionService.updateLeadDetails(
      record.id,
      {
        nama_calon_konsumen: namaKonsumen,
        no_telepon: noTelepon,
        sumber_lead: sumberLead,
        kd_med: kdMed,
        ref_no_psb_lama: refNoPsbLama,
        wilayah_provinsi_id: wilayahState.provinsiId,
        wilayah_kabupaten_id: wilayahState.kabupatenId,
        wilayah_kecamatan_id: wilayahState.kecamatanId,
        wilayah_desa_id: wilayahState.desaId,
        alamat_detail: alamatDetail
      },
      currentUser
    );

    setIsSaving(false);

    if (res.success) {
      setIsEditing(false);
      onSuccess();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleAdvanceStatus = async (nextStatus: SalesAcquisitionStatus) => {
    if (nextStatus === 'CAIR') {
      onOpenConvertCair(record);
      return;
    }
    if (nextStatus === 'DITOLAK' || nextStatus === 'BATAL') {
      onOpenTolakBatal(record, nextStatus);
      return;
    }

    setIsSaving(true);
    const res = await SalesAcquisitionService.updateLeadStatus(
      record.id,
      nextStatus,
      '',
      currentUser
    );
    setIsSaving(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl text-white shadow-md ${
              record.status === 'CAIR' ? 'bg-emerald-600 shadow-emerald-900/40' :
              record.status === 'DITOLAK' || record.status === 'BATAL' ? 'bg-rose-600 shadow-rose-900/40' :
              'bg-blue-600 shadow-blue-900/40'
            }`}>
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{record.nama_calon_konsumen}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  record.status === 'CAIR' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                  record.status === 'DISETUJUI' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' :
                  record.status === 'DITOLAK' || record.status === 'BATAL' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                  'bg-blue-950 text-blue-300 border-blue-800'
                }`}>
                  {record.status}
                </span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                ID: <span className="font-mono text-white">{record.id}</span> • Dibuat: {formatDate(record.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg border border-[#2c3345] bg-[#1a1e2d] text-xs font-bold text-[#c2c9d6] hover:text-white hover:bg-[#232738] transition-colors flex items-center space-x-1.5"
              >
                <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                <span>Edit Data</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Workflow Action Bar (If not terminal) */}
          {!isTerminal && (
            <div className="p-4 bg-gradient-to-r from-[#171b29] to-[#121622] border border-[#272d3e] rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1">
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Langkah Pipeline Berikutnya</span>
                </span>
                <p className="text-xs text-[#8e96a8]">
                  Majukan prospek ke tahapan berikutnya sesuai verifikasi dokumen di lapangan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {record.status === 'PROSPEK_BARU' && canAdvancePipeline && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStatus('PROSES_SURVEI')}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm transition-all"
                  >
                    Proses Survei
                  </button>
                )}

                {record.status === 'PROSES_SURVEI' && canAdvancePipeline && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStatus('PENGAJUAN_BERKAS')}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm transition-all"
                  >
                    Pengajuan Berkas
                  </button>
                )}

                {record.status === 'PENGAJUAN_BERKAS' && (isKapos || isAdm || isKaops || isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStatus('DISETUJUI')}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-sm transition-all"
                  >
                    Setujui Prospek
                  </button>
                )}

                {canConvertCair && (
                  <button
                    type="button"
                    onClick={() => onOpenConvertCair(record)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-900/40 transition-all flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Cairkan (Input PSB)</span>
                  </button>
                )}

                {canReassign && (
                  <button
                    type="button"
                    onClick={() => onOpenReassign(record)}
                    className="px-3.5 py-1.5 rounded-lg border border-indigo-700/60 bg-indigo-950/40 text-xs font-bold text-indigo-300 hover:text-white hover:bg-indigo-900/60 transition-all flex items-center space-x-1.5"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>Reassign AO</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenTolakBatal(record, 'DITOLAK')}
                  className="px-3 py-1.5 rounded-lg border border-rose-800/60 bg-rose-950/40 text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-900/60 transition-all"
                >
                  Tolak
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTolakBatal(record, 'BATAL')}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 text-xs font-bold text-[#8e96a8] hover:text-white transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* CAIR Conversion Badge Section (If CAIR) */}
          {record.status === 'CAIR' && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Telah Dicairkan Menjadi Nasabah KAMM</span>
                </span>
                <span className="text-xs font-mono text-white font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700">
                  PSB: {record.no_psb}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-200/90 pt-1">
                <div>
                  <span className="text-emerald-400 text-[11px] block">Tanggal Realisasi:</span>
                  <strong>{formatDate(record.tgl_cair)}</strong>
                </div>
                <div>
                  <span className="text-emerald-400 text-[11px] block">Sales Control ID:</span>
                  <span className="font-mono text-white">{record.sales_control_id || '-'}</span>
                </div>
                <div>
                  <span className="text-emerald-400 text-[11px] block">Diproses Oleh:</span>
                  <span>{record.status_updated_by_user_id}</span>
                </div>
              </div>
            </div>
          )}

          {/* DITOLAK / BATAL Reason Section */}
          {(record.status === 'DITOLAK' || record.status === 'BATAL') && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                <XCircle className="h-4 w-4" />
                <span>Alasan {record.status}</span>
              </span>
              <p className="text-xs text-rose-200">
                {record.alasan_tolak_batal || 'Tidak ada keterangan'}
              </p>
            </div>
          )}

          {/* Section 1: Customer Profile & Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider flex items-center space-x-2">
              <UserIcon className="h-4 w-4 text-blue-400" />
              <span>Identitas &amp; Kontak Calon Konsumen</span>
            </h3>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#161a26] p-4 rounded-xl border border-[#272d3e]">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-[#8e96a8]">Nama Calon Konsumen *</label>
                  <input
                    type="text"
                    value={namaKonsumen}
                    onChange={(e) => setNamaKonsumen(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#2c3345] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8e96a8]">Nomor Telepon *</label>
                  <input
                    type="text"
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#2c3345] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8e96a8]">Sumber Lead *</label>
                  <select
                    value={sumberLead}
                    onChange={(e) => setSumberLead(e.target.value as SalesAcquisitionSourceLead)}
                    className="w-full bg-[#12151f] border border-[#2c3345] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="CANVASSING">CANVASSING</option>
                    <option value="SOSMED">SOSMED</option>
                    <option value="MEDIATOR">MEDIATOR</option>
                    <option value="EX_CUSTOMER">EX_CUSTOMER</option>
                    <option value="WALK_IN">WALK_IN</option>
                  </select>
                </div>
                {sumberLead === 'MEDIATOR' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-blue-300">Kode Mediator (KD MED)</label>
                    <input
                      type="text"
                      value={kdMed}
                      onChange={(e) => setKdMed(e.target.value.toUpperCase())}
                      className="w-full bg-[#12151f] border border-[#2c3345] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
                {sumberLead === 'EX_CUSTOMER' && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-amber-300">No. PSB Lama</label>
                    <input
                      type="text"
                      value={refNoPsbLama}
                      onChange={(e) => setRefNoPsbLama(e.target.value.toUpperCase())}
                      className="w-full bg-[#12151f] border border-[#2c3345] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#161a26] p-4 rounded-xl border border-[#272d3e] text-xs">
                <div>
                  <span className="text-[#8e96a8] block">Nama Lengkap</span>
                  <strong className="text-white text-sm font-semibold">{record.nama_calon_konsumen}</strong>
                </div>
                <div>
                  <span className="text-[#8e96a8] block">Nomor Telepon</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-emerald-400 font-bold">{record.no_telepon_clean}</span>
                    <a
                      href={`https://wa.me/62${record.no_telepon_clean.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:underline flex items-center space-x-0.5"
                    >
                      <span>WA</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
                <div>
                  <span className="text-[#8e96a8] block">Sumber Lead</span>
                  <span className="inline-block px-2 py-0.5 rounded bg-[#1e2333] text-blue-300 font-medium">
                    {record.sumber_lead}
                  </span>
                  {record.kd_med && (
                    <span className="block text-[11px] text-blue-400 font-mono mt-0.5">
                      KD MED: {record.kd_med}
                    </span>
                  )}
                  {record.ref_no_psb_lama && (
                    <span className="block text-[11px] text-amber-400 font-mono mt-0.5">
                      PSB Lama: {record.ref_no_psb_lama}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Wilayah & Alamat Domisili */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>Wilayah Administratif &amp; Alamat Domisili</span>
            </h3>

            {isEditing ? (
              <div className="space-y-3 bg-[#161a26] p-4 rounded-xl border border-[#272d3e]">
                <WilayahCascadeSelector
                  initialValues={wilayahState}
                  onChange={setWilayahState}
                  showSummary={false}
                />
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8e96a8]">Alamat Lengkap / Patokan</label>
                  <textarea
                    rows={2}
                    maxLength={255}
                    value={alamatDetail}
                    onChange={(e) => setAlamatDetail(e.target.value)}
                    className="w-full bg-[#12151f] border border-[#2c3345] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#161a26] p-4 rounded-xl border border-[#272d3e] text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[#8e96a8]">
                  <div>
                    <span className="text-[10px] block">Kode Provinsi:</span>
                    <strong className="text-white">{record.wilayah_provinsi_id || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block">Kode Kab/Kota:</span>
                    <strong className="text-white">{record.wilayah_kabupaten_id || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block">Kode Kecamatan:</span>
                    <strong className="text-white">{record.wilayah_kecamatan_id || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block">Kode Desa/Kelurahan:</span>
                    <strong className="text-white">{record.wilayah_desa_id || '-'}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#232734]">
                  <span className="text-[10px] text-[#8e96a8] block">Alamat Detail:</span>
                  <p className="text-white text-xs mt-0.5">
                    {record.alamat_detail || <em className="text-[#5c6479]">Belum ada rincian alamat</em>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Assignment & Audit Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              <span>Petugas AO &amp; Unit Penempatan KAMM</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#161a26] p-4 rounded-xl border border-[#272d3e] text-xs">
              <div>
                <span className="text-[#8e96a8] block">Kode AO</span>
                <strong className="text-white font-mono">{record.kd_ao || '-'}</strong>
              </div>
              <div>
                <span className="text-[#8e96a8] block">User ID Assigned</span>
                <span className="font-mono text-purple-300">{record.assigned_user_id}</span>
              </div>
              <div>
                <span className="text-[#8e96a8] block">Cabang</span>
                <strong className="text-white font-mono">{record.kd_cabang}</strong>
              </div>
              <div>
                <span className="text-[#8e96a8] block">Posko</span>
                <strong className="text-white font-mono">{record.kd_posko}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#232734] bg-[#161a26] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-[#8e96a8]">
            Terakhir diubah: {formatDate(record.updated_at)} oleh <span className="text-white">{record.updated_by_user_id}</span>
          </div>

          {isEditing ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-lg border border-[#2c3345] text-xs font-bold text-[#8e96a8] hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md flex items-center space-x-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-[#2c3345] text-xs font-bold text-[#8e96a8] hover:text-white"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
