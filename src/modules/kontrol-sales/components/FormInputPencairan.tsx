import React, { useState } from 'react';
import { 
  PlusCircle, 
  Hash, 
  User as UserIcon, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  RotateCcw
} from 'lucide-react';
import { User, Cabang, Posko } from '../../../types';
import { SalesService } from '../services/salesService';
import { getWitaToday, formatToDDMMYYYY } from '../utils/slaUtils';
import { SingleDatePicker } from './SingleDatePicker';

interface FormInputPencairanProps {
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  onSuccess?: () => void;
  onNavigateToTable?: () => void;
}

export const FormInputPencairan: React.FC<FormInputPencairanProps> = ({
  currentUser,
  allCabang,
  allPosko,
  onSuccess,
  onNavigateToTable,
}) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isAdmDe = currentUser.role === 'ADM_DE';
  const canSelectAnyCabang = isSuperAdmin || isAdmDe || currentUser.role === 'RM';

  const defaultTglCair = formatToDDMMYYYY(getWitaToday());

  // Form Fields (Poin 2: Date Picker, Poin 4: Keterangan dihapus)
  const [tglCair, setTglCair] = useState<string>(defaultTglCair);
  const [noPsb, setNoPsb] = useState<string>('');
  const [namaKonsumen, setNamaKonsumen] = useState<string>('');
  const [noWa, setNoWa] = useState<string>('');

  // Cabang & Posko selection
  const [selectedCabang, setSelectedCabang] = useState<string>(
    currentUser.kd_cabang || (allCabang.length > 0 ? allCabang[0].kd_cabang : 'C16')
  );
  const [selectedPosko, setSelectedPosko] = useState<string>(
    currentUser.kd_posko || (allPosko.length > 0 ? allPosko[0].kd_posko : 'QJ0')
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtered posko list based on selected cabang
  const availablePosko = allPosko.filter(p => p.kd_cabang === selectedCabang);

  // Reset form
  const handleReset = () => {
    setTglCair(defaultTglCair);
    setNoPsb('');
    setNamaKonsumen('');
    setNoWa('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!tglCair || !/^\d{2}\/\d{2}\/\d{4}$/.test(tglCair.trim())) {
      setErrorMsg('Tanggal pencairan wajib dipilih melalui kalender Date Picker.');
      return;
    }

    const cleanPsb = noPsb.trim();
    if (!/^\d{8}$/.test(cleanPsb)) {
      setErrorMsg('NO PSB harus terdiri dari tepat 8 digit angka.');
      return;
    }

    const cleanNama = namaKonsumen.trim();
    if (!cleanNama) {
      setErrorMsg('Nama konsumen wajib diisi.');
      return;
    }

    const cleanWa = noWa.trim();
    if (!cleanWa.startsWith('08') || cleanWa.length < 10 || cleanWa.length > 15) {
      setErrorMsg('Nomor WhatsApp wajib diawali format "08..." dengan panjang 10-15 digit.');
      return;
    }

    if (!selectedCabang || !selectedPosko) {
      setErrorMsg('Cabang dan Posko wajib dipilih.');
      return;
    }

    setIsLoading(true);
    try {
      // Poin 4: Keterangan tidak disertakan di form awal, otomatis diisi string kosong "" oleh SalesService
      const res = await SalesService.createRecord(
        {
          tgl_cair: tglCair.trim(),
          no_psb: cleanPsb,
          nama_konsumen: cleanNama,
          no_wa: cleanWa,
          tgl_jt: tglCair.trim(),
          cabang_id: selectedCabang,
          posko_id: selectedPosko,
        },
        currentUser
      );

      if (res.success) {
        setSuccessMsg(res.message);
        handleReset();
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#141721] border border-[#272d3e] rounded-2xl shadow-xl overflow-visible">
        {/* Header */}
        <div className="p-6 border-b border-[#232734] bg-[#181a24] rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Form Input Laporan Pencairan Baru
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Role Penginput: <span className="font-semibold text-blue-300">{currentUser.role}</span> • Tercatat otomatis dengan status awal <span className="text-blue-400 font-bold">SUBMISS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
              {onNavigateToTable && (
                <button
                  type="button"
                  onClick={onNavigateToTable}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Lihat di Tabel &rarr;
                </button>
              )}
            </div>
          )}

          {/* Cabang & Posko Indicator / Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#181a24] rounded-xl border border-[#232734]">
            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5 flex items-center space-x-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                <span>Cabang Pencairan</span>
              </label>
              {canSelectAnyCabang ? (
                <select
                  value={selectedCabang}
                  onChange={(e) => {
                    setSelectedCabang(e.target.value);
                    const poskos = allPosko.filter(p => p.kd_cabang === e.target.value);
                    if (poskos.length > 0) setSelectedPosko(poskos[0].kd_posko);
                  }}
                  className="w-full bg-[#13151c] border border-[#272d3e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {allCabang.map((c) => (
                    <option key={c.kd_cabang} value={c.kd_cabang}>
                      {c.nama_cabang} ({c.kd_cabang})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-[#13151c] border border-[#272d3e] rounded-xl text-sm font-semibold text-white">
                  {allCabang.find(c => c.kd_cabang === selectedCabang)?.nama_cabang || selectedCabang} ({selectedCabang})
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5 flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Posko Operasional</span>
              </label>
              {canSelectAnyCabang || !currentUser.kd_posko ? (
                <select
                  value={selectedPosko}
                  onChange={(e) => setSelectedPosko(e.target.value)}
                  className="w-full bg-[#13151c] border border-[#272d3e] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {availablePosko.map((p) => (
                    <option key={p.kd_posko} value={p.kd_posko}>
                      {p.nama_posko} ({p.kd_posko})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-[#13151c] border border-[#272d3e] rounded-xl text-sm font-semibold text-white">
                  {allPosko.find(p => p.kd_posko === selectedPosko)?.nama_posko || selectedPosko} ({selectedPosko})
                </div>
              )}
            </div>
          </div>

          {/* Primary Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* TGL CAIR (Poin 2: Single Date Picker) */}
            <div>
              <SingleDatePicker
                id="input-tgl-cair"
                label="TGL CAIR (Kalender)"
                value={tglCair}
                onChange={setTglCair}
                required
                helperText="Pilih dari kalender interaktif (format otomatis: DD/MM/YYYY)."
              />
            </div>

            {/* NO PSB */}
            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5">
                NO PSB (Wajib 8 Digit) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={noPsb}
                  onChange={(e) => setNoPsb(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  placeholder="Contoh: 88201234"
                  maxLength={8}
                  required
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <Hash className="absolute right-3 top-3 h-4 w-4 text-[#8e96a8]" />
              </div>
              <p className="text-[11px] text-[#8e96a8] mt-1">
                Panjang karakter: {noPsb.length}/8 digit (Unique Key).
              </p>
            </div>

            {/* NAMA KONSUMEN */}
            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5">
                NAMA KONSUMEN <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={namaKonsumen}
                  onChange={(e) => setNamaKonsumen(e.target.value)}
                  placeholder="Nama lengkap konsumen"
                  maxLength={50}
                  required
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <UserIcon className="absolute right-3 top-3 h-4 w-4 text-[#8e96a8]" />
              </div>
              <p className="text-[11px] text-[#8e96a8] mt-1">
                Maksimal 50 karakter ({namaKonsumen.length}/50).
              </p>
            </div>

            {/* NO WA */}
            <div>
              <label className="block text-xs font-semibold text-[#8e96a8] mb-1.5">
                NOMOR WHATSAPP (08...) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={noWa}
                  onChange={(e) => setNoWa(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="08xxxxxxxxxx"
                  maxLength={15}
                  required
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <Phone className="absolute right-3 top-3 h-4 w-4 text-[#8e96a8]" />
              </div>
              <p className="text-[11px] text-[#8e96a8] mt-1">
                Format nomor WhatsApp aktif (contoh: 081234567890).
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#232734] flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Form</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-950/40 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Simpan Data Pencairan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
