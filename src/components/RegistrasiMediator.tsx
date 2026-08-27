import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';

interface RegistrasiMediatorProps {
  onSuccess: () => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const RegistrasiMediator: React.FC<RegistrasiMediatorProps> = ({ onSuccess, onNavigate }) => {
  const { currentUser, allCabang, allPosko } = useAuth();

  const defaultCabang = currentUser?.kd_cabang || (allCabang[0]?.kd_cabang || '');
  const initialPoskos = allPosko.filter(p => defaultCabang && p.kd_cabang.toUpperCase() === defaultCabang.toUpperCase());
  const defaultPosko = currentUser?.kd_posko || (initialPoskos[0]?.kd_posko || '');

  const [namaMediator, setNamaMediator] = useState('');
  const [noTlpn, setNoTlpn] = useState('');
  const [kdCabang, setKdCabang] = useState(defaultCabang);
  const [kdPosko, setKdPosko] = useState(defaultPosko);
  const [kdAo, setKdAo] = useState(currentUser?.kd_ao || 'CMO-01');
  const [catatan, setCatatan] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; tempCode?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    setFeedback(null);

    const result = DatabaseService.registerMediator({
      nama_mediator: namaMediator.trim(),
      no_tlpn: noTlpn.trim(),
      kd_ao: kdAo || currentUser?.kd_ao || 'AO-REG',
      kd_posko: kdPosko,
      kd_cabang: kdCabang,
      created_by_user: currentUser?.nama || 'Petugas Registrasi',
      created_by_role: currentUser?.role,
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
          Pendaftaran mitra mediator baru oleh CMO, KAPOS, atau ADM. Data awal akan berstatus <strong className="text-amber-400">PENDING (Diajukan)</strong>.
        </p>
      </div>

      {/* Workflow Informational Card */}
      <div className="p-4 rounded-2xl bg-[#141a29] border border-[#253556] text-xs text-[#cbd5e1] space-y-2">
        <div className="flex items-center space-x-2 font-bold text-blue-300">
          <Info className="h-4 w-4 text-blue-400 shrink-0" />
          <span>Alur Kerja Status (Workflow Logic):</span>
        </div>
        <p className="leading-relaxed text-[#a6adbb]">
          1. Form ini mendaftarkan mediator dengan status <strong className="text-amber-400">PENDING</strong>.<br />
          2. Kode resmi <strong>KD MED</strong> akan diinput secara manual oleh <strong className="text-[#f1f3f7]">KAOPS</strong> atau <strong className="text-[#f1f3f7]">SUPER_ADMIN</strong> melalui menu <em>Validasi KD MED</em>.<br />
          3. Setelah KD MED diinput, status mediator otomatis berubah menjadi <strong className="text-emerald-400">AKTIF</strong>.
        </p>
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
                onClick={() => onNavigate('daftar-mediator')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1"
              >
                <span>Lihat di Daftar Mediator</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nama Mediator (max 100 chars) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide">
                Nama Mediator <span className="text-rose-400">*</span>
              </label>
              <span className={`text-[11px] font-mono ${namaMediator.length > 90 ? 'text-amber-400 font-bold' : 'text-[#6b7280]'}`}>
                {namaMediator.length} / 100 Karakter
              </span>
            </div>
            <input
              id="input-nama-mediator"
              type="text"
              required
              maxLength={100}
              value={namaMediator}
              onChange={(e) => setNamaMediator(e.target.value)}
              placeholder="Contoh: Haji Ahmad Sahroni, S.E."
              className="w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            <p className="text-[11px] text-[#6b7280] mt-1">Nama lengkap mediator sesuai KTP/Dokumen (Maks. 100 karakter).</p>
          </div>

          {/* Nomor Telepon / WA */}
          <div>
            <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
              Nomor Telepon / WhatsApp <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 absolute left-3 top-3 text-[#6b7280]" />
              <input
                id="input-no-tlpn"
                type="tel"
                required
                value={noTlpn}
                onChange={(e) => setNoTlpn(e.target.value)}
                placeholder="08123456789"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Grid: Cabang, Posko, KD AO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cabang */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide">
                  Cabang Penugasan <span className="text-rose-400">*</span>
                </label>
                {(currentUser?.role === 'KAPOS' || currentUser?.role === 'CMO') && currentUser?.kd_cabang && (
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                    Terkunci Cabang
                  </span>
                )}
              </div>
              <select
                id="select-kd-cabang"
                value={kdCabang}
                onChange={(e) => handleCabangChange(e.target.value)}
                disabled={(currentUser?.role === 'KAPOS' || currentUser?.role === 'CMO') && !!currentUser?.kd_cabang}
                className={`w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium ${
                  (currentUser?.role === 'KAPOS' || currentUser?.role === 'CMO') && currentUser?.kd_cabang ? 'opacity-80 cursor-not-allowed bg-[#181a24]' : 'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                }`}
              >
                {allCabang.map((cab) => (
                  <option key={cab.kd_cabang} value={cab.kd_cabang}>
                    {cab.kd_cabang} - {cab.nama_cabang}
                  </option>
                ))}
              </select>
            </div>

            {/* Posko */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide">
                  Posko Operasional <span className="text-rose-400">*</span>
                </label>
                {currentUser?.role === 'KAPOS' && currentUser?.kd_posko && (
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    Terkunci Posko
                  </span>
                )}
              </div>
              <select
                id="select-kd-posko"
                value={currentUser?.role === 'KAPOS' && currentUser?.kd_posko ? currentUser.kd_posko : kdPosko}
                onChange={(e) => setKdPosko(e.target.value)}
                disabled={currentUser?.role === 'KAPOS' && !!currentUser?.kd_posko}
                className={`w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium ${
                  currentUser?.role === 'KAPOS' && currentUser?.kd_posko ? 'opacity-80 cursor-not-allowed bg-[#181a24] text-emerald-300 font-bold' : 'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                }`}
              >
                <option value="">-- Kantor Cabang Utama / Posko Bebas --</option>
                {availablePosko.map((posko) => (
                  <option key={posko.kd_posko} value={posko.kd_posko}>
                    {posko.kd_posko} - {posko.nama_posko}
                  </option>
                ))}
                {kdPosko && !availablePosko.some(p => p.kd_posko.toUpperCase() === kdPosko.toUpperCase()) && (
                  <option value={kdPosko}>{kdPosko} (Tersimpan)</option>
                )}
              </select>
            </div>

            {/* KD AO */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide">
                  Kode AO Pendaftar
                </label>
                {currentUser?.role === 'CMO' && (
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                    Terkunci Akun CMO
                  </span>
                )}
              </div>
              <input
                id="input-kd-ao"
                type="text"
                value={currentUser?.role === 'CMO' ? (currentUser?.kd_ao || 'CMO-01') : kdAo}
                onChange={(e) => setKdAo(e.target.value)}
                disabled={currentUser?.role === 'CMO'}
                placeholder="CMO-01"
                className={`w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl font-mono font-medium ${
                  currentUser?.role === 'CMO' ? 'opacity-80 cursor-not-allowed bg-[#181a24] text-blue-300 font-bold' : 'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                }`}
              />
            </div>
          </div>

          {/* Catatan Tambahan / Admin */}
          <div>
            <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1.5">
              Catatan Pengajuan / Keterangan Dokumen
            </label>
            <textarea
              id="input-catatan-registrasi"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Keterangan referensi dealer, kelengkapan berkas KTP, atau area kerja mediator..."
              className="w-full p-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Status Badge Preview */}
          <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-300">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Status Awal Pendaftaran:</span>
            </div>
            <span className="font-bold px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/80">
              PENDING (Diajukan)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-3">
            <button
              id="btn-cancel-registrasi"
              type="button"
              onClick={() => onNavigate('daftar-mediator')}
              className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-registrasi"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              <span>Ajukan Registrasi Mediator (Status PENDING)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
