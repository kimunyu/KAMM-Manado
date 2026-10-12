import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Info,
  Building2,
  Users
} from 'lucide-react';
import { User } from '../../../types';
import { 
  WilayahPenempatan, 
  MasterPosisiLowongan, 
  WILAYAH_PENEMPATAN_MAPPING, 
  MASTER_POSISI_LIST, 
  JobVacancy 
} from '../types';
import { RekrutmenService, getVacancyDocId } from '../services/rekrutmenService';

interface Props {
  currentUser: User;
}

export const JobVacanciesManager: React.FC<Props> = ({ currentUser }) => {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [selectedWilayah, setSelectedWilayah] = useState<WilayahPenempatan>('RANOTANA');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Determine allowed regions based on user's role and cabang
  const isNational = ['SUPER_ADMIN', 'RM', 'ADM_DE'].includes(currentUser.role);
  const userCabang = currentUser.kd_cabang?.trim().toUpperCase();

  // Region list
  const ALL_REGIONS: WilayahPenempatan[] = [
    'RANOTANA',
    'TUMINTING',
    'BITUNG',
    'TONDANO',
    'LANGOWAN'
  ];

  // Filter regions accessible by this user
  const accessibleRegions = ALL_REGIONS.filter(wil => {
    if (isNational) return true;
    const mapping = WILAYAH_PENEMPATAN_MAPPING[wil];
    return mapping.kd_cabang.toUpperCase() === userCabang;
  });

  // Keep selected region within accessible
  useEffect(() => {
    if (accessibleRegions.length > 0 && !accessibleRegions.includes(selectedWilayah)) {
      setSelectedWilayah(accessibleRegions[0]);
    }
  }, [accessibleRegions, selectedWilayah]);

  // Subscribe to real-time vacancies
  useEffect(() => {
    const unsub = RekrutmenService.subscribeVacancies((list) => {
      setVacancies(list);
    });

    // Ensure default vacancies exists
    RekrutmenService.ensureDefaultVacancies(currentUser);

    return () => unsub();
  }, [currentUser]);

  // Check if position is active for selected region
  const getVacancyState = (wil: WilayahPenempatan, pos: MasterPosisiLowongan) => {
    const docId = getVacancyDocId(wil, pos);
    const found = vacancies.find(v => v.id === docId || (v.wilayah === wil && v.posisi === pos));
    return {
      isActive: found ? found.is_active : false,
      vacancy: found
    };
  };

  // Toggle Vacancy Status
  const handleToggle = async (pos: MasterPosisiLowongan, currentActive: boolean) => {
    const docId = getVacancyDocId(selectedWilayah, pos);
    setIsUpdating(docId);
    try {
      await RekrutmenService.setVacancyStatus(
        selectedWilayah,
        pos,
        !currentActive,
        currentUser,
        !currentActive ? 'Dibuka oleh manajemen' : 'Ditutup oleh manajemen'
      );
    } catch (err) {
      console.error('Gagal toggle lowongan:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  // Copy Public Applicant Link
  const publicUrl = `${window.location.origin}${window.location.pathname}?page=karir`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleOpenPreview = () => {
    window.open(publicUrl, '_blank');
  };

  const currentMapping = WILAYAH_PENEMPATAN_MAPPING[selectedWilayah];
  const activeCountForSelected = MASTER_POSISI_LIST.filter(p => getVacancyState(selectedWilayah, p).isActive).length;

  return (
    <div className="space-y-6">
      {/* Shareable Link Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#13192c] to-[#0f1322] border border-blue-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Share2 className="w-4 h-4" />
            <span>Tautan Publik Portal Pelamar Kerja (Zero Login)</span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Bagikan tautan ini ke calon pelamar atau pasang di media sosial / poster lowongan kerja. 
            Calon pelamar dapat langsung melamar tanpa perlu login dan tanpa melihat form login admin.
          </p>
          <div className="pt-1 font-mono text-[11px] text-blue-300 bg-[#090c14] px-3 py-1.5 rounded-lg border border-[#21273d] inline-block truncate max-w-full">
            {publicUrl}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/30 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Tautan Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Tautan Pelamar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenPreview}
            title="Buka Pratinjau Portal Pelamar di Tab Baru"
            className="p-2.5 bg-[#1b2136] hover:bg-[#252d47] text-slate-200 border border-[#2e3757] rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Region Selector Pills */}
      <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e2337] pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Pilih Wilayah Penempatan untuk Kelola Lowongan</span>
            </h3>
            <span className="text-xs text-slate-400">
              Hak akses: {isNational ? 'Seluruh Wilayah (Nasional)' : `Cabang ${userCabang}`}
            </span>
          </div>

          <div className="text-xs text-slate-300 bg-[#161a29] px-3 py-1.5 rounded-lg border border-[#262c42]">
            Wilayah Aktif: <strong className="text-emerald-400">{selectedWilayah}</strong> ({activeCountForSelected} Posisi Dibuka)
          </div>
        </div>

        {/* Region Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ALL_REGIONS.map((wil) => {
            const isAccessible = accessibleRegions.includes(wil);
            const isSelected = selectedWilayah === wil;
            const mapping = WILAYAH_PENEMPATAN_MAPPING[wil];
            const activeCount = MASTER_POSISI_LIST.filter(p => getVacancyState(wil, p).isActive).length;

            return (
              <button
                key={wil}
                type="button"
                disabled={!isAccessible}
                onClick={() => setSelectedWilayah(wil)}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-md ring-1 ring-blue-500'
                    : isAccessible
                    ? 'bg-[#151928] border-[#22283e] hover:border-slate-600'
                    : 'bg-[#10131d] border-[#181c2b] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold tracking-wide ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {wil}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    activeCount > 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {activeCount} Buka
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {mapping.nama_cabang}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {mapping.nama_posko}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Cards Grid for Selected Region */}
      <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-[#1e2337]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              <span>Daftar Posisi Lowongan di Wilayah {selectedWilayah}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dipetakan ke: <strong>{currentMapping.nama_cabang} ({currentMapping.kd_cabang})</strong> • <strong>{currentMapping.nama_posko} ({currentMapping.kd_posko})</strong>
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Hanya posisi berstatus <strong className="text-emerald-400">DIBUKA</strong> yang akan muncul di dropdown formulir pelamar.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MASTER_POSISI_LIST.map((posisi) => {
            const { isActive, vacancy } = getVacancyState(selectedWilayah, posisi);
            const docId = getVacancyDocId(selectedWilayah, posisi);
            const isBusy = isUpdating === docId;

            return (
              <div
                key={posisi}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#14192b] border-emerald-500/30 shadow-md shadow-emerald-950/20'
                    : 'bg-[#121522] border-[#202538]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-sm text-white leading-snug">
                      {posisi}
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      isActive
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isActive ? 'DIBUKA' : 'DITUTUP'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3">
                    {posisi === 'CMO (Credit Marketing Officer)' && 'Credit Marketing Officer untuk akuisisi aplikasi dan pembiayaan.'}
                    {posisi === 'Staff Admin' && 'Administrasi operasional kantor cabang / posko.'}
                    {posisi === 'Kolektor/Jasa Penagihan' && 'Penagihan angsuran dan pemeliharaan nasabah di lapangan.'}
                    {posisi === 'Buser/Remedial collection' && 'Penanganan debitur menunggak dan penarikan unit bermasalah.'}
                    {posisi === 'Kepala Posko' && 'Memimpin operasional dan target sales di posko pelayanan.'}
                    {posisi === 'Kordinator Wilayah Collection' && 'Koordinasi dan supervisi tim collection wilayah.'}
                  </p>

                  {vacancy?.updated_at && (
                    <div className="text-[10px] text-slate-500 mb-4 border-t border-[#1e2337] pt-2">
                      Diperbarui: {new Date(vacancy.updated_at).toLocaleDateString('id-ID')} oleh {vacancy.updated_by_name}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1e2337]/60 flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    Status Lowongan:
                  </span>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggle(posisi, isActive)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/30'
                    }`}
                  >
                    {isBusy ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : isActive ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tutup Lowongan</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Buka Lowongan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
