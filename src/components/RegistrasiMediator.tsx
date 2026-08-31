import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { ActiveTab } from './Sidebar';
import { 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Phone, 
  FileText, 
  Info,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Lock
} from 'lucide-react';

interface RegistrasiMediatorProps {
  onSuccess: () => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const RegistrasiMediator: React.FC<RegistrasiMediatorProps> = ({ onSuccess, onNavigate }) => {
  const { currentUser, allCabang, allPosko, identityReady } = useAuth();

  const isNational = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'RM';
  const isCMO = currentUser?.role === 'CMO';
  const isKaposOrAdm = currentUser?.role === 'KAPOS' || currentUser?.role === 'ADM';
  const isKaops = currentUser?.role === 'KAOPS';

  const defaultCabang = currentUser?.kd_cabang || (allCabang[0]?.kd_cabang || '');
  const initialPoskos = allPosko.filter(p => defaultCabang && p.kd_cabang.toUpperCase() === defaultCabang.toUpperCase());
  const defaultPosko = currentUser?.kd_posko || (initialPoskos[0]?.kd_posko || '');

  const [namaMediator, setNamaMediator] = useState('');
  const [noTlpn, setNoTlpn] = useState('');
  const [kdCabang, setKdCabang] = useState(defaultCabang);
  const [kdPosko, setKdPosko] = useState(defaultPosko);
  const [kdAo, setKdAo] = useState(currentUser?.kd_ao || '');
  const [catatan, setCatatan] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; tempCode?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state whenever currentUser or master data updates
  useEffect(() => {
    if (!currentUser) return;

    if (isCMO) {
      setKdCabang(currentUser.kd_cabang || '');
      setKdPosko(currentUser.kd_posko || '');
      setKdAo(currentUser.kd_ao || '');
    } else if (isKaposOrAdm) {
      setKdCabang(currentUser.kd_cabang || '');
      setKdPosko(currentUser.kd_posko || '');
      if (!kdAo && currentUser.kd_ao) {
        setKdAo(currentUser.kd_ao);
      }
    } else if (isKaops) {
      setKdCabang(currentUser.kd_cabang || '');
      if (!kdAo && currentUser.kd_ao) {
        setKdAo(currentUser.kd_ao);
      }
    } else if (isNational && !kdCabang && allCabang.length > 0) {
      const firstCab = allCabang[0].kd_cabang;
      setKdCabang(firstCab);
      const matchingPoskos = allPosko.filter(p => p.kd_cabang.toUpperCase() === firstCab.toUpperCase());
      if (matchingPoskos.length > 0) {
        setKdPosko(matchingPoskos[0].kd_posko);
      }
    }
  }, [currentUser, allCabang, allPosko, isCMO, isKaposOrAdm, isKaops, isNational]);

  const isCabangLocked = !isNational && !!currentUser?.kd_cabang;
  const isPoskoLocked = !isNational && (isCMO || isKaposOrAdm || !!currentUser?.kd_posko);
  const isAoLocked = isCMO;

  // Available poskos for selected cabang
  const availablePosko = allPosko.filter(p => !kdCabang || p.kd_cabang.toUpperCase() === kdCabang.toUpperCase());

  const handleCabangChange = (newCab: string) => {
    setKdCabang(newCab);
    const poskos = allPosko.filter(p => p.kd_cabang.toUpperCase() === newCab.toUpperCase());
    if (poskos.length > 0) {
      setKdPosko(poskos[0].kd_posko);
    } else {
      setKdPosko('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaMediator.trim()) {
      setFeedback({ type: 'error', message: 'Nama mediator wajib diisi!' });
      return;
    }
    if (namaMediator.trim().length > 100) {
      setFeedback({ type: 'error', message: 'Nama mediator melebihi 100 karakter!' });
      return;
    }
    if (!noTlpn.trim()) {
      setFeedback({ type: 'error', message: 'Nomor telepon wajib diisi!' });
      return;
    }

    if (!identityReady) {
      setFeedback({
        type: 'error',
        message: 'Identitas Firebase Auth Anda sedang disinkronisasikan ke Firestore. Mohon tunggu sejenak lalu coba kembali.'
      });
      return;
    }

    // Strict Scope Validation based on authenticated profile
    if (isCMO) {
      if (!currentUser?.kd_ao || !currentUser?.kd_cabang || !currentUser?.kd_posko) {
        setFeedback({ 
          type: 'error', 
          message: 'Data profil akun CMO Anda belum lengkap (Kode AO, Cabang, atau Posko tidak ditemukan). Silakan hubungi Administrator.' 
        });
        return;
      }
    }

    const effectiveKdAo = isCMO 
      ? currentUser.kd_ao.trim() 
      : (kdAo.trim() || currentUser?.kd_ao?.trim() || '');
    const effectiveKdCabang = (isCabangLocked && currentUser?.kd_cabang) 
      ? currentUser.kd_cabang.trim() 
      : kdCabang.trim();
    const effectiveKdPosko = (isPoskoLocked && currentUser?.kd_posko) 
      ? currentUser.kd_posko.trim() 
      : kdPosko.trim();

    if (!effectiveKdCabang) {
      setFeedback({ type: 'error', message: 'Kantor Cabang wajib dipilih!' });
      return;
    }
    if (isCMO && !effectiveKdPosko) {
      setFeedback({ type: 'error', message: 'Posko operasional CMO wajib ada!' });
      return;
    }
    if (!effectiveKdAo) {
      setFeedback({ type: 'error', message: 'Kode AO pendaftar wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await DatabaseService.registerMediator({
      nama_mediator: namaMediator.trim(),
      no_tlpn: noTlpn.trim(),
      kd_ao: effectiveKdAo,
      kd_posko: effectiveKdPosko,
      kd_cabang: effectiveKdCabang,
      created_by_user: currentUser?.nama || currentUser?.username || 'Petugas Registrasi',
      created_by_role: currentUser?.role || 'CMO',
      catatan_admin: catatan.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ 
        type: 'success', 
        message: result.message, 
        tempCode: result.data?.kd_med 
      });
      setNamaMediator('');
      setNoTlpn('');
      setCatatan('');
      onSuccess();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#232734]">
        <h1 className="text-xl font-bold text-[#f1f3f7] tracking-tight flex items-center space-x-2">
          <UserPlus className="h-5 w-5 text-blue-400" />
          <span>Form Registrasi Mediator Kontrak</span>
        </h1>
        <p className="text-xs text-[#8e96a8] mt-0.5">
          Pendaftaran mitra mediator baru oleh CMO, KAPOS, atau ADM. Data awal akan berstatus <strong className="text-blue-400">BELUM AKTIF</strong> untuk ditinjau oleh Admin.
        </p>
      </div>

      {/* Workflow Informational Card */}
      <div className="p-4 rounded-2xl bg-[#141a29] border border-[#253556] text-xs text-[#cbd5e1] space-y-2.5">
        <div className="flex items-center space-x-2 font-bold text-blue-300">
          <Info className="h-4 w-4 text-blue-400 shrink-0" />
          <span>Tahapan Alur Pendaftaran Mediator (Registration Workflow):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
          <div className="p-2.5 bg-[#10141f] rounded-xl border border-blue-900/50">
            <span className="font-bold text-blue-300 block mb-1">1. Pendaftaran Baru</span>
            <span className="text-[#a6adbb]">Oleh CMO/KAPOS/ADM dengan status <strong className="text-blue-400">BELUM AKTIF</strong>.</span>
          </div>
          <div className="p-2.5 bg-[#10141f] rounded-xl border border-amber-900/50">
            <span className="font-bold text-amber-300 block mb-1">2. Peninjauan Berkas</span>
            <span className="text-[#a6adbb]">Oleh <strong className="text-amber-400">ADMIN</strong> untuk verifikasi data (status berubah <strong className="text-amber-400">PENDING</strong>).</span>
          </div>
          <div className="p-2.5 bg-[#10141f] rounded-xl border border-emerald-900/50">
            <span className="font-bold text-emerald-300 block mb-1">3. Input KD MED & Aktivasi</span>
            <span className="text-[#a6adbb]">Oleh <strong className="text-emerald-400">KAPOS & Super Admin</strong> menetapkan KD MED resmi (status <strong className="text-emerald-400">AKTIF</strong>).</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium space-y-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
              : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="font-bold">{feedback.message}</span>
          </div>
          {feedback.type === 'success' && (
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => onNavigate('validasi')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1"
              >
                <span>Buka Menu Peninjauan & Validasi</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onNavigate('daftar-mediator')}
                className="px-3 py-1.5 bg-[#1a1d27] hover:bg-[#252a3a] text-[#c2c7d0] hover:text-white rounded-xl text-xs font-medium cursor-pointer border border-[#2e3446]"
              >
                Lihat di Daftar Mediator
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Data Identitas Mediator */}
          <div>
            <h2 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-blue-400" />
              <span>1. Identitas Calon Mediator</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] mb-1">
                  Nama Lengkap Mediator <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-nama-mediator"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Masukkan nama lengkap mediator (maksimal 100 karakter)"
                  value={namaMediator}
                  onChange={(e) => setNamaMediator(e.target.value)}
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <span className="text-[11px] text-[#6b7280] mt-1 block">
                  {namaMediator.length}/100 karakter
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] mb-1">
                  Nomor Telepon / WhatsApp <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-2.5 text-[#6b7280]" />
                  <input
                    id="input-no-tlpn"
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={noTlpn}
                    onChange={(e) => setNoTlpn(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Penempatan Wilayah & AO */}
          <div className="pt-4 border-t border-[#232734]">
            <h2 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span>2. Penempatan Cabang & Posko</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cabang */}
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] mb-1">
                  Kantor Cabang <span className="text-rose-400">*</span>
                </label>
                <select
                  id="select-cabang-reg"
                  value={kdCabang}
                  disabled={isCabangLocked}
                  onChange={(e) => handleCabangChange(e.target.value)}
                  className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${
                    isCabangLocked ? 'opacity-75 cursor-not-allowed bg-[#181a24]' : ''
                  }`}
                >
                  <option value="">-- Pilih Cabang --</option>
                  {allCabang.map((c) => (
                    <option key={c.kd_cabang} value={c.kd_cabang}>
                      {c.kd_cabang} - {c.nama_cabang}
                    </option>
                  ))}
                  {kdCabang && !allCabang.some(c => c.kd_cabang === kdCabang) && (
                    <option value={kdCabang}>{kdCabang}</option>
                  )}
                </select>
                {isCabangLocked && (
                  <span className="text-[10px] text-blue-400 mt-1 block">Terkunci sesuai wilayah akun Anda</span>
                )}
              </div>

              {/* Posko */}
              <div>
                <label className="block text-xs font-bold text-[#c2c7d0] mb-1">
                  Posko Operasional
                </label>
                <select
                  id="select-posko-reg"
                  value={kdPosko}
                  disabled={isPoskoLocked}
                  onChange={(e) => setKdPosko(e.target.value)}
                  className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${
                    isPoskoLocked ? 'opacity-75 cursor-not-allowed bg-[#181a24]' : ''
                  }`}
                >
                  <option value="">-- Kantor Cabang Utama / Bebas Posko --</option>
                  {availablePosko.map((p) => (
                    <option key={p.kd_posko} value={p.kd_posko}>
                      {p.kd_posko} - {p.nama_posko}
                    </option>
                  ))}
                  {kdPosko && !availablePosko.some(p => p.kd_posko === kdPosko) && (
                    <option value={kdPosko}>{kdPosko}</option>
                  )}
                </select>
                {isPoskoLocked && (
                  <span className="text-[10px] text-blue-400 mt-1 block">Terkunci sesuai posko akun Anda</span>
                )}
              </div>

              {/* Kode AO */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#c2c7d0] mb-1">
                  Kode AO / CMO Pendaftar <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-kd-ao"
                  type="text"
                  required
                  disabled={isAoLocked}
                  value={kdAo}
                  onChange={(e) => setKdAo(e.target.value.toUpperCase())}
                  placeholder="Contoh: AO-01 / CMO-01"
                  className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono ${
                    isAoLocked ? 'opacity-75 cursor-not-allowed bg-[#181a24]' : ''
                  }`}
                />
                {isAoLocked && (
                  <span className="text-[10px] text-blue-400 mt-1 block">Terkunci otomatis sesuai akun CMO Anda</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Catatan Pengajuan */}
          <div className="pt-4 border-t border-[#232734]">
            <label className="block text-xs font-bold text-[#c2c7d0] mb-1">
              Catatan Pendaftaran / Keterangan Berkas (Opsional)
            </label>
            <textarea
              id="input-catatan-reg"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan tambahan untuk tim Admin peninjau berkas..."
              className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#232734] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => onNavigate('daftar-mediator')}
              className="px-4 py-2.5 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-registrasi"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-950/50 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Daftarkan Mediator (BELUM AKTIF)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
