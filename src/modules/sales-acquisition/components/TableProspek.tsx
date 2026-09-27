import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  ArrowRightLeft, 
  Trash2, 
  Phone, 
  MapPin, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { SalesAcquisition, SalesAcquisitionStatus, SalesAcquisitionSourceLead } from '../types';
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
  const [cabangFilter, setCabangFilter] = useState<string>('ALL');
  const [poskoFilter, setPoskoFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const isNational = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'RM' || currentUser.role === 'ADM_DE';
  const isKaposOrAbove = currentUser.role === 'KAPOS' || currentUser.role === 'ADM' || currentUser.role === 'KAOPS' || currentUser.role === 'SUPER_ADMIN';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.nama_calon_konsumen.toLowerCase().includes(q);
        const matchPhone = r.no_telepon_clean.includes(q) || r.no_telepon.includes(q);
        const matchAo = (r.kd_ao || '').toLowerCase().includes(q);
        const matchPsb = (r.no_psb || '').toLowerCase().includes(q);
        const matchMed = (r.kd_med || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAo && !matchPsb && !matchMed) {
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
  }, [records, searchQuery, statusFilter, sumberFilter, cabangFilter, poskoFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

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

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-[#12151f] p-4 rounded-2xl border border-[#272d3e] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
              placeholder="Cari nama konsumen, telepon, AO, PSB, KD MED..."
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#5c6479] focus:outline-none focus:border-blue-500"
            />
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

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-[#8e96a8] pt-1">
          <span>
            Menampilkan <strong>{filteredRecords.length}</strong> dari <strong>{records.length}</strong> total prospek
          </span>
          {(searchQuery || statusFilter !== 'ALL' || sumberFilter !== 'ALL' || cabangFilter !== 'ALL' || poskoFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setSumberFilter('ALL');
                setCabangFilter('ALL');
                setPoskoFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-[11px] text-blue-400 hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#12151f] rounded-2xl border border-[#272d3e] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#171b28] border-b border-[#232734] text-[#8e96a8] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Calon Konsumen &amp; Kontak</th>
                <th className="py-3 px-4">Sumber Lead &amp; Ref</th>
                <th className="py-3 px-4">Status Pipeline</th>
                <th className="py-3 px-4">Petugas AO</th>
                <th className="py-3 px-4">Cabang / Posko</th>
                <th className="py-3 px-4">Wilayah &amp; Alamat</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2333] text-[#d6dae3]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5c6479]">
                    Tidak ada data prospek yang sesuai kriteria pencarian.
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

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          {/* Direct Cair button if DISETUJUI */}
                          {item.status === 'DISETUJUI' && isKaposOrAbove && (
                            <button
                              type="button"
                              onClick={() => onOpenConvertCair(item)}
                              className="p-1.5 rounded-lg bg-emerald-950 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-800 transition-colors"
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
                              className="p-1.5 rounded-lg bg-indigo-950 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-800 transition-colors"
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
                              className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-900 transition-colors"
                              title="Hapus Prospek (Super Admin Only)"
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
            Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#2c3345] text-[#8e96a8] hover:text-white disabled:opacity-30 disabled:hover:text-[#8e96a8] transition-colors"
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
              className="p-1.5 rounded-lg border border-[#2c3345] text-[#8e96a8] hover:text-white disabled:opacity-30 disabled:hover:text-[#8e96a8] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
