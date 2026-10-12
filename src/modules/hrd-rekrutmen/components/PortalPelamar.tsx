import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  MapPin, 
  User, 
  Phone, 
  Calendar, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Check, 
  Camera, 
  Car, 
  GraduationCap, 
  Clock, 
  Building, 
  ArrowRight,
  Printer,
  Sparkles
} from 'lucide-react';
import { KammLogo } from '../../../components/KammLogo';
import { 
  WilayahPenempatan, 
  MasterPosisiLowongan, 
  WILAYAH_PENEMPATAN_MAPPING, 
  PendidikanTerakhir, 
  StatusPengalamanKerja 
} from '../types';
import { RekrutmenService, compressImage } from '../services/rekrutmenService';

export const PortalPelamar: React.FC = () => {
  // Step / Submitted State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    id: string;
    nomor_registrasi: string;
    nama: string;
    posisi: string;
    wilayah: string;
    tgl_daftar: string;
  } | null>(null);

  // Form State - Bagian 1
  const [selectedWilayah, setSelectedWilayah] = useState<WilayahPenempatan | ''>('');
  const [availablePositions, setAvailablePositions] = useState<MasterPosisiLowongan[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [selectedPosisi, setSelectedPosisi] = useState<MasterPosisiLowongan | ''>('');

  // Form State - Bagian 2: Data Diri
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noWa, setNoWa] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [alamatDomisili, setAlamatDomisili] = useState('');
  const [punyaMotor, setPunyaMotor] = useState(false);
  const [punyaMobil, setPunyaMobil] = useState(false);
  const [punyaSimC, setPunyaSimC] = useState(false);
  const [punyaSimA, setPunyaSimA] = useState(false);

  // Form State - Bagian 3: Pendidikan & Pengalaman
  const [pendidikanTerakhir, setPendidikanTerakhir] = useState<PendidikanTerakhir>('SMA / SMK');
  const [namaInstitusi, setNamaInstitusi] = useState('');
  const [jurusan, setJurusan] = useState('');
  const [statusPengalaman, setStatusPengalaman] = useState<StatusPengalamanKerja>('Fresh Graduate');
  const [perusahaanTerakhir, setPerusahaanTerakhir] = useState('');
  const [posisiTerakhir, setPosisiTerakhir] = useState('');
  const [lamaBekerja, setLamaBekerja] = useState('');

  // Form State - Bagian 4: Dokumen
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCompressedBase64, setPhotoCompressedBase64] = useState<string>('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Process / Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Calculate age from birth date
  const hitungUsia = (tgl: string): number => {
    if (!tgl) return 0;
    const birth = new Date(tgl);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };

  // Fetch dynamic positions when wilayah changes
  useEffect(() => {
    if (!selectedWilayah) {
      setAvailablePositions([]);
      setSelectedPosisi('');
      return;
    }

    let isMounted = true;
    setIsLoadingPositions(true);
    setSelectedPosisi('');

    RekrutmenService.getActivePositionsForWilayah(selectedWilayah)
      .then((positions) => {
        if (isMounted) {
          setAvailablePositions(positions);
          setIsLoadingPositions(false);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat lowongan:', err);
        if (isMounted) {
          setAvailablePositions([]);
          setIsLoadingPositions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedWilayah]);

  // Handle Photo Upload & Compress
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Berkas pas foto wajib berupa gambar (JPG atau PNG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Ukuran pas foto maksimal 2 MB');
      return;
    }

    try {
      const compressed = await compressImage(file, 600, 0.78);
      setPhotoPreview(compressed);
      setPhotoCompressedBase64(compressed);
    } catch (err) {
      console.error('Kompresi foto gagal:', err);
      setPhotoError('Gagal memproses gambar foto. Coba gunakan foto lain.');
    }
  };

  // Handle CV PDF File Upload
  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && file.type !== 'application/pdf') {
      setCvError('Hanya menerima file CV dalam format PDF (.pdf)');
      setCvFile(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCvError(`Ukuran file CV (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB`);
      setCvFile(null);
      return;
    }

    setCvFile(file);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validations
    if (!selectedWilayah) {
      setSubmitError('Pilih wilayah penempatan yang diminati terlebih dahulu.');
      return;
    }
    if (!selectedPosisi) {
      setSubmitError('Pilih posisi pekerjaan yang ingin Anda lamar.');
      return;
    }
    if (!namaLengkap.trim()) {
      setSubmitError('Nama lengkap sesuai KTP wajib diisi.');
      return;
    }
    if (!noWa.trim()) {
      setSubmitError('Nomor WhatsApp aktif wajib diisi.');
      return;
    }
    if (!tglLahir) {
      setSubmitError('Tanggal lahir wajib diisi.');
      return;
    }
    if (!alamatDomisili.trim()) {
      setSubmitError('Alamat domisili saat ini wajib diisi.');
      return;
    }
    if (!photoCompressedBase64) {
      setSubmitError('Pas foto terbaru wajib diunggah.');
      return;
    }
    if (!cvFile) {
      setSubmitError('Curriculum Vitae (CV) format PDF (maks 2 MB) wajib diunggah.');
      return;
    }
    if (!agreeTerms) {
      setSubmitError('Harap centang persetujuan kebenaran data sebelum mengirim.');
      return;
    }

    setIsSubmitting(true);

    try {
      const mapping = WILAYAH_PENEMPATAN_MAPPING[selectedWilayah];
      const usia = hitungUsia(tglLahir);

      const applicantPayload = {
        wilayah_penempatan: selectedWilayah,
        posisi_dilamar: selectedPosisi,
        kd_cabang: mapping.kd_cabang,
        kd_posko: mapping.kd_posko,

        namaLengkap: namaLengkap.trim(),
        nama_lengkap: namaLengkap.trim(),
        no_wa: noWa.trim(),
        jenis_kelamin: jenisKelamin,
        tempat_lahir: tempatLahir.trim(),
        tgl_lahir: tglLahir,
        usia,
        alamat_domisili: alamatDomisili.trim(),

        punya_motor: punyaMotor,
        punya_mobil: punyaMobil,
        punya_sim_c: punyaSimC,
        punya_sim_a: punyaSimA,

        pendidikan_terakhir: pendidikanTerakhir,
        nama_institusi: namaInstitusi.trim(),
        jurusan: jurusan.trim(),
        status_pengalaman: statusPengalaman,
        perusahaan_terakhir: statusPengalaman === 'Pernah Bekerja' ? perusahaanTerakhir.trim() : '',
        posisi_terakhir: statusPengalaman === 'Pernah Bekerja' ? posisiTerakhir.trim() : '',
        lama_bekerja: statusPengalaman === 'Pernah Bekerja' ? lamaBekerja.trim() : '',
        deskripsi_keahlian: '',

        pas_foto_base64: photoCompressedBase64,
        cv_file_name: cvFile.name,
        cv_file_size: cvFile.size,
        cv_mime_type: 'application/pdf'
      };

      const result = await RekrutmenService.submitApplicant(applicantPayload, cvFile);

      setSubmissionResult({
        id: result.id,
        nomor_registrasi: result.nomor_registrasi,
        nama: namaLengkap.trim(),
        posisi: selectedPosisi,
        wilayah: selectedWilayah,
        tgl_daftar: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Pengiriman lamaran gagal:', err);
      setSubmitError(err.message || 'Terjadi kesalahan sistem saat mengirim lamaran. Silakan coba beberapa saat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wilayah Checklist Option List
  const WILAYAH_OPTIONS: WilayahPenempatan[] = [
    'RANOTANA',
    'TUMINTING',
    'BITUNG',
    'TONDANO',
    'LANGOWAN'
  ];

  // SUCCESS SUBMISSION VIEW
  if (isSubmitted && submissionResult) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
        {/* Public Header */}
        <header className="h-14 border-b border-[#161a26] bg-[#090c14]/90 backdrop-blur-md sticky top-0 z-30 flex items-center">
          <div className="max-w-4xl mx-auto px-4 w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#0e121d] border border-[#232b45] p-1 flex items-center justify-center shrink-0 shadow-sm">
                <KammLogo variant="icon" className="h-full w-full" />
              </div>
              <div>
                <span className="font-bold text-white tracking-tight text-xs sm:text-sm block leading-tight">KSP Anugrah Mega Mandiri</span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block">Portal Rekrutmen Resmi</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-[#121522] px-2.5 py-1 rounded-full border border-[#202538]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verifikasi Berkas Aman</span>
            </div>
          </div>
        </header>

        {/* Success Card */}
        <main className="max-w-2xl mx-auto px-4 py-12 w-full flex-1 flex flex-col justify-center">
          <div className="bg-[#0f1320] border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                Lamaran Berhasil Terkirim!
              </h1>
              <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
                Terima kasih telah melamar di <strong className="text-white">KSP Anugrah Mega Mandiri</strong>. Berkas lamaran Anda telah tercatat secara resmi di sistem kami.
              </p>

              {/* Tanda Terima Registrasi */}
              <div className="bg-[#151929] border border-[#242b45] rounded-xl p-5 text-left mb-6 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#242b45] pb-3 gap-1">
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Nomor Registrasi</span>
                  <span className="font-mono text-base font-bold text-emerald-400 bg-emerald-950/40 px-3 py-0.5 rounded border border-emerald-500/30">
                    {submissionResult.nomor_registrasi}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Nama Pelamar:</span>
                    <strong className="text-white text-sm block">{submissionResult.nama}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Waktu Pendaftaran:</span>
                    <span className="text-slate-200 block">{submissionResult.tgl_daftar}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Posisi Dilamar:</span>
                    <span className="text-blue-400 font-semibold block">{submissionResult.posisi}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Wilayah Penempatan:</span>
                    <span className="text-amber-400 font-semibold block">{submissionResult.wilayah}</span>
                  </div>
                </div>
              </div>

              {/* Panduan Selanjutnya */}
              <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 text-left text-xs text-slate-300 space-y-2 mb-6">
                <div className="flex items-center gap-2 font-semibold text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Tahapan Selanjutnya:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Tim HRD KSP Anugrah Mega Mandiri akan meninjau kelengkapan berkas CV dan kualifikasi Anda.</li>
                  <li>Kandidat yang memenuhi kualifikasi akan dihubungi langsung melalui <strong className="text-white">WhatsApp</strong> untuk jadwal wawancara (*interview*).</li>
                  <li>Pastikan nomor WhatsApp Anda selalu aktif dan dapat dihubungi.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1b2033] hover:bg-[#232a44] text-slate-200 rounded-xl font-medium text-xs border border-[#2c3452] transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Simpan Bukti Pendaftaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmissionResult(null);
                    setSelectedWilayah('');
                    setSelectedPosisi('');
                    setNamaLengkap('');
                    setNoWa('');
                    setAlamatDomisili('');
                    setPhotoPreview(null);
                    setPhotoCompressedBase64('');
                    setCvFile(null);
                    setAgreeTerms(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-emerald-900/30"
                >
                  <span>Kirim Formulir Baru</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Public Footer */}
        <footer className="border-t border-[#1b1f2e] bg-[#090b12] py-4 text-center text-xs text-slate-300">
          <p>© {new Date().getFullYear()} KSP Anugrah Mega Mandiri. Hak Cipta Dilindungi Undang-Undang.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Public Header - No Login Links Ever - Slim & Proportional */}
      <header className="h-14 border-b border-[#161a26] bg-[#090c14]/90 backdrop-blur-md sticky top-0 z-30 flex items-center">
        <div className="max-w-4xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#0e121d] border border-[#232b45] p-1 flex items-center justify-center shrink-0 shadow-sm">
              <KammLogo variant="icon" className="h-full w-full" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-xs sm:text-sm block leading-tight">
                KSP Anugrah Mega Mandiri
              </span>
              <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block">
                Portal Rekrutmen Calon Pelamar
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Pendaftaran Terbuka</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 w-full flex-1">
        {/* Hero Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium mb-2">
            <Briefcase className="w-3 h-3" />
            <span>Peluang Karir KSP Anugrah Mega Mandiri</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight mb-1.5">
            Formulir Pendaftaran Calon Pelamar
          </h1>
        </div>

        {/* Global Error Banner if any */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <strong className="font-semibold block mb-0.5">Perhatian:</strong>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ============================================================ */}
          {/* BAGIAN 1: POSISI & PENEMPATAN KERJA                         */}
          {/* ============================================================ */}
          <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 border-b border-[#1e2337] pb-4 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Posisi & Wilayah Penempatan</h2>
                <p className="text-xs text-slate-300">Tentukan wilayah penempatan kerja yang Anda tuju</p>
              </div>
            </div>

            {/* Checklist Wilayah Penempatan */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Pilih Wilayah Penempatan <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {WILAYAH_OPTIONS.map((wil) => {
                  const isSelected = selectedWilayah === wil;
                  return (
                    <button
                      key={wil}
                      type="button"
                      onClick={() => setSelectedWilayah(wil)}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-200 relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                          : 'bg-[#151928] border-[#22283e] text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <MapPin className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-sm tracking-wide block">{wil}</span>
                      <span className="text-[10px] text-slate-400 block mt-1">Sulawesi Utara</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dropdown Posisi Dinamis Sesuai Wilayah */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Posisi yang Dilamar <span className="text-red-400">*</span>
              </label>

              {!selectedWilayah ? (
                <div className="p-3.5 rounded-xl bg-[#141724] border border-[#22283e] text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Silakan pilih salah satu <strong>Wilayah Penempatan</strong> di atas terlebih dahulu untuk melihat lowongan yang tersedia.</span>
                </div>
              ) : isLoadingPositions ? (
                <div className="p-3.5 rounded-xl bg-[#141724] border border-[#22283e] text-xs text-blue-400 flex items-center gap-2 animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <span>Memeriksa ketersediaan posisi lowongan di wilayah {selectedWilayah}...</span>
                </div>
              ) : availablePositions.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Lowongan Belum Dibuka</span>
                  </div>
                  <p>
                    Saat ini belum ada posisi lowongan aktif yang dibuka untuk wilayah penempatan <strong>{selectedWilayah}</strong>. 
                    Silakan pilih wilayah penempatan lainnya yang sedang membuka kesempatan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedPosisi}
                    onChange={(e) => setSelectedPosisi(e.target.value as MasterPosisiLowongan)}
                    className="w-full bg-[#151928] border border-[#262c45] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    required
                  >
                    <option value="">-- Pilih Posisi Pekerjaan yang Dibuka --</option>
                    {availablePositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pl-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tersedia {availablePositions.length} posisi yang sedang aktif dibuka di wilayah {selectedWilayah}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* BAGIAN 2: DATA DIRI PELAMAR                                 */}
          {/* ============================================================ */}
          <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 border-b border-[#1e2337] pb-4 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Data Diri Pelamar</h2>
                <p className="text-xs text-slate-300">Informasi identitas pribadi dan kontak komunikasi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-5">
              {/* Nama Lengkap */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap (Sesuai KTP) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Contoh: Juan Manuel Pangalila"
                    className="w-full bg-[#151928] border border-[#262c45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* No WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp / HP Aktif <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={noWa}
                    onChange={(e) => setNoWa(e.target.value)}
                    placeholder="081234567890"
                    className="w-full bg-[#151928] border border-[#262c45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Pastikan nomor ini aktif WhatsApp untuk panggilan wawancara</span>
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jenis Kelamin <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJenisKelamin('Laki-laki')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      jenisKelamin === 'Laki-laki'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                        : 'bg-[#151928] border-[#262c45] text-slate-400 hover:text-white'
                    }`}
                  >
                    Laki-laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisKelamin('Perempuan')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                      jenisKelamin === 'Perempuan'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                        : 'bg-[#151928] border-[#262c45] text-slate-400 hover:text-white'
                    }`}
                  >
                    Perempuan
                  </button>
                </div>
              </div>

              {/* Tempat Lahir */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                  placeholder="Contoh: Manado"
                  className="w-full bg-[#151928] border border-[#262c45] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Tanggal Lahir & Usia */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tanggal Lahir <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={tglLahir}
                    onChange={(e) => setTglLahir(e.target.value)}
                    className="w-full bg-[#151928] border border-[#262c45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                {tglLahir && (
                  <span className="text-[11px] text-blue-400 mt-1 block">
                    Usia: <strong>{hitungUsia(tglLahir)} tahun</strong>
                  </span>
                )}
              </div>

              {/* Alamat Domisili */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Alamat Domisili Saat Ini <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={alamatDomisili}
                  onChange={(e) => setAlamatDomisili(e.target.value)}
                  placeholder="Nama Jalan, Kelurahan, Kecamatan, Kota/Kabupaten domisili saat ini..."
                  className="w-full bg-[#151928] border border-[#262c45] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Kepemilikan Kendaraan & SIM */}
            <div className="border-t border-[#1e2337] pt-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Kepemilikan Kendaraan & SIM (Pilihan)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151928] border border-[#22283e] cursor-pointer hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={punyaMotor}
                    onChange={(e) => setPunyaMotor(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 bg-[#0d0f18] border-slate-600 w-4 h-4"
                  />
                  <span className="text-xs text-slate-200">Sepeda Motor</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151928] border border-[#22283e] cursor-pointer hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={punyaMobil}
                    onChange={(e) => setPunyaMobil(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 bg-[#0d0f18] border-slate-600 w-4 h-4"
                  />
                  <span className="text-xs text-slate-200">Mobil</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151928] border border-[#22283e] cursor-pointer hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={punyaSimC}
                    onChange={(e) => setPunyaSimC(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 bg-[#0d0f18] border-slate-600 w-4 h-4"
                  />
                  <span className="text-xs text-slate-200">SIM C</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151928] border border-[#22283e] cursor-pointer hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={punyaSimA}
                    onChange={(e) => setPunyaSimA(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 bg-[#0d0f18] border-slate-600 w-4 h-4"
                  />
                  <span className="text-xs text-slate-200">SIM A</span>
                </label>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* BAGIAN 3: PENDIDIKAN & PENGALAMAN KERJA                      */}
          {/* ============================================================ */}
          <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 border-b border-[#1e2337] pb-4 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Pendidikan & Pengalaman</h2>
                <p className="text-xs text-slate-300">Riwayat edukasi dan pengalaman kerja terdahulu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Pendidikan Terakhir */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Pendidikan Terakhir <span className="text-red-400">*</span>
                </label>
                <select
                  value={pendidikanTerakhir}
                  onChange={(e) => setPendidikanTerakhir(e.target.value as PendidikanTerakhir)}
                  className="w-full bg-[#151928] border border-[#262c45] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="SMA / SMK">SMA / SMK</option>
                  <option value="Diploma (D1 - D3)">Diploma (D1 - D3)</option>
                  <option value="Sarjana (S1)">Sarjana (S1)</option>
                  <option value="Magister (S2)">Magister (S2)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Nama Institusi */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Sekolah / Universitas
                </label>
                <input
                  type="text"
                  value={namaInstitusi}
                  onChange={(e) => setNamaInstitusi(e.target.value)}
                  placeholder="Contoh: UNSRAT Manado"
                  className="w-full bg-[#151928] border border-[#262c45] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Jurusan */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jurusan
                </label>
                <input
                  type="text"
                  value={jurusan}
                  onChange={(e) => setJurusan(e.target.value)}
                  placeholder="Contoh: Manajemen / Akuntansi"
                  className="w-full bg-[#151928] border border-[#262c45] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Status Pengalaman Kerja */}
            <div className="border-t border-[#1e2337] pt-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Status Pengalaman Kerja <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setStatusPengalaman('Fresh Graduate')}
                  className={`p-3 rounded-xl border text-xs text-left transition-all ${
                    statusPengalaman === 'Fresh Graduate'
                      ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                      : 'bg-[#151928] border-[#22283e] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block font-semibold mb-0.5">Fresh Graduate</span>
                  <span className="text-[10px] text-slate-400">Lulusan baru / belum ada pengalaman</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusPengalaman('Pernah Bekerja')}
                  className={`p-3 rounded-xl border text-xs text-left transition-all ${
                    statusPengalaman === 'Pernah Bekerja'
                      ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                      : 'bg-[#151928] border-[#22283e] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block font-semibold mb-0.5">Pernah Bekerja</span>
                  <span className="text-[10px] text-slate-400">Memiliki riwayat pengalaman kerja</span>
                </button>
              </div>

              {/* Rincian Jika Pernah Bekerja */}
              {statusPengalaman === 'Pernah Bekerja' && (
                <div className="p-4 bg-[#141826] border border-[#22283e] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Perusahaan Terakhir
                    </label>
                    <input
                      type="text"
                      value={perusahaanTerakhir}
                      onChange={(e) => setPerusahaanTerakhir(e.target.value)}
                      placeholder="Nama PT / Instansi"
                      className="w-full bg-[#0d0f18] border border-[#29304c] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Posisi Terakhir
                    </label>
                    <input
                      type="text"
                      value={posisiTerakhir}
                      onChange={(e) => setPosisiTerakhir(e.target.value)}
                      placeholder="Jabatan terakhir"
                      className="w-full bg-[#0d0f18] border border-[#29304c] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Lama Bekerja
                    </label>
                    <input
                      type="text"
                      value={lamaBekerja}
                      onChange={(e) => setLamaBekerja(e.target.value)}
                      placeholder="Contoh: 1 tahun 6 bulan"
                      className="w-full bg-[#0d0f18] border border-[#29304c] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* BAGIAN 4: LAMPIRAN DOKUMEN                                  */}
          {/* ============================================================ */}
          <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-5 sm:p-7 shadow-lg">
            <div className="flex items-center gap-3 border-b border-[#1e2337] pb-4 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Lampiran Dokumen</h2>
                <p className="text-xs text-slate-300">Unggah pas foto terbaru dan berkas CV PDF (Maks 2 MB)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* UPLOAD PAS FOTO */}
              <div className="bg-[#141826] border border-[#22283e] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>Pas Foto Terbaru</span>
                      <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 bg-[#1c2236] px-2 py-0.5 rounded">JPG / PNG (Maks 2MB)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Foto formal berpakaian rapi dengan latar belakang bebas/polos.
                  </p>

                  {/* Hidden Input */}
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {/* Preview or Button */}
                  {photoPreview ? (
                    <div className="flex items-center gap-4 p-3 bg-[#0c0f18] rounded-xl border border-[#28304c]">
                      <img
                        src={photoPreview}
                        alt="Preview Pas Foto"
                        className="w-20 h-24 object-cover rounded-lg border border-blue-500/40 shadow"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Foto Siap Diunggah</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mb-2">Otomatis dioptimasi untuk transmisi cepat</p>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="px-3 py-1 bg-[#22283e] hover:bg-[#2e3754] text-slate-200 text-xs rounded-lg transition-colors font-medium"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#2b334d] hover:border-blue-500 rounded-xl p-6 text-center transition-all bg-[#0d101a] group cursor-pointer"
                    >
                      <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white block">
                        Pilih Pas Foto
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Format JPG atau PNG (Maksimal 2 MB)
                      </span>
                    </button>
                  )}

                  {photoError && (
                    <span className="text-xs text-red-400 mt-2 block">{photoError}</span>
                  )}
                </div>
              </div>

              {/* UPLOAD CURRICULUM VITAE (CV) PDF MAX 2MB */}
              <div className="bg-[#141826] border border-[#22283e] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Curriculum Vitae (CV)</span>
                      <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Khusus PDF (Maks 2 MB)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Wajib menyertakan CV berformat PDF yang mencakup riwayat hidup Anda.
                  </p>

                  {/* Hidden Input */}
                  <input
                    type="file"
                    ref={cvInputRef}
                    onChange={handleCvChange}
                    accept="application/pdf,.pdf"
                    className="hidden"
                  />

                  {cvFile ? (
                    <div className="p-3 bg-[#0c0f18] rounded-xl border border-emerald-500/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white truncate block">
                              {cvFile.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Ukuran: {(cvFile.size / (1024 * 1024)).toFixed(2)} MB • Format PDF Terverifikasi
                            </span>
                          </div>
                        </div>
                        <span className="text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => cvInputRef.current?.click()}
                          className="px-3 py-1 bg-[#22283e] hover:bg-[#2e3754] text-slate-200 text-xs rounded-lg transition-colors font-medium"
                        >
                          Ganti Berkas CV
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cvInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#2b334d] hover:border-emerald-500 rounded-xl p-6 text-center transition-all bg-[#0d101a] group cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white block">
                        Pilih File CV (Format PDF)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Ketat hanya menerima ekstensi <strong className="text-emerald-400">.pdf</strong> maksimal 2 MB
                      </span>
                    </button>
                  )}

                  {cvError && (
                    <span className="text-xs text-red-400 mt-2 block">{cvError}</span>
                  )}
                </div>
              </div>
            </div>

            {/* CHECKBOX PERNYATAAN KEBENARAN DATA */}
            <div className="mt-6 pt-5 border-t border-[#1e2337]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-0 bg-[#0d0f18] border-slate-600 w-4 h-4 shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  Saya menyatakan bahwa seluruh data dan berkas yang saya lampirkan pada formulir ini adalah benar, sah, dan dapat dipertanggungjawabkan. Saya bersedia mengikuti seluruh tahapan seleksi yang ditentukan oleh <strong className="text-white">KSP Anugrah Mega Mandiri</strong>.
                </span>
              </label>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2 text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto min-w-[280px] px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide text-white transition-all shadow-xl ${
                isSubmitting
                  ? 'bg-blue-800 cursor-not-allowed opacity-75'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memproses & Mengirimkan Lamaran...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>KIRIM LAMARAN KERJA SEKARANG</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </button>
            <p className="text-[11px] text-slate-400 mt-3">
              Data Anda dilindungi oleh kebijakan privasi rekrutmen KSP Anugrah Mega Mandiri dan hanya digunakan untuk kepentingan seleksi ketenagakerjaan.
            </p>
          </div>
        </form>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#1b1f2e] bg-[#090b12] py-5 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} KSP Anugrah Mega Mandiri Sulawesi Utara. Rekrutmen Resmi.</span>
          <span className="text-[11px] text-slate-400">Manado • Tuminting • Bitung • Tondano • Langowan</span>
        </div>
      </footer>
    </div>
  );
};
