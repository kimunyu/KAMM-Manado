import React, { useState, useMemo } from 'react';
import { MediatorKontrak, MediatorStatus } from '../types';
import { formatDateIndo, categorizeFU, getFUCategoryBadge } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Edit3, 
  Trash2, 
  PhoneCall, 
  Plus, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building,
  Building2,
  User,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { ImportMediatorModal } from './ImportMediatorModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DaftarMediatorProps {
  mediators: MediatorKontrak[];
  onSelectMediatorForFU: (kd_med: string) => void;
  onViewDetail: (mediator: MediatorKontrak) => void;
  onEditMediator: (mediator: MediatorKontrak) => void;
  onDeleteMediator: (kd_med: string) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const DaftarMediator: React.FC<DaftarMediatorProps> = ({
  mediators,
  onSelectMediatorForFU,
  onViewDetail,
  onEditMediator,
  onDeleteMediator,
  onNavigate,
}) => {
  const { 
    currentUser, 
    canEditMediatorData, 
    canDeleteMediator, 
    canRegisterMediator, 
    canInputFU 
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cabangFilter, setCabangFilter] = useState<string>('ALL');
  const [fuFilter, setFuFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [mediatorToDelete, setMediatorToDelete] = useState<MediatorKontrak | null>(null);

  // Unique cabangs
  const cabangList = useMemo(() => {
    const set = new Set<string>();
    mediators.forEach(m => {
      if (m.kd_cabang) set.add(m.kd_cabang);
    });
    return Array.from(set).sort();
  }, [mediators]);

  // Branch/Posko restriction for non-national roles
  const userCabang = currentUser?.kd_cabang;
  const isCMO = currentUser?.role === 'CMO';
  const isKAPOS = currentUser?.role === 'KAPOS';
  const userAo = currentUser?.kd_ao;
  const userPosko = currentUser?.kd_posko;
  const isBranchRestricted = !isCMO && !isKAPOS && currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'RM' && !!userCabang;

  // Filter and sort ascending by kd_med by default as strictly required by specification
  const filteredAndSortedMediators = useMemo(() => {
    return mediators
      .filter(m => {
        // CMO restriction: strictly locked to mediators registered by this CMO
        if (isCMO) {
          const matchAo = userAo ? (m.kd_ao || '').trim().toUpperCase() === userAo.trim().toUpperCase() : false;
          const matchCreated = !!(currentUser?.nama && m.created_by_user === currentUser.nama);
          if (!matchAo && !matchCreated) {
            return false;
          }
        } else if (isKAPOS) {
          // KAPOS restriction: strictly locked to mediators in this KAPOS' posko
          if (userPosko && m.kd_posko.trim().toUpperCase() !== userPosko.trim().toUpperCase()) {
            return false;
          }
        } else if (isBranchRestricted && m.kd_cabang !== userCabang) {
          // Branch restriction (KAOPS, ADM, KACAB)
          return false;
        }

        // Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchCode = m.kd_med?.toLowerCase().includes(term);
          const matchName = m.nama_mediator?.toLowerCase().includes(term);
          const matchPhone = m.no_tlpn?.toLowerCase().includes(term);
          const matchAo = m.kd_ao?.toLowerCase().includes(term);
          if (!matchCode && !matchName && !matchPhone && !matchAo) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL' && m.status !== statusFilter) {
          return false;
        }

        // Cabang filter
        if (!isCMO && !isKAPOS && cabangFilter !== 'ALL' && m.kd_cabang !== cabangFilter) {
          return false;
        }

        // FU Category filter
        if (fuFilter !== 'ALL') {
          const cat = categorizeFU(m.tgl_akhir_fu);
          if (cat !== fuFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Specification requirement: Sorted ascending by kd_med
        const codeA = (a.kd_med || '').toUpperCase();
        const codeB = (b.kd_med || '').toUpperCase();
        if (sortOrder === 'asc') {
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        } else {
          return codeB.localeCompare(codeA, undefined, { numeric: true, sensitivity: 'base' });
        }
      });
  }, [mediators, searchTerm, statusFilter, cabangFilter, fuFilter, sortOrder, isCMO, isKAPOS, userAo, userPosko, isBranchRestricted, userCabang, currentUser?.nama]);

  const handleExportCSV = () => {
    const headers = ['KD MED', 'NAMA MEDIATOR', 'STATUS', 'NO TELEPON', 'KD AO', 'KD POSKO', 'KD CABANG', 'TGL AKHIR FU'];
    const rows = filteredAndSortedMediators.map(m => [
      m.kd_med,
      `"${m.nama_mediator.replace(/"/g, '""')}"`,
      m.status,
      m.no_tlpn,
      m.kd_ao,
      m.kd_posko,
      m.kd_cabang,
      m.tgl_akhir_fu || '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daftar_mediator_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#232734]">
        <div>
          <h1 className="text-xl font-bold text-[#f1f3f7] tracking-tight flex items-center space-x-2">
            <span>
              {isCMO ? 'Daftar Mediator Saya (CMO)' : isKAPOS ? `Daftar Mediator Posko (${userPosko || 'Posko'})` : 'Daftar Seluruh Mediator'}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 font-semibold border border-blue-800/60">
              {filteredAndSortedMediators.length} Mediator
            </span>
          </h1>
          <p className="text-xs text-[#8e96a8] mt-0.5">
            {isCMO
              ? `Terkunci khusus mediator terdaftar dengan Kode CMO ${userAo || 'CMO'} (${currentUser?.nama})`
              : isKAPOS
              ? `Terkunci khusus mediator terdaftar di Posko ${userPosko || '-'} Cabang ${userCabang || '-'} (${currentUser?.nama})`
              : 'Tabel database mediator kontrak terurut otomatis berdasarkan KD MED (Ascending)'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              id="btn-import-csv"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 hover:text-blue-200 text-xs font-semibold rounded-xl border border-blue-800/60 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Import CSV / Excel</span>
            </button>
          )}

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] text-xs font-medium rounded-xl border border-[#272d3e] transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#8e96a8]" />
            <span>Ekspor CSV</span>
          </button>

          {canRegisterMediator && (
            <button
              id="btn-nav-registrasi"
              onClick={() => onNavigate('registrasi')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-950/40 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Registrasi Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* CMO Lock Notice Banner */}
      {isCMO && (
        <div className="p-3.5 bg-blue-950/50 border border-blue-800/70 rounded-2xl text-xs text-blue-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-blue-900/60 text-blue-300 border border-blue-700/60">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-blue-100">
                Hak Akses CMO: Data Dikunci Khusus Kode AO/CMO <span className="font-mono bg-blue-900/80 px-2 py-0.5 rounded text-blue-300 border border-blue-700">{userAo || 'CMO'}</span>
              </p>
              <p className="text-[11px] text-blue-300/80 mt-0.5">
                Anda hanya dapat melihat dan mengelola mediator yang Anda daftarkan sendiri ke sistem.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-300 bg-blue-900/40 px-3 py-1 rounded-xl border border-blue-800/50 shrink-0">
            {filteredAndSortedMediators.length} Mediator
          </span>
        </div>
      )}

      {/* KAPOS Lock Notice Banner */}
      {isKAPOS && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/70 rounded-2xl text-xs text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-100">
                Hak Akses KAPOS: Data Dikunci Khusus Posko <span className="font-mono bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-300 border border-emerald-700">{userPosko || 'Posko'}</span> ({userCabang})
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Anda hanya dapat melihat dan mengelola data mediator yang terdaftar di wilayah posko Anda.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-300 bg-emerald-900/40 px-3 py-1 rounded-xl border border-emerald-800/50 shrink-0">
            {filteredAndSortedMediators.length} Mediator
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#6b7280]" />
            <input
              id="search-input-mediator"
              type="text"
              placeholder="Cari KD MED, Nama, No HP, atau AO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">Status: AKTIF</option>
              <option value="PENDING">Status: PENDING</option>
              <option value="INAKTIF">Status: INAKTIF</option>
            </select>
          </div>

          {/* Cabang Filter */}
          {!isBranchRestricted && (
            <div>
              <select
                id="filter-cabang"
                value={cabangFilter}
                onChange={(e) => setCabangFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
              >
                <option value="ALL">Semua Cabang</option>
                {cabangList.map(cab => (
                  <option key={cab} value={cab}>{cab}</option>
                ))}
              </select>
            </div>
          )}

          {/* FU Category Filter */}
          <div className={isBranchRestricted ? 'lg:col-span-2' : ''}>
            <select
              id="filter-fu-category"
              value={fuFilter}
              onChange={(e) => setFuFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
            >
              <option value="ALL">Semua Status FU</option>
              <option value="BELUM_FU">Belum di FU</option>
              <option value="LEBIH_30_HARI">FU &gt; 30 Hari</option>
              <option value="LEBIH_15_HARI">FU &gt; 15 Hari</option>
              <option value="SUDAH_FU">Sudah di FU (≤15 Hari)</option>
            </select>
          </div>
        </div>

        {/* Quick Active Filters tags */}
        {(searchTerm || statusFilter !== 'ALL' || cabangFilter !== 'ALL' || fuFilter !== 'ALL') && (
          <div className="flex items-center space-x-2 pt-2 border-t border-[#1f2330] text-xs text-[#8e96a8]">
            <Filter className="h-3.5 w-3.5 text-[#6b7280]" />
            <span>Filter Aktif:</span>
            {searchTerm && (
              <span className="bg-[#1a1d27] text-[#c2c7d0] border border-[#2e3446] px-2 py-0.5 rounded-md font-medium">
                Pencarian: "{searchTerm}"
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="bg-[#1a1d27] text-[#c2c7d0] border border-[#2e3446] px-2 py-0.5 rounded-md font-medium">
                Status: {statusFilter}
              </span>
            )}
            {cabangFilter !== 'ALL' && (
              <span className="bg-[#1a1d27] text-[#c2c7d0] border border-[#2e3446] px-2 py-0.5 rounded-md font-medium">
                Cabang: {cabangFilter}
              </span>
            )}
            {fuFilter !== 'ALL' && (
              <span className="bg-[#1a1d27] text-[#c2c7d0] border border-[#2e3446] px-2 py-0.5 rounded-md font-medium">
                FU: {fuFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setCabangFilter('ALL');
                setFuFilter('ALL');
              }}
              className="text-blue-400 hover:text-blue-300 font-semibold ml-2 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* SPECIFIED MAIN TABLE: [KD MED | NAMA MEDIATOR | STATUS | TGL AKHIR FU] */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                {/* 1. KD MED */}
                <th className="py-3.5 px-4">
                  <button
                    id="btn-sort-kd-med"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center space-x-1 text-[#c2c7d0] hover:text-blue-400 font-bold cursor-pointer"
                    title="Klik untuk ubah urutan"
                  >
                    <span>KD MED</span>
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                    )}
                  </button>
                </th>

                {/* 2. NAMA MEDIATOR */}
                <th className="py-3.5 px-4">NAMA MEDIATOR</th>

                {/* 3. STATUS */}
                <th className="py-3.5 px-4 text-center">STATUS</th>

                {/* 4. TGL AKHIR FU */}
                <th className="py-3.5 px-4">TGL AKHIR FU</th>

                {/* Additional context & actions */}
                <th className="py-3.5 px-4 text-center">CABANG / AO</th>
                <th className="py-3.5 px-4 text-right">AKSI</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1f2330] text-xs">
              {filteredAndSortedMediators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[#8e96a8]">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="p-3 bg-[#181a24] rounded-2xl w-fit mx-auto border border-[#272d3e] text-blue-400">
                        <FileSpreadsheet className="h-8 w-8" />
                      </div>
                      <p className="font-bold text-[#f1f3f7] text-base">Belum Ada Data Mediator</p>
                      <p className="text-xs text-[#8e96a8] leading-relaxed">
                        Mulai input data mediator secara manual atau langsung unggah seluruh data agen yang sudah Anda miliki menggunakan file CSV/Excel.
                      </p>
                      <div className="flex items-center justify-center space-x-2 pt-2">
                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            id="btn-empty-state-import"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-950/40 transition-colors cursor-pointer"
                          >
                            <UploadCloud className="h-4 w-4" />
                            <span>Import Berkas CSV</span>
                          </button>
                        )}
                        {canRegisterMediator && (
                          <button
                            id="btn-empty-state-reg"
                            onClick={() => onNavigate('registrasi')}
                            className="px-4 py-2 bg-[#1c202d] hover:bg-[#252b3d] text-[#e0e4eb] font-semibold rounded-xl text-xs border border-[#2d3448] flex items-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Registrasi Manual</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedMediators.map((med, idx) => {
                  const fuCat = categorizeFU(med.tgl_akhir_fu);
                  const fuBadge = getFUCategoryBadge(fuCat);
                  const isPending = med.status === 'PENDING';

                  return (
                    <tr 
                      key={med.kd_med || med.temp_id || idx}
                      className="hover:bg-[#181b24]/90 transition-colors group"
                    >
                      {/* Column 1: KD MED */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isPending ? (
                          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/60 text-xs">
                            <Clock className="h-3 w-3 text-amber-400" />
                            <span>{med.kd_med}</span>
                          </div>
                        ) : (
                          <span className="text-blue-300 bg-blue-950/70 px-2.5 py-0.5 rounded-lg font-semibold border border-blue-800/60 text-xs">
                            {med.kd_med}
                          </span>
                        )}
                      </td>

                      {/* Column 2: NAMA MEDIATOR */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#f1f3f7] text-sm max-w-xs truncate">
                          {med.nama_mediator}
                        </div>
                        <div className="text-[11px] text-[#8e96a8] flex items-center space-x-1 mt-0.5">
                          <span>📞 {med.no_tlpn}</span>
                        </div>
                      </td>

                      {/* Column 3: STATUS */}
                      <td className="py-3.5 px-4 text-center">
                        {med.status === 'AKTIF' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                            AKTIF
                          </span>
                        )}
                        {med.status === 'PENDING' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                            <Clock className="h-3 w-3 mr-1 text-amber-400" />
                            PENDING (Diajukan)
                          </span>
                        )}
                        {med.status === 'INAKTIF' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1a1d27] text-[#8e96a8] border border-[#2e3446]">
                            INAKTIF
                          </span>
                        )}
                      </td>

                      {/* Column 4: TGL AKHIR FU */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-medium text-[#f1f3f7]">
                            {formatDateIndo(med.tgl_akhir_fu)}
                          </div>
                          <div>
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${fuBadge.bg} ${fuBadge.textCol} ${fuBadge.border}`}>
                              {fuBadge.text}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cabang / AO Context */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="text-[#c2c7d0] font-medium text-xs">{med.kd_cabang}</div>
                        <div className="text-[10px] text-[#6b7280]">{med.kd_posko} | AO: {med.kd_ao}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick Follow-Up Button */}
                          {canInputFU && (
                            <button
                              id={`btn-fu-med-${med.kd_med}`}
                              onClick={() => onSelectMediatorForFU(med.kd_med)}
                              className="p-1.5 text-blue-400 hover:bg-blue-950/60 hover:text-blue-300 rounded-lg transition-colors cursor-pointer"
                              title="Input Follow-Up (FU)"
                            >
                              <PhoneCall className="h-4 w-4" />
                            </button>
                          )}

                          {/* Detail Button */}
                          <button
                            id={`btn-detail-med-${med.kd_med}`}
                            onClick={() => onViewDetail(med)}
                            className="p-1.5 text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit Button (ADM, KAOPS, SUPER_ADMIN) */}
                          {canEditMediatorData && (
                            <button
                              id={`btn-edit-med-${med.kd_med}`}
                              onClick={() => onEditMediator(med)}
                              className="p-1.5 text-amber-400 hover:bg-amber-950/60 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                              title="Edit / Koreksi Data Mediator"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Button (SUPER_ADMIN only) */}
                          {canDeleteMediator && (
                            <button
                              id={`btn-del-med-${med.kd_med}`}
                              onClick={() => setMediatorToDelete(med)}
                              className="p-1.5 text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data (SUPER_ADMIN)"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Footer info */}
        <div className="p-3.5 bg-[#0e1015] border-t border-[#232734] text-xs text-[#8e96a8] flex items-center justify-between">
          <span>Menampilkan {filteredAndSortedMediators.length} dari {mediators.length} total mediator</span>
          <span>Urutan: KD MED ({sortOrder === 'asc' ? 'A-Z Menanjak' : 'Z-A Menurun'})</span>
        </div>
      </div>

      {/* Import Modal */}
      <ImportMediatorModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!mediatorToDelete}
        title="Hapus Data Mediator"
        itemCode={mediatorToDelete?.kd_med}
        itemName={mediatorToDelete?.nama_mediator}
        description={`Anda akan menghapus data mediator ${mediatorToDelete?.nama_mediator} (${mediatorToDelete?.kd_med}). Seluruh data mediator ini akan dihapus dari sistem secara permanen.`}
        confirmButtonText="Hapus Mediator"
        onConfirm={() => {
          if (mediatorToDelete) {
            onDeleteMediator(mediatorToDelete.kd_med);
            setMediatorToDelete(null);
          }
        }}
        onClose={() => setMediatorToDelete(null)}
      />
    </div>
  );
};
