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
  FileText,
  Search,
  ShieldCheck,
  Bike,
  Car,
  FileCheck2,
  Lock,
  Check,
  ChevronDown,
  Sparkles,
  Users
} from 'lucide-react';
import { User, Cabang, Posko, MediatorKontrak, ExCustomer } from '../../../types';
import { SalesAcquisitionSourceLead, JenisJaminan } from '../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';
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
  
  // Conditional References: MEDIATOR
  const [kdMed, setKdMed] = useState('');
  const [mediatorSearch, setMediatorSearch] = useState('');
  const [isMediatorPickerOpen, setIsMediatorPickerOpen] = useState(false);
  const [isManualKdMed, setIsManualKdMed] = useState(false);

  // Conditional References: EX_CUSTOMER
  const [refNoPsbLama, setRefNoPsbLama] = useState('');

  // Wilayah Domisili (Mandatory)
  const [wilayahState, setWilayahState] = useState<SelectedWilayahState>({
    provinsiId: '',
    kabupatenId: '',
    kecamatanId: '',
    desaId: ''
  });

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Matched Mediator from Kontrol Mediator
  const selectedMediator = useMemo(() => {
    if (!kdMed.trim()) return null;
    return allMediators.find(
      (m) => m.kd_med?.trim().toUpperCase() === kdMed.trim().toUpperCase()
    ) || null;
  }, [allMediators, kdMed]);

  // Filtered Mediators from Kontrol Mediator for selector
  const filteredMediators = useMemo(() => {
    const term = mediatorSearch.trim().toLowerCase();
    if (!term) {
      // Prioritaskan mediator aktif
      return [...allMediators].sort((a, b) => {
        if (a.status === 'AKTIF' && b.status !== 'AKTIF') return -1;
        if (a.status !== 'AKTIF' && b.status === 'AKTIF') return 1;
        return (a.kd_med || '').localeCompare(b.kd_med || '');
      }).slice(0, 40);
    }
    return allMediators.filter((m) => {
      const matchKd = (m.kd_med || '').toLowerCase().includes(term);
      const matchNama = (m.nama_mediator || '').toLowerCase().includes(term);
      const matchTlpn = (m.no_tlpn || '').includes(term);
      const matchPosko = (m.kd_posko || '').toLowerCase().includes(term);
      const matchAo = (m.kd_ao || '').toLowerCase().includes(term);
      return matchKd || matchNama || matchTlpn || matchPosko || matchAo;
    }).slice(0, 40);
  }, [allMediators, mediatorSearch]);

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
      setMediatorSearch('');
      setIsMediatorPickerOpen(false);
      setIsManualKdMed(false);
      setRefNoPsbLama('');
      setWilayahState({
        provinsiId: '',
        kabupatenId: '',
        kecamatanId: '',
        desaId: ''
      });
      setErrorMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSelectMediator = (med: MediatorKontrak) => {
    setKdMed(med.kd_med);
    setIsMediatorPickerOpen(false);
    setIsManualKdMed(false);
    setMediatorSearch('');
  };

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

    if (sumberLead === 'MEDIATOR' && !kdMed.trim()) {
      setErrorMessage('Pilih atau masukkan KD MED dari Kontrol Mediator sebagai sumber lead!');
      return;
    }

    if (sumberLead === 'EX_CUSTOMER' && !refNoPsbLama.trim()) {
      setErrorMessage('Masukkan nomor PSB lama untuk nasabah ex-customer!');
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

    setIsSubmitting(true);

    // AO Ref dikunci sesuai user yang menginput data:
    // Jika CMO yang menginput, otomatis menjadi petugas survei awalnya
    const aoCode = currentUser.kd_ao || '';
    const userCabang = currentUser.kd_cabang || 'C16';
    const userPosko = currentUser.kd_posko || 'QJ0';

    const res = await SalesAcquisitionService.createQuickEntryLead(
      {
        nama_calon_konsumen: namaKonsumen,
        no_telepon: noTelepon,
        sumber_lead: sumberLead,
        jenis_jaminan: jenisJaminan,
        kd_med: sumberLead === 'MEDIATOR' ? kdMed.trim().toUpperCase() : '',
        ref_no_psb_lama: sumberLead === 'EX_CUSTOMER' ? refNoPsbLama.trim().toUpperCase() : '',
        assigned_user_id: currentUser.id,
        kd_ao: aoCode,
        kd_cabang: userCabang,
        kd_posko: userPosko,
        wilayah_provinsi_id: wilayahState.provinsiId,
        wilayah_kabupaten_id: wilayahState.kabupatenId,
        wilayah_kecamatan_id: wilayahState.kecamatanId,
        wilayah_desa_id: wilayahState.desaId,
        alamat_detail: ''
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
            className="p-1.5 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors cursor-pointer"
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
                onChange={(e) => {
                  const val = e.target.value as SalesAcquisitionSourceLead;
                  setSumberLead(val);
                  if (val === 'MEDIATOR') {
                    setIsMediatorPickerOpen(true);
                  }
                }}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="CANVASSING">CANVASSING (Direct Hunting)</option>
                <option value="SOSMED">SOSMED (Facebook / IG / TikTok)</option>
                <option value="MEDIATOR">MEDIATOR (Mitra KAMM)</option>
                <option value="EX_CUSTOMER">EX_CUSTOMER (Nasabah BPKB Lunas)</option>
                <option value="WALK_IN">WALK_IN (Datang ke Kantor / Posko)</option>
              </select>
            </div>
          </div>

          {/* Jenis Jaminan Pinjaman (MANDATORI) */}
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

          {/* Conditional Input: MEDIATOR (Connected with Kontrol Mediator) */}
          {sumberLead === 'MEDIATOR' && (
            <div className="p-4 bg-[#141a29] border border-blue-800/70 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#232c42]">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-200">
                    Pilih / Masukkan KD MED (Kontrol Mediator) <strong className="text-rose-400">*</strong>
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  {allMediators.length} Mediator Terdaftar
                </span>
              </div>

              {/* If Mediator is Selected, Show Detail Card */}
              {selectedMediator && !isMediatorPickerOpen ? (
                <div className="p-3.5 bg-[#0f1422] border border-emerald-800/70 rounded-xl space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/80">
                          {selectedMediator.kd_med}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedMediator.status === 'AKTIF' 
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {selectedMediator.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white pt-1">
                        {selectedMediator.nama_mediator}
                      </h4>
                      <p className="text-[11px] text-[#8e96a8] flex items-center space-x-2">
                        <span>No. Telp: <strong className="text-emerald-400 font-mono">{selectedMediator.no_tlpn}</strong></span>
                        <span>•</span>
                        <span>Posko: <strong className="text-white">{selectedMediator.kd_posko || '-'}</strong></span>
                        <span>•</span>
                        <span>AO: <strong className="text-purple-300">{selectedMediator.kd_ao || '-'}</strong></span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMediatorPickerOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#2c3345] hover:border-blue-500 bg-[#161b29] hover:bg-blue-950/40 text-[11px] font-semibold text-blue-300 transition-colors cursor-pointer"
                    >
                      Ganti Mediator
                    </button>
                  </div>
                </div>
              ) : (
                /* Mediator Selector / Search Box */
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5c6479]" />
                    <input
                      type="text"
                      value={mediatorSearch}
                      onChange={(e) => setMediatorSearch(e.target.value)}
                      placeholder="Cari nama mediator, KD MED, atau nomor telepon..."
                      className="w-full bg-[#0e121d] border border-[#2c3345] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#5c6479] focus:outline-none focus:border-blue-500 transition-colors"
                      autoFocus={sumberLead === 'MEDIATOR'}
                    />
                  </div>

                  {/* List of Mediators from Kontrol Mediator */}
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-[#23293a] rounded-xl p-1.5 bg-[#0b0e17]">
                    {filteredMediators.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#5c6479]">
                        Tidak ada mediator ditemukan dengan kata kunci &quot;{mediatorSearch}&quot;
                      </div>
                    ) : (
                      filteredMediators.map((med) => {
                        const isSelected = kdMed.trim().toUpperCase() === med.kd_med?.trim().toUpperCase();
                        return (
                          <div
                            key={med.kd_med || med.temp_id || Math.random()}
                            onClick={() => handleSelectMediator(med)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white'
                                : 'bg-[#141824] hover:bg-[#1a2030] border-[#20273a] hover:border-[#333d59] text-[#c2c9d6]'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-blue-300">
                                  {med.kd_med || 'PENDING'}
                                </span>
                                <span className="font-semibold text-white">
                                  {med.nama_mediator}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                  med.status === 'AKTIF' ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-300'
                                }`}>
                                  {med.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#717b94]">
                                {med.no_tlpn} • Posko {med.kd_posko || '-'} • AO: {med.kd_ao || '-'}
                              </div>
                            </div>

                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-400 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Manual Typing Toggle */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[#8e96a8]">
                      KD MED saat ini: <strong className="font-mono text-white">{kdMed || '(Belum dipilih)'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManualKdMed(!isManualKdMed)}
                      className="text-blue-400 hover:underline cursor-pointer"
                    >
                      {isManualKdMed ? 'Tutup input manual' : 'Input KD MED manual'}
                    </button>
                  </div>

                  {isManualKdMed && (
                    <div className="pt-1.5 flex gap-2">
                      <input
                        type="text"
                        value={kdMed}
                        onChange={(e) => setKdMed(e.target.value.toUpperCase())}
                        placeholder="Contoh: MED-001"
                        className="flex-1 bg-[#0e121d] border border-[#2c3345] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setIsMediatorPickerOpen(false)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        Gunakan Kode
                      </button>
                    </div>
                  )}
                </div>
              )}
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

          {/* AO Ref (Locked automatically to user inputting data) */}
          <div className="space-y-1.5 p-3.5 bg-[#151926] border border-[#262f45] rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#e0e4eb] flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span>AO Ref</span>
              </label>
              <span className="text-[10px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Lock className="h-3 w-3 mr-0.5 text-indigo-400" />
                <span>Terkunci Otomatis</span>
              </span>
            </div>

            <div className="flex items-center space-x-3 bg-[#10131c] border border-[#232938] rounded-xl p-3">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0"></div>
              <div className="flex-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-white text-sm">
                    {currentUser.kd_ao ? `Kode AO: ${currentUser.kd_ao}` : `AO Ref: ${currentUser.username}`}
                  </span>
                  <span className="text-[11px] text-[#8e96a8]">
                    ({currentUser.nama} • {currentUser.role})
                  </span>
                </div>
                <div className="text-[11px] text-[#717b94] mt-0.5">
                  Posko: <strong className="text-white">{currentUser.kd_posko || 'QJ0'}</strong> • Cabang: <strong className="text-white">{currentUser.kd_cabang || 'C16'}</strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#8e96a8] leading-relaxed">
              {currentUser.role === 'CMO' ? (
                <span>
                  Sebagai <strong className="text-white">CMO</strong> yang menginput prospek ini, Anda otomatis menjadi petugas survei. Penugasan dapat dialihkan oleh <strong className="text-indigo-300">KACAB, RM, atau Super Admin</strong>.
                </span>
              ) : (
                <span>
                  Prospek dicatat dengan identitas AO Ref penginput. Penentuan petugas survei lapangan dilakukan oleh <strong className="text-indigo-300">KAPOS, KACAB, RM, atau Super Admin</strong> sesuai wewenangnya.
                </span>
              )}
            </p>
          </div>

          {/* Wilayah Domisili (MANDATORI - Alamat Lengkap / Patokan Jalan Dihapus Sesuai Instruksi) */}
          <div className="border border-emerald-900/60 rounded-2xl overflow-hidden bg-[#0c0f16] p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Wilayah Domisili <strong className="text-rose-400">*</strong>
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
