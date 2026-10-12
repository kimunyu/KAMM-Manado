import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MapPin, 
  Briefcase, 
  FileText, 
  ExternalLink, 
  Send, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Phone,
  RefreshCw,
  Building
} from 'lucide-react';
import { User } from '../../../types';
import { 
  JobApplicant, 
  StatusLamaran, 
  WilayahPenempatan, 
  MasterPosisiLowongan, 
  MASTER_POSISI_LIST,
  WILAYAH_PENEMPATAN_MAPPING 
} from '../types';
import { RekrutmenService } from '../services/rekrutmenService';
import { ApplicantDetailModal } from './ApplicantDetailModal';
import { ConfirmDeleteModal } from '../../../components/ConfirmDeleteModal';

interface Props {
  currentUser: User;
}

export const ApplicantListTable: React.FC<Props> = ({ currentUser }) => {
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWilayahFilter, setSelectedWilayahFilter] = useState<string>('SEMUA');
  const [selectedPosisiFilter, setSelectedPosisiFilter] = useState<string>('SEMUA');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('SEMUA');
  const [selectedApplicant, setSelectedApplicant] = useState<JobApplicant | null>(null);
  const [applicantToDelete, setApplicantToDelete] = useState<JobApplicant | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe applicants
  useEffect(() => {
    setIsLoading(true);
    const unsub = RekrutmenService.subscribeApplicants(currentUser, (list) => {
      setApplicants(list);
      setIsLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Filtered List
  const filteredApplicants = useMemo(() => {
    return applicants.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.nama_lengkap.toLowerCase().includes(query);
        const matchPhone = item.no_wa.includes(query);
        const matchReg = item.nomor_registrasi.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchReg) return false;
      }

      // Wilayah
      if (selectedWilayahFilter !== 'SEMUA' && item.wilayah_penempatan !== selectedWilayahFilter) {
        return false;
      }

      // Posisi
      if (selectedPosisiFilter !== 'SEMUA' && item.posisi_dilamar !== selectedPosisiFilter) {
        return false;
      }

      // Status
      if (selectedStatusFilter !== 'SEMUA' && item.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [applicants, searchTerm, selectedWilayahFilter, selectedPosisiFilter, selectedStatusFilter]);

  // KPI Counters
  const kpiStats = useMemo(() => {
    return {
      total: applicants.length,
      baru: applicants.filter(a => a.status === 'BARU').length,
      review: applicants.filter(a => a.status === 'REVIEW_BERKAS').length,
      interview: applicants.filter(a => a.status === 'INTERVIEW').length,
      diterima: applicants.filter(a => a.status === 'DITERIMA').length,
      ditolak: applicants.filter(a => a.status === 'DITOLAK').length,
    };
  }, [applicants]);

  const canDeleteApplicants = ['SUPER_ADMIN', 'RM', 'KACAB', 'KAOPS'].includes(currentUser.role);

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!applicantToDelete) return;
    const target = applicantToDelete;
    try {
      await RekrutmenService.deleteApplicant(target.id);
      setDeleteFeedback({
        type: 'success',
        message: `Data pelamar ${target.nama_lengkap} (${target.nomor_registrasi}) berhasil dihapus permanen.`
      });
      setTimeout(() => setDeleteFeedback(null), 4000);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err?.message || 'Gagal menghapus data pelamar.'
      });
      setTimeout(() => setDeleteFeedback(null), 6000);
    } finally {
      setApplicantToDelete(null);
    }
  };

  const getStatusBadge = (status: StatusLamaran) => {
    switch (status) {
      case 'BARU':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">BARU MASUK</span>;
      case 'REVIEW_BERKAS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">REVIEW BERKAS</span>;
      case 'INTERVIEW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">INTERVIEW</span>;
      case 'DITERIMA':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">DITERIMA</span>;
      case 'DITOLAK':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">DITOLAK</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const WILAYAH_LIST: WilayahPenempatan[] = [
    'RANOTANA',
    'TUMINTING',
    'BITUNG',
    'TONDANO',
    'LANGOWAN'
  ];

  return (
    <div className="space-y-6">
      {/* KPI Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[#0f1320] border border-[#1e2337] rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Pelamar</span>
          <span className="text-xl font-extrabold text-white">{kpiStats.total}</span>
        </div>
        <div className="p-3.5 bg-[#0f1320] border border-blue-500/20 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">Baru Masuk</span>
          <span className="text-xl font-extrabold text-blue-300">{kpiStats.baru}</span>
        </div>
        <div className="p-3.5 bg-[#0f1320] border border-amber-500/20 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Review Berkas</span>
          <span className="text-xl font-extrabold text-amber-300">{kpiStats.review}</span>
        </div>
        <div className="p-3.5 bg-[#0f1320] border border-purple-500/20 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider">Interview</span>
          <span className="text-xl font-extrabold text-purple-300">{kpiStats.interview}</span>
        </div>
        <div className="p-3.5 bg-[#0f1320] border border-emerald-500/20 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Lolos / Diterima</span>
          <span className="text-xl font-extrabold text-emerald-300">{kpiStats.diterima}</span>
        </div>
        <div className="p-3.5 bg-[#0f1320] border border-rose-500/20 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">Ditolak / Gugur</span>
          <span className="text-xl font-extrabold text-rose-300">{kpiStats.ditolak}</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {deleteFeedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
          deleteFeedback.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
        }`}>
          {deleteFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="flex-1">{deleteFeedback.message}</span>
          <button 
            type="button" 
            onClick={() => setDeleteFeedback(null)}
            className="p-1 hover:opacity-80 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan nama pelamar, no WA, atau no registrasi..."
              className="w-full bg-[#151928] border border-[#242a42] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            {/* Filter Wilayah */}
            <select
              value={selectedWilayahFilter}
              onChange={(e) => setSelectedWilayahFilter(e.target.value)}
              className="bg-[#151928] border border-[#242a42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="SEMUA">Semua Wilayah</option>
              {WILAYAH_LIST.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Filter Posisi */}
            <select
              value={selectedPosisiFilter}
              onChange={(e) => setSelectedPosisiFilter(e.target.value)}
              className="bg-[#151928] border border-[#242a42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 max-w-[160px] truncate"
            >
              <option value="SEMUA">Semua Posisi</option>
              {MASTER_POSISI_LIST.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-[#151928] border border-[#242a42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="BARU">Baru Masuk</option>
              <option value="REVIEW_BERKAS">Review Berkas</option>
              <option value="INTERVIEW">Interview</option>
              <option value="DITERIMA">Diterima</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#1a1f33]">
          <span>
            Menampilkan <strong>{filteredApplicants.length}</strong> dari total <strong>{applicants.length}</strong> pelamar
          </span>
          {(searchTerm || selectedWilayahFilter !== 'SEMUA' || selectedPosisiFilter !== 'SEMUA' || selectedStatusFilter !== 'SEMUA') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedWilayahFilter('SEMUA');
                setSelectedPosisiFilter('SEMUA');
                setSelectedStatusFilter('SEMUA');
              }}
              className="text-blue-400 hover:text-blue-300 text-xs underline"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0f1320] border border-[#1e2337] rounded-2xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3" />
            <span className="text-xs">Memuat data pelamar kerja...</span>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-400 mb-1">Belum Ada Pelamar Ditemukan</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Tidak ada data pelamar yang sesuai dengan filter pencarian atau belum ada calon pelamar yang mengirimkan formulir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1f253b] bg-[#131728] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">NO & REG</th>
                  <th className="py-3.5 px-4">CALON PELAMAR</th>
                  <th className="py-3.5 px-4">POSISI & PENEMPATAN</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181d2f]">
                {filteredApplicants.map((item, idx) => {
                  const mapping = WILAYAH_PENEMPATAN_MAPPING[item.wilayah_penempatan];
                  const waLink = RekrutmenService.createWhatsAppLink(item);

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-[#131828]/60 transition-colors group"
                    >
                      {/* NO & REG */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className="text-slate-500 text-[10px] block font-mono">#{idx + 1}</span>
                        <span className="font-mono text-emerald-400 font-bold block">{item.nomor_registrasi}</span>
                        <span className="text-[10px] text-slate-300 block">
                          {new Date(item.tgl_daftar).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* CALON PELAMAR (Tanpa Foto) */}
                      <td className="py-3.5 px-4 align-top min-w-[200px]">
                        <div className="min-w-0">
                          <strong className="text-white text-xs block leading-tight font-semibold">
                            {item.nama_lengkap}
                          </strong>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {item.jenis_kelamin} • {item.usia} th
                          </span>
                          <span className="text-[10px] text-slate-300 truncate block mt-0.5">
                            {item.alamat_domisili}
                          </span>
                        </div>
                      </td>

                      {/* POSISI & PENEMPATAN (Hanya Posisi dan Posko) */}
                      <td className="py-3.5 px-4 align-top min-w-[170px]">
                        <strong className="text-blue-400 block leading-tight">
                          {item.posisi_dilamar}
                        </strong>
                        <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold mt-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{mapping?.nama_posko || `Posko ${item.wilayah_penempatan}`}</span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* AKSI */}
                      <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Chat WA */}
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat WhatsApp Pelamar"
                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors border border-emerald-500/30"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>

                          {/* Detail Modal & Berkas */}
                          <button
                            type="button"
                            onClick={() => setSelectedApplicant(item)}
                            title="Buka Lembar Detail Pelamar & CV"
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors border border-blue-500/30"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Khusus role berwenang: SUPER_ADMIN, RM, KACAB, KAOPS) */}
                          {canDeleteApplicants && (
                            <button
                              type="button"
                              onClick={() => setApplicantToDelete(item)}
                              title="Hapus Data Pelamar"
                              className="p-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors border border-red-500/20 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail & Evaluasi */}
      {selectedApplicant && (
        <ApplicantDetailModal
          applicant={selectedApplicant}
          currentUser={currentUser}
          onClose={() => setSelectedApplicant(null)}
          onUpdated={() => {
            // refresh data is automatic via real-time subscription
          }}
        />
      )}

      {/* Modal Konfirmasi Hapus Pelamar */}
      <ConfirmDeleteModal
        isOpen={!!applicantToDelete}
        title="Hapus Data Pelamar"
        itemName={applicantToDelete?.nama_lengkap}
        itemCode={applicantToDelete?.nomor_registrasi}
        description={`Apakah Anda yakin ingin menghapus data pelamar ${applicantToDelete?.nama_lengkap} (${applicantToDelete?.posisi_dilamar} - ${applicantToDelete?.wilayah_penempatan})? Seluruh data lampiran dan riwayat seleksinya akan dihapus permanen.`}
        confirmButtonText="Ya, Hapus Pelamar"
        onConfirm={handleExecuteDelete}
        onClose={() => setApplicantToDelete(null)}
      />
    </div>
  );
};
