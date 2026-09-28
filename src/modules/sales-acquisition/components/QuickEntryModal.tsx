import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  Phone, 
  User as UserIcon, 
  Share2, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  FileText,
  Search,
  ShieldCheck,
  Bike,
  Car,
  FileCheck2
} from 'lucide-react';
import { User, Cabang, Posko, MediatorKontrak, ExCustomer } from '../../../types';
import { SalesAcquisitionSourceLead, JenisJaminan } from '../types';
import { SalesAcquisitionService, cleanPhoneNumber } from '../services/salesAcquisitionService';
import { WilayahCascadeSelector } from '../../../components/WilayahCascadeSelector';
import { SelectedWilayahState } from '../../../types';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  allUsers: User[];
  allMediators: MediatorKontrak[];
  allExCustomers: ExCustomer[];
  onSuccess: () => void;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allCabang,
  allPosko,
  allUsers,
  allMediators,
  allExCustomers,
  onSuccess
}) => {
  const [namaKonsumen, setNamaKonsumen] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [sumberLead, setSumberLead] = useState<SalesAcquisitionSourceLead>('CANVASSING');
  const [jenisJaminan, setJenisJaminan] = useState<JenisJaminan>('R2');
  
  // Conditional References
  const [kdMed, setKdMed] = useState('');
  const [refNoPsbLama, setRefNoPsbLama] = useState('');
  
  // Assignment
  const [assignedUserId, setAssignedUserId] = useState(currentUser.id);
  const [selectedKdCabang, setSelectedKdCabang] = useState(currentUser.kd_cabang || 'C16');
  const [selectedKdPosko, setSelectedKdPosko] = useState(currentUser.kd_posko || 'QJ0');

  // Wilayah & Address (Mandatory)
  const [wilayahState, setWilayahState] = useState<SelectedWilayahState>({
    provinsiId: '',
    kabupatenId: '',
    kecamatanId: '',
    desaId: ''
  });
  const [alamatDetail, setAlamatDetail] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available AO users (filtered by posko/cabang if applicable)
  const availableAOs = useMemo(() => {
    return allUsers.filter(u => {
      if (u.status !== 'AKTIF') return false;
      if (u.role !== 'CMO' && u.role !== 'KAPOS') return false;
      if (currentUser.role === 'KAPOS' && currentUser.kd_posko) {
        return u.kd_posko === currentUser.kd_posko;
      }
      if (currentUser.role === 'KAOPS' || currentUser.role === 'ADM') {
        return u.kd_cabang === currentUser.kd_cabang;
      }
      return true;
    });
  }, [allUsers, currentUser]);

  // Selected AO User
  const targetAo = useMemo(() => {
    return allUsers.find(u => u.id === assignedUserId);
  }, [allUsers, assignedUserId]);

  // Duplicate Check on Phone
  const duplicateResult = useMemo(() => {
    return SalesAcquisitionService.checkDuplicate(noTelepon);
  }, [noTelepon]);

  useEffect(() => {
    if (isOpen) {
      setNamaKonsumen('');
      setNoTelepon('');
      setSumberLead('CANVASSING');
      setJenisJaminan('R2');
      setKdMed('');
      setRefNoPsbLama('');
      setAssignedUserId(currentUser.id);
      setSelectedKdCabang(currentUser.kd_cabang || 'C16');
      setSelectedKdPosko(currentUser.kd_posko || 'QJ0');
      setWilayahState({
        provinsiId: '',
        kabupatenId: '',
        kecamatanId: '',
        desaId: ''
      });
      setAlamatDetail('');
      setErrorMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (duplicateResult.hasDuplicate) {
      setErrorMessage('Nomor telepon ini sudah terdaftar pada prospek aktif lain. Harap periksa kembali!');
      return;
    }

    if (!jenisJaminan) {
      setErrorMessage('Pilih jenis jaminan pinjaman (R2 Motor, R4 Mobil, atau Sertifikat)!');
      return;
    }

    // Mandatory Wilayah validation
    if (
      !wilayahState.provinsiId ||
      !wilayahState.kabupatenId ||
      !wilayahState.kecamatanId ||
      !wilayahState.desaId
    ) {
      setErrorMessage('Wilayah domisili (Provinsi, Kabupaten/Kota, Kecamatan, dan Kelurahan/Desa) wajib dipilih lengkap!');
      return;
    }

    // Mandatory Alamat validation
    if (!alamatDetail.trim() || alamatDetail.trim().length < 5) {
      setErrorMessage('Alamat domisili lengkap / patokan wajib diisi minimal 5 karakter!');
      return;
    }

    setIsSubmitting(true);

    const res = await SalesAcquisitionService.createQuickEntryLead(
      {
        nama_calon_konsumen: namaKonsumen,
        no_telepon: noTelepon,
        sumber_lead: sumberLead,
        jenis_jaminan: jenisJaminan,
        kd_med: kdMed,
        ref_no_psb_lama: refNoPsbLama,
        assigned_user_id: targetAo ? targetAo.id : currentUser.id,
        kd_ao: targetAo?.kd_ao || currentUser.kd_ao || '',
        kd_cabang: targetAo?.kd_cabang || selectedKdCabang,
        kd_posko: targetAo?.kd_posko || selectedKdPosko,
        wilayah_provinsi_id: wilayahState.provinsiId,
        wilayah_kabupaten_id: wilayahState.kabupatenId,
        wilayah_kecamatan_id: wilayahState.kecamatanId,
        wilayah_desa_id: wilayahState.desaId,
        alamat_detail: alamatDetail
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
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/40">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Input Prospek Sales Baru</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  PROSPEK SALES
                </span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Input kilat data calon nasabah prospek sales untuk segera ditindaklanjuti.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Entry Primary Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Calon Konsumen */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
                <UserIcon className="h-3.5 w-3.5 text-blue-400" />
                <span>Nama Calon Konsumen <strong className="text-rose-400">*</strong></span>
              </label>
              <input
                type="text"
                required
                value={namaKonsumen}
                onChange={(e) => setNamaKonsumen(e.target.value)}
                placeholder="Contoh: Bpk. Ronald Pangemanan"
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#5c6479] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Nomor Telepon */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
                <Phone className="h-3.5 w-3.5 text-blue-400" />
                <span>Nomor Telepon / WhatsApp <strong className="text-rose-400">*</strong></span>
              </label>
              <input
                type="text"
                required
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                placeholder="Contoh: 081244556677"
                className={`w-full bg-[#181c28] border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#5c6479] focus:outline-none transition-colors ${
                  duplicateResult.hasDuplicate 
                    ? 'border-rose-500 focus:border-rose-400 bg-rose-950/20' 
                    : 'border-[#2c3345] focus:border-blue-500'
                }`}
              />
              {duplicateResult.hasDuplicate && duplicateResult.duplicateInfo && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-[11px] text-rose-200 space-y-0.5">
                  <div className="flex items-center space-x-1 text-rose-300 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Terdeteksi Duplikasi Nomor!</span>
                  </div>
                  <p>
                    Nomor sudah terdaftar aktif: <strong>{duplicateResult.duplicateInfo.nama_calon_konsumen}</strong> ({duplicateResult.duplicateInfo.status}, AO: {duplicateResult.duplicateInfo.kd_ao || '-'})
                  </p>
                </div>
              )}
            </div>

            {/* Sumber Lead */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
                <Share2 className="h-3.5 w-3.5 text-blue-400" />
                <span>Sumber Lead <strong className="text-rose-400">*</strong></span>
              </label>
              <select
                value={sumberLead}
                onChange={(e) => setSumberLead(e.target.value as SalesAcquisitionSourceLead)}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="CANVASSING">CANVASSING (Direct Hunting)</option>
                <option value="SOSMED">SOSMED (Facebook / IG / TikTok)</option>
                <option value="MEDIATOR">MEDIATOR (Mitra KAMM)</option>
                <option value="EX_CUSTOMER">EX_CUSTOMER (Nasabah BPKB Lunas)</option>
                <option value="WALK_IN">WALK_IN (Datang ke Kantor / Posko)</option>
              </select>
            </div>
          </div>

          {/* Jenis Jaminan Pinjaman (MANDATORY) */}
          <div className="space-y-2 p-3.5 bg-[#151926] border border-[#262f45] rounded-2xl">
            <label className="text-xs font-bold text-[#e0e4eb] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Jenis Jaminan Pinjaman <strong className="text-rose-400">*</strong></span>
              </span>
              <span className="text-[10px] text-amber-300 font-medium">Pilih salah satu (Wajib)</span>
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Option 1: R2 (Motor) */}
              <button
                type="button"
                onClick={() => setJenisJaminan('R2')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 transition-all cursor-pointer ${
                  jenisJaminan === 'R2'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-900/30'
                    : 'bg-[#181c28] border-[#2c3345] text-[#8e96a8] hover:text-white hover:border-[#3d4760]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${jenisJaminan === 'R2' ? 'bg-blue-600 text-white' : 'bg-[#202535] text-[#8e96a8]'}`}>
                  <Bike className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">1. R2 (Motor)</div>
                  <div className="text-[10px] text-[#8e96a8]">BPKB Sepeda Motor</div>
                </div>
              </button>

              {/* Option 2: R4 (Mobil) */}
              <button
                type="button"
                onClick={() => setJenisJaminan('R4')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 transition-all cursor-pointer ${
                  jenisJaminan === 'R4'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-900/30'
                    : 'bg-[#181c28] border-[#2c3345] text-[#8e96a8] hover:text-white hover:border-[#3d4760]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${jenisJaminan === 'R4' ? 'bg-purple-600 text-white' : 'bg-[#202535] text-[#8e96a8]'}`}>
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">2. R4 (Mobil)</div>
                  <div className="text-[10px] text-[#8e96a8]">BPKB Mobil / Truk</div>
                </div>
              </button>

              {/* Option 3: Sertifikat */}
              <button
                type="button"
                onClick={() => setJenisJaminan('SERTIFIKAT')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 transition-all cursor-pointer ${
                  jenisJaminan === 'SERTIFIKAT'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-900/30'
                    : 'bg-[#181c28] border-[#2c3345] text-[#8e96a8] hover:text-white hover:border-[#3d4760]'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${jenisJaminan === 'SERTIFIKAT' ? 'bg-emerald-600 text-white' : 'bg-[#202535] text-[#8e96a8]'}`}>
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">3. Sertifikat</div>
                  <div className="text-[10px] text-[#8e96a8]">SHM / SHGB Properti</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Input: MEDIATOR */}
          {sumberLead === 'MEDIATOR' && (
            <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-2">
              <label className="text-xs font-bold text-blue-200 flex items-center space-x-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <span>Pilih / Masukkan KD MED <strong className="text-rose-400">*</strong></span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={kdMed}
                  onChange={(e) => setKdMed(e.target.value.toUpperCase())}
                  placeholder="Ketik KD MED (contoh: MED-001)"
                  className="flex-1 bg-[#12151f] border border-[#2c3345] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-blue-300">
                Pilih mediator yang terdaftar di master data mediator KAMM Manado.
              </p>
            </div>
          )}

          {/* Conditional Input: EX_CUSTOMER */}
          {sumberLead === 'EX_CUSTOMER' && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
              <label className="text-xs font-bold text-amber-200 flex items-center space-x-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>No. PSB Lama Ex-Customer <strong className="text-rose-400">*</strong></span>
              </label>
              <input
                type="text"
                required
                value={refNoPsbLama}
                onChange={(e) => setRefNoPsbLama(e.target.value.toUpperCase())}
                placeholder="Contoh: PSB-2023-8899"
                className="w-full bg-[#12151f] border border-[#2c3345] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-amber-300">
                Wajib diisi nomor kontrak lama nasabah yang telah lunas BPKB-nya.
              </p>
            </div>
          )}

          {/* AO Assignment (For KAPOS, KAOPS, KACAB, SUPER_ADMIN) */}
          {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'KAOPS' || currentUser.role === 'KAPOS' || currentUser.role === 'ADM') && (
            <div className="space-y-1.5 pt-2 border-t border-[#232734]">
              <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Petugas AO / CMO yang Ditugaskan</span>
              </label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value={currentUser.id}>
                  {currentUser.nama} ({currentUser.role} • KD AO: {currentUser.kd_ao || '-'}) [Saya Sendiri]
                </option>
                {availableAOs
                  .filter(u => u.id !== currentUser.id)
                  .map(ao => (
                    <option key={ao.id} value={ao.id}>
                      {ao.nama} (KD AO: {ao.kd_ao || '-'} • Posko: {ao.kd_posko || '-'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Alamat & Master Wilayah Domisili (MANDATORI) */}
          <div className="border border-emerald-900/60 rounded-2xl overflow-hidden bg-[#0c0f16] p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Alamat &amp; Wilayah Domisili <strong className="text-rose-400">*</strong>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  MANDATORI
                </span>
              </div>
              <span className="text-[11px] text-[#8e96a8]">Wajib 4 Tingkat Administratif</span>
            </div>

            <WilayahCascadeSelector
              label="Pilih Wilayah Domisili Konsumen"
              initialValues={wilayahState}
              onChange={setWilayahState}
              required={true}
              showSummary={true}
            />

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-[#e0e4eb] flex items-center justify-between">
                <span>Alamat Lengkap / Patokan Jalan <strong className="text-rose-400">*</strong></span>
                <span className="text-[10px] text-[#8e96a8]">Maks 255 karakter (Min 5)</span>
              </label>
              <textarea
                rows={2}
                required
                maxLength={255}
                value={alamatDetail}
                onChange={(e) => setAlamatDetail(e.target.value)}
                placeholder="Contoh: Jl. Sam Ratulangi No. 45, Lingkungan III, Depan Gereja Sentrum (Wajib)"
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl p-2.5 text-xs text-white placeholder-[#5c6479] focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#2c3345] text-xs font-bold text-[#8e96a8] hover:text-white hover:bg-[#181c28] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || duplicateResult.hasDuplicate}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-blue-900/30 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Prospek Sales'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
