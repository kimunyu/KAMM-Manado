import React, { useState } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Briefcase, 
  FileText, 
  ExternalLink, 
  Download, 
  Trash2, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  GraduationCap,
  Car,
  ShieldCheck,
  Send,
  AlertCircle
} from 'lucide-react';
import { User as AuthUser } from '../../../types';
import { JobApplicant, StatusLamaran, WILAYAH_PENEMPATAN_MAPPING } from '../types';
import { RekrutmenService } from '../services/rekrutmenService';
import { ConfirmDeleteModal } from '../../../components/ConfirmDeleteModal';

interface Props {
  applicant: JobApplicant;
  currentUser: AuthUser;
  onClose: () => void;
  onUpdated: () => void;
}

export const ApplicantDetailModal: React.FC<Props> = ({
  applicant,
  currentUser,
  onClose,
  onUpdated
}) => {
  const [status, setStatus] = useState<StatusLamaran>(applicant.status);
  const [catatan, setCatatan] = useState(applicant.catatan_interview || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCv, setIsLoadingCv] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const mapping = WILAYAH_PENEMPATAN_MAPPING[applicant.wilayah_penempatan];

  // Open CV in new tab
  const handlePreviewCv = async () => {
    setIsLoadingCv(true);
    try {
      await RekrutmenService.previewCvInNewTab(applicant);
    } catch (err: any) {
      alert(err.message || 'Gagal membuka berkas CV');
    } finally {
      setIsLoadingCv(false);
    }
  };

  // Download CV directly
  const handleDownloadCv = async () => {
    setIsLoadingCv(true);
    try {
      const blob = await RekrutmenService.getApplicantCvBlob(applicant);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = applicant.cv_file_name || `CV_${applicant.nama_lengkap}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh berkas CV');
    } finally {
      setIsLoadingCv(false);
    }
  };

  // Save Status & Notes
  const handleSaveEvaluation = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await RekrutmenService.updateApplicantStatus(
        applicant.id,
        status,
        catatan,
        currentUser
      );
      onUpdated();
      onClose();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Gagal menyimpan evaluasi' });
    } finally {
      setIsSaving(false);
    }
  };

  // Purge File Only (Storage optimization)
  const handlePurgeFiles = async () => {
    try {
      await RekrutmenService.purgeApplicantFilesOnly(applicant.id);
      onUpdated();
      setConfirmPurge(false);
      setFeedback({ type: 'success', message: 'Berkas CV fisik dan foto pelamar telah dibersihkan dari penyimpanan.' });
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Gagal membersihkan berkas' });
    }
  };

  // Delete Entire Applicant Record
  const handleExecuteDeleteApplicant = async () => {
    try {
      await RekrutmenService.deleteApplicant(applicant.id);
      onUpdated();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Gagal menghapus data pelamar' });
      setShowDeleteConfirm(false);
    }
  };

  const waLink = RekrutmenService.createWhatsAppLink(applicant);

  const STATUS_OPTIONS: { val: StatusLamaran; label: string; color: string }[] = [
    { val: 'BARU', label: 'Baru Masuk', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    { val: 'REVIEW_BERKAS', label: 'Review Berkas', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { val: 'INTERVIEW', label: 'Panggilan Interview', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    { val: 'DITERIMA', label: 'Diterima / Lolos', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { val: 'DITOLAK', label: 'Ditolak / Gugur', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0e121d] border border-[#232a3f] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto text-slate-200">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-[#232a3f] flex items-center justify-between bg-[#121626]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg">
                Detail Berkas Calon Pelamar
              </h3>
              <span className="text-xs font-mono text-emerald-400">
                {applicant.nomor_registrasi}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#1f263d] rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {feedback && (
            <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="flex-1">{feedback.message}</span>
            </div>
          )}

          {/* Top Banner: Foto + Info Utama */}
          <div className="p-4 bg-[#141828] border border-[#232b45] rounded-xl flex flex-col sm:flex-row gap-5 items-start">
            {/* Pas Foto Preview */}
            <div className="shrink-0 mx-auto sm:mx-0">
              {applicant.pas_foto_base64 ? (
                <img
                  src={applicant.pas_foto_base64}
                  alt={applicant.nama_lengkap}
                  className="w-24 h-32 sm:w-28 sm:h-36 object-cover rounded-xl border border-blue-500/40 shadow-lg"
                />
              ) : (
                <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl border border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <User className="w-8 h-8 mb-1" />
                  <span>Foto Bersih</span>
                </div>
              )}
            </div>

            {/* Profile Summary */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {applicant.nama_lengkap}
                </h4>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  STATUS_OPTIONS.find(s => s.val === applicant.status)?.color
                }`}>
                  {STATUS_OPTIONS.find(s => s.val === applicant.status)?.label || applicant.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block">Posisi Dilamar:</span>
                  <strong className="text-blue-400 font-semibold">{applicant.posisi_dilamar}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Wilayah Penempatan:</span>
                  <strong className="text-amber-400 font-semibold">
                    {applicant.wilayah_penempatan} ({mapping?.nama_cabang})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Nomor WhatsApp:</span>
                  <span className="font-mono text-slate-200">{applicant.no_wa}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Jenis Kelamin / Usia:</span>
                  <span>{applicant.jenis_kelamin} • {applicant.usia} Tahun</span>
                </div>
              </div>

              {/* Action Hubungi WA Cepat */}
              <div className="pt-2">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Chat WhatsApp Pelamar</span>
                </a>
              </div>
            </div>
          </div>

          {/* Grid Informasi Lengkap */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Box 1: Identitas & Domisili */}
            <div className="p-4 bg-[#131726] border border-[#222942] rounded-xl space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block text-blue-400 border-b border-[#222942] pb-1.5">
                Domisili & Fasilitas
              </span>
              <div>
                <span className="text-slate-400 block">Alamat Domisili:</span>
                <span className="text-slate-200 block">{applicant.alamat_domisili}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tempat & Tanggal Lahir:</span>
                <span className="text-slate-200 block">
                  {applicant.tempat_lahir ? `${applicant.tempat_lahir}, ` : ''}{applicant.tgl_lahir}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Kepemilikan Kendaraan & SIM:</span>
                <div className="flex flex-wrap gap-1.5">
                  {applicant.punya_motor && (
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">Motor</span>
                  )}
                  {applicant.punya_mobil && (
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">Mobil</span>
                  )}
                  {applicant.punya_sim_c && (
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">SIM C</span>
                  )}
                  {applicant.punya_sim_a && (
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">SIM A</span>
                  )}
                  {!applicant.punya_motor && !applicant.punya_mobil && !applicant.punya_sim_c && !applicant.punya_sim_a && (
                    <span className="text-slate-500 italic">Tidak ada keterangan SIM/Kendaraan</span>
                  )}
                </div>
              </div>
            </div>

            {/* Box 2: Pendidikan & Pengalaman */}
            <div className="p-4 bg-[#131726] border border-[#222942] rounded-xl space-y-2.5">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block text-blue-400 border-b border-[#222942] pb-1.5">
                Pendidikan & Pengalaman Kerja
              </span>
              <div>
                <span className="text-slate-400 block">Pendidikan Terakhir:</span>
                <strong className="text-white block">{applicant.pendidikan_terakhir}</strong>
                {applicant.nama_institusi && (
                  <span className="text-slate-300 block">{applicant.nama_institusi} {applicant.jurusan ? `• ${applicant.jurusan}` : ''}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">Status Pengalaman:</span>
                <span className="text-emerald-400 font-semibold block">{applicant.status_pengalaman}</span>
                {applicant.status_pengalaman === 'Pernah Bekerja' && (
                  <div className="mt-1 p-2 bg-[#0c0f18] rounded border border-[#1f263d] text-[11px] space-y-0.5">
                    <div>Perusahaan: <strong>{applicant.perusahaan_terakhir || '-'}</strong></div>
                    <div>Posisi: <strong>{applicant.posisi_terakhir || '-'}</strong></div>
                    <div>Lama Kerja: <strong>{applicant.lama_bekerja || '-'}</strong></div>
                  </div>
                )}
              </div>
              {applicant.deskripsi_keahlian && (
                <div>
                  <span className="text-slate-400 block">Catatan Keahlian / Motivasi:</span>
                  <p className="text-slate-300 italic text-[11px] bg-[#0c0f18] p-2 rounded border border-[#1f263d]">
                    "{applicant.deskripsi_keahlian}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Box 3: Berkas CV PDF */}
          <div className="p-4 bg-[#131726] border border-[#222942] rounded-xl">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] block text-emerald-400 border-b border-[#222942] pb-1.5 mb-3">
              Berkas Lampiran Curriculum Vitae (CV)
            </span>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d101a] p-3 rounded-xl border border-[#21283e]">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-white text-xs block truncate">
                    {applicant.cv_file_name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {(applicant.cv_file_size / (1024 * 1024)).toFixed(2)} MB • Format Dokumen PDF
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isLoadingCv || applicant.cv_file_name === '[BERKAS DIBERSIHKAN]'}
                  onClick={handlePreviewCv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka CV</span>
                </button>
                <button
                  type="button"
                  disabled={isLoadingCv || applicant.cv_file_name === '[BERKAS DIBERSIHKAN]'}
                  onClick={handleDownloadCv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#232a40] hover:bg-[#2d3652] disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-[#333d5c] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
              </div>
            </div>

            {/* Tombol Pembersihan Berkas Fisik jika sudah selesai */}
            {applicant.cv_file_name !== '[BERKAS DIBERSIHKAN]' && (
              <div className="mt-3 pt-3 border-t border-[#1e2538] flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Penyimpanan berkas:
                </span>
                {confirmPurge ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-red-400 font-semibold">Yakin bersihkan berkas?</span>
                    <button
                      type="button"
                      onClick={handlePurgeFiles}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-medium"
                    >
                      Ya, Bersihkan
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPurge(false)}
                      className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmPurge(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Bersihkan Berkas Fisik (Hemat Ruang Penyimpanan)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Box 4: Penilaian & Evaluasi HRD */}
          <div className="p-4 bg-[#131726] border border-[#222942] rounded-xl space-y-3">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] block text-purple-400 border-b border-[#222942] pb-1.5">
              Evaluasi & Status Seleksi Internal
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ubah Status Tahapan Seleksi:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusLamaran)}
                  className="w-full bg-[#0c0f18] border border-[#28314e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.val} value={opt.val}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Catatan Wawancara / Hasil Seleksi:
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Hasil interview, catatan kepribadian, kelayakan pelamar..."
                  className="w-full bg-[#0c0f18] border border-[#28314e] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {applicant.reviewed_by_name && (
              <span className="text-[10px] text-slate-400 block pt-1">
                Terakhir ditinjau oleh: {applicant.reviewed_by_name} pada {applicant.reviewed_at ? new Date(applicant.reviewed_at).toLocaleDateString('id-ID') : '-'}
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#121626] border-t border-[#232a3f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1f263d] hover:bg-[#28314e] text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {['SUPER_ADMIN', 'RM', 'KACAB', 'KAOPS'].includes(currentUser.role) && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Pelamar</span>
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveEvaluation}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-purple-900/30 cursor-pointer"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Evaluasi'}
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Pelamar */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Hapus Data Pelamar"
        itemName={applicant.nama_lengkap}
        itemCode={applicant.nomor_registrasi}
        description={`Apakah Anda yakin ingin menghapus data pelamar ${applicant.nama_lengkap} (${applicant.posisi_dilamar} - ${applicant.wilayah_penempatan})? Seluruh data lampiran dan riwayat seleksinya akan dihapus permanen dari sistem.`}
        confirmButtonText="Ya, Hapus Pelamar"
        onConfirm={handleExecuteDeleteApplicant}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
