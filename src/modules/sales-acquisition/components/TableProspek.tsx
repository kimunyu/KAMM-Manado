import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown,
  CheckCircle2, 
  ArrowRightLeft, 
  Trash2, 
  Phone, 
  MapPin, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  Bike,
  Car,
  FileCheck2,
  Calendar
} from 'lucide-react';
import { SalesAcquisition, SalesAcquisitionStatus, SalesAcquisitionSourceLead, JenisJaminan } from '../types';
import { User, Cabang, Posko } from '../../../types';
import { cleanPhoneNumber } from '../services/salesAcquisitionService';

interface TableProspekProps {
  records: SalesAcquisition[];
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  onSelectRecord: (record: SalesAcquisition) => void;
  onOpenConvertCair: (record: SalesAcquisition) => void;
  onOpenReassign: (record: SalesAcquisition) => void;
  onDeleteRecord: (leadId: string) => void;
}

type SortField = 
  | 'nama_calon_konsumen' 
  | 'jenis_jaminan' 
  | 'sumber_lead' 
  | 'status' 
  | 'kd_ao' 
  | 'kd_cabang' 
  | 'alamat_detail' 
  | 'created_at';

type SortOrder = 'asc' | 'desc';

export const TableProspek: React.FC<TableProspekProps> = ({
  records,
  currentUser,
  allCabang,
  allPosko,
  onSelectRecord,
  onOpenConvertCair,
  onOpenReassign,
  onDeleteRecord
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sumberFilter, setSumberFilter] = useState<string>('ALL');
  const [jaminanFilter, setJaminanFilter] = useState<string>('ALL');
  const [cabangFilter, setCabangFilter] = useState<string>('ALL');
  const [poskoFilter, setPoskoFilter] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const isNational = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'RM' || currentUser.role === 'ADM_DE';
  const isKaposOrAbove = currentUser.role === 'KAPOS' || currentUser.role === 'ADM' || currentUser.role === 'KAOPS' || currentUser.role === 'SUPER_ADMIN';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'created_at' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Filter & Sort records
  const sortedAndFilteredRecords = useMemo(() => {
    const filtered = records.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.nama_calon_konsumen.toLowerCase().includes(q);
        const matchPhone = r.no_telepon_clean.includes(q) || r.no_telepon.includes(q);
        const matchAo = (r.kd_ao || '').toLowerCase().includes(q);
        const matchPsb = (r.no_psb || '').toLowerCase().includes(q);
        const matchMed = (r.kd_med || '').toLowerCase().includes(q);
        const matchJaminan = (r.jenis_jaminan || '').toLowerCase().includes(q);
        const matchAlamat = (r.alamat_detail || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAo && !matchPsb && !matchMed && !matchJaminan && !matchAlamat) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Sumber Lead
      if (sumberFilter !== 'ALL' && r.sumber_lead !== sumberFilter) {
        return false;
      }

      // Jaminan Filter
      if (jaminanFilter !== 'ALL' && (r.jenis_jaminan || 'R2') !== jaminanFilter) {
        return false;
      }

      // Cabang
      if (cabangFilter !== 'ALL' && r.kd_cabang !== cabangFilter) {
        return false;
      }

      // Posko
      if (poskoFilter !== 'ALL' && r.kd_posko !== poskoFilter) {
        return false;
      }

      return true;
    });

    // Sort Records
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'nama_calon_konsumen':
          comparison = a.nama_calon_konsumen.localeCompare(b.nama_calon_konsumen, 'id');
          break;
        case 'jenis_jaminan': {
          const jA = a.jenis_jaminan || 'R2';
          const jB = b.jenis_jaminan || 'R2';
          comparison = jA.localeCompare(jB);
          break;
        }
        case 'sumber_lead':
          comparison = a.sumber_lead.localeCompare(b.sumber_lead);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'kd_ao':
          comparison = (a.kd_ao || '').localeCompare(b.kd_ao || '');
          break;
        case 'kd_cabang':
          comparison = (a.kd_cabang || '').localeCompare(b.kd_cabang || '');
          break;
        case 'alamat_detail':
          comparison = (a.alamat_detail || '').localeCompare(b.alamat_detail || '');
          break;
        case 'created_at':
        default: {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          comparison = tA - tB;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, searchQuery, statusFilter, sumberFilter, jaminanFilter, cabangFilter, poskoFilter, sortField, sortOrder]);

  // Paginated records
  const totalPages = Math.ceil(sortedAndFilteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredRecords.slice(start, start + itemsPerPage);
  }, [sortedAndFilteredRecords, currentPage]);

  const getStatusBadge = (status: SalesAcquisitionStatus) => {
    switch (status) {
      case 'PROSPEK_BARU':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'PROSES_SURVEI':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'PENGAJUAN_BERKAS':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'DISETUJUI':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      case 'CAIR':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'DITOLAK':
      case 'BATAL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const getJaminanBadge = (jaminan?: JenisJaminan) => {
    switch (jaminan) {
      case 'R4':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/70" title="BPKB Mobil / Truk">
            <Car className="h-3 w-3 mr-1 text-purple-400" />
            <span>R4 (Mobil)</span>
          </span>
        );
      case 'SERTIFIKAT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/70" title="Sertifikat Tanah / Properti">
            <FileCheck2 className="h-3 w-3 mr-1 text-emerald-400" />
            <span>Sertifikat</span>
          </span>
        );
      case 'R2':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/70" title="BPKB Sepeda Motor">
            <Bike className="h-3 w-3 mr-1 text-blue-400" />
            <span>R2 (Motor)</span>
          </span>
        );
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-[#5c6479] group-hover:text-[#a0a9bd] transition-colors shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-400 shrink-0" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters & Sorting Bar */}
      <div className="bg-[#12151f] p-4 rounded-2xl border border-[#272d3e] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#5c6479]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, jaminan, telepon, AO, PSB, KD MED..."
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#5c6479] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Jenis Jaminan Filter */}
          <div>
            <select
              value={jaminanFilter}
              onChange={(e) => {
                setJaminanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Jaminan</option>
              <option value="R2">R2 (Motor)</option>
              <option value="R4">R4 (Mobil)</option>
              <option value="SERTIFIKAT">Sertifikat</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Status Pipeline</option>
              <option value="PROSPEK_BARU">PROSPEK_BARU</option>
              <option value="PROSES_SURVEI">PROSES_SURVEI</option>
              <option value="PENGAJUAN_BERKAS">PENGAJUAN_BERKAS</option>
              <option value="DISETUJUI">DISETUJUI</option>
              <option value="CAIR">CAIR</option>
              <option value="DITOLAK">DITOLAK</option>
              <option value="BATAL">BATAL</option>
            </select>
          </div>

          {/* Sumber Lead Filter */}
          <div>
            <select
              value={sumberFilter}
              onChange={(e) => {
                setSumberFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Sumber Lead</option>
              <option value="CANVASSING">CANVASSING</option>
              <option value="SOSMED">SOSMED</option>
              <option value="MEDIATOR">MEDIATOR</option>
              <option value="EX_CUSTOMER">EX_CUSTOMER</option>
              <option value="WALK_IN">WALK_IN</option>
            </select>
          </div>

          {/* Cabang Filter (If national) */}
          {isNational && (
            <div>
              <select
                value={cabangFilter}
                onChange={(e) => {
                  setCabangFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Semua Cabang</option>
                {allCabang.map((c) => (
                  <option key={c.kd_cabang} value={c.kd_cabang}>
                    {c.nama_cabang} ({c.kd_cabang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Summary & Sorting Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#8e96a8] pt-1 gap-2">
          <div className="flex items-center space-x-2">
            <span>
              Menampilkan <strong>{sortedAndFilteredRecords.length}</strong> dari <strong>{records.length}</strong> total prospek
            </span>
            <span className="text-[#434b61]">•</span>
            <span className="text-blue-300 font-semibold flex items-center space-x-1">
              <span>Urutan:</span>
              <strong className="capitalize">{sortField.replace(/_/g, ' ')} ({sortOrder === 'asc' ? 'A-Z / Lama' : 'Z-A / Terbaru'})</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-[#6b7388] hidden md:inline">
              *Klik kepala kolom tabel untuk mengurutkan (Sort)
            </span>
            {(searchQuery || statusFilter !== 'ALL' || sumberFilter !== 'ALL' || jaminanFilter !== 'ALL' || cabangFilter !== 'ALL' || poskoFilter !== 'ALL' || sortField !== 'created_at' || sortOrder !== 'desc') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setSumberFilter('ALL');
                  setJaminanFilter('ALL');
                  setCabangFilter('ALL');
                  setPoskoFilter('ALL');
                  setSortField('created_at');
                  setSortOrder('desc');
                  setCurrentPage(1);
                }}
                className="text-[11px] text-blue-400 hover:underline cursor-pointer font-semibold"
              >
                Reset Filter &amp; Urutan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table with Column Sorting */}
      <div className="bg-[#12151f] rounded-2xl border border-[#272d3e] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#171b28] border-b border-[#232734] text-[#8e96a8] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">No</th>

                {/* Calon Konsumen (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('nama_calon_konsumen')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Nama Konsumen"
                  >
                    <span>Calon Konsumen &amp; Kontak</span>
                    {renderSortIndicator('nama_calon_konsumen')}
                  </button>
                </th>

                {/* Jenis Jaminan (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('jenis_jaminan')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Jenis Jaminan"
                  >
                    <span>Jaminan</span>
                    {renderSortIndicator('jenis_jaminan')}
                  </button>
                </th>

                {/* Sumber Lead (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('sumber_lead')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Sumber Lead"
                  >
                    <span>Sumber Lead &amp; Ref</span>
                    {renderSortIndicator('sumber_lead')}
                  </button>
                </th>

                {/* Status (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Status Pipeline"
                  >
                    <span>Status Pipeline</span>
                    {renderSortIndicator('status')}
                  </button>
                </th>

                {/* Petugas AO (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('kd_ao')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Petugas AO"
                  >
                    <span>AO Ref</span>
                    {renderSortIndicator('kd_ao')}
                  </button>
                </th>

                {/* Cabang (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('kd_cabang')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Cabang / Posko"
                  >
                    <span>Cabang / Posko</span>
                    {renderSortIndicator('kd_cabang')}
                  </button>
                </th>

                {/* Wilayah & Alamat (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('alamat_detail')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Alamat"
                  >
                    <span>Wilayah &amp; Alamat</span>
                    {renderSortIndicator('alamat_detail')}
                  </button>
                </th>

                {/* Tanggal (Sortable) */}
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer group"
                    title="Urutkan berdasarkan Tanggal"
                  >
                    <span>Tanggal</span>
                    {renderSortIndicator('created_at')}
                  </button>
                </th>

                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2333] text-[#d6dae3]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#5c6479]">
                    Tidak ada data prospek sales yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, idx) => {
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isTerminal = ['CAIR', 'DITOLAK', 'BATAL'].includes(item.status);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectRecord(item)}
                      className="hover:bg-[#181c2b] transition-colors cursor-pointer group"
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-mono text-[#5c6479]">
                        {rowNumber}
                      </td>

                      {/* Calon Konsumen */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
                          {item.nama_calon_konsumen}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-[#8e96a8] mt-0.5">
                          <span className="font-mono text-emerald-400 font-semibold">{item.no_telepon_clean}</span>
                          <a
                            href={`https://wa.me/62${item.no_telepon_clean.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-blue-400 hover:underline flex items-center space-x-0.5"
                          >
                            <span>WA</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </td>

                      {/* Jenis Jaminan */}
                      <td className="py-3 px-4">
                        {getJaminanBadge(item.jenis_jaminan)}
                      </td>

                      {/* Sumber Lead */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-[#1e2333] text-blue-300 border border-[#2b334a]">
                          {item.sumber_lead}
                        </span>
                        {item.kd_med && (
                          <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                            KD MED: {item.kd_med}
                          </div>
                        )}
                        {item.ref_no_psb_lama && (
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                            PSB Lama: {item.ref_no_psb_lama}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                        {item.no_psb && (
                          <div className="text-[10px] text-emerald-300 font-mono font-bold mt-0.5">
                            PSB: {item.no_psb}
                          </div>
                        )}
                      </td>

                      {/* Petugas AO */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{item.kd_ao || '-'}</span>
                        <div className="text-[10px] text-[#8e96a8] font-mono truncate max-w-[120px]">
                          {item.assigned_user_id}
                        </div>
                      </td>

                      {/* Cabang & Posko */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-purple-300">{item.kd_cabang}</span>
                        <span className="text-[#8e96a8] mx-1">•</span>
                        <span className="font-mono text-indigo-300">{item.kd_posko}</span>
                      </td>

                      {/* Wilayah & Alamat */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="truncate text-white" title={item.alamat_detail || '-'}>
                          {item.alamat_detail || <span className="text-[#5c6479] italic">-</span>}
                        </div>
                        {item.wilayah_desa_id && (
                          <div className="text-[10px] text-[#8e96a8] font-mono">
                            Desa: {item.wilayah_desa_id}
                          </div>
                        )}
                      </td>

                      {/* Tanggal */}
                      <td className="py-3 px-4 text-[#8e96a8] font-mono text-[11px] whitespace-nowrap">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          {/* Direct Cair button if DISETUJUI */}
                          {item.status === 'DISETUJUI' && isKaposOrAbove && (
                            <button
                              type="button"
                              onClick={() => onOpenConvertCair(item)}
                              className="p-1.5 rounded-lg bg-emerald-950 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-800 transition-colors cursor-pointer"
                              title="Cairkan Prospek"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Reassign button */}
                          {!isTerminal && (currentUser.role === 'KAPOS' || currentUser.role === 'KAOPS' || currentUser.role === 'KACAB' || isSuperAdmin) && (
                            <button
                              type="button"
                              onClick={() => onOpenReassign(item)}
                              className="p-1.5 rounded-lg bg-indigo-950 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-800 transition-colors cursor-pointer"
                              title="Reassign AO"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete authority for SUPER_ADMIN */}
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Yakin ingin menghapus permanen prospek "${item.nama_calon_konsumen}" (${item.id})?`)) {
                                  onDeleteRecord(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-900 transition-colors cursor-pointer"
                              title="Hapus Prospek"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-[#232734] bg-[#161a26] flex items-center justify-between text-xs text-[#8e96a8]">
          <div>
            Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong> (Total {sortedAndFilteredRecords.length} prospek)
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#2c3345] text-[#8e96a8] hover:text-white disabled:opacity-30 disabled:hover:text-[#8e96a8] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#1f2434] text-blue-300 rounded border border-[#2c3345]">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[#2c3345] text-[#8e96a8] hover:text-white disabled:opacity-30 disabled:hover:text-[#8e96a8] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
