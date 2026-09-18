import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  Building2, 
  CalendarClock,
  ShieldCheck, 
  ShieldAlert,
  Check, 
  X,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { SalesControlRecord } from '../types';
import { User, Cabang, Posko } from '../../../types';
import { 
  extractDayDD, 
  isUbahJt, 
  getWhatsAppUrl, 
  checkAcceptLockStatus, 
  isDateInAllowedWindow 
} from '../utils/slaUtils';
import { DataTable, ColumnDef } from '../../../components/DataTable';
import { SalesService } from '../services/salesService';

interface TableDataUbahJtProps {
  records: SalesControlRecord[];
  allCabang: Cabang[];
  allPosko: Posko[];
  currentUser: User;
}

export const TableDataUbahJt: React.FC<TableDataUbahJtProps> = ({
  records,
  allCabang,
  allPosko,
  currentUser,
}) => {
  const isAdmDe = currentUser.role === 'ADM_DE';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isNationalUser = isSuperAdmin || isAdmDe || currentUser.role === 'RM';
  const canValidate = isAdmDe || isSuperAdmin;

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCabang, setSelectedCabang] = useState<string>(
    isNationalUser 
      ? '' 
      : (currentUser.kd_cabang || '')
  );
  const [selectedPosko, setSelectedPosko] = useState<string>(
    isNationalUser || currentUser.role === 'KAOPS' || currentUser.role === 'KACAB'
      ? ''
      : (currentUser.kd_posko || '')
  );
  const [validasiFilter, setValidasiFilter] = useState<'ALL' | 'MENUNGGU' | 'SESUAI' | 'BELUM_SESUAI'>('ALL');

  // Modal Validasi State
  const [activeRecordForValidation, setActiveRecordForValidation] = useState<SalesControlRecord | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'SESUAI' | 'BELUM_SESUAI'>('SESUAI');
  const [catatanValidasi, setCatatanValidasi] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtered Posko list based on selected cabang
  const availablePoskos = useMemo(() => {
    if (!selectedCabang) return allPosko;
    return allPosko.filter(p => p.kd_cabang === selectedCabang);
  }, [allPosko, selectedCabang]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    if (isNationalUser) {
      setSelectedCabang('');
      setSelectedPosko('');
    } else if (currentUser.role === 'KAOPS' || currentUser.role === 'KACAB') {
      setSelectedPosko('');
    }
    setValidasiFilter('ALL');
  };

  // 1. Data Mentah: Hanya Konsumen dengan Status ACCEPT dan UBAH JT (Hari Cair != Hari JT)
  const baseUbahJtRecords = useMemo(() => {
    return records.filter(item => {
      // Wajib berstatus ACCEPT
      if (item.status !== 'ACCEPT') return false;

      // Wajib berstatus UBAH JT (hari tgl_cair != tgl_jt atau flag is_ubah_jt)
      const hasUbahJt = item.is_ubah_jt !== undefined 
        ? item.is_ubah_jt 
        : isUbahJt(item.tgl_cair, item.tgl_jt);

      return hasUbahJt;
    });
  }, [records]);

  // 2. Data Terfilter berdasarkan hak akses role dan input filter pengguna
  const filteredRecords = useMemo(() => {
    return baseUbahJtRecords.filter(item => {
      // Batasan Window jika berlaku untuk role non-nasional
      const inWindow = isDateInAllowedWindow(item.tgl_cair, currentUser.role);
      if (!inWindow) return false;

      // Filter Role Wilayah
      if (!isNationalUser) {
        if (currentUser.role === 'ADM') {
          if (currentUser.kd_cabang && item.cabang_id !== currentUser.kd_cabang) return false;
          if (currentUser.kd_posko && item.posko_id !== currentUser.kd_posko) return false;
        } else if (currentUser.role === 'KAPOS') {
          if (currentUser.kd_posko && item.posko_id !== currentUser.kd_posko) return false;
        } else if (currentUser.role === 'KAOPS' || currentUser.role === 'KACAB') {
          if (currentUser.kd_cabang && item.cabang_id !== currentUser.kd_cabang) return false;
        }
      }

      // Filter Dropdown Cabang & Posko
      if (selectedCabang && item.cabang_id !== selectedCabang) return false;
      if (selectedPosko && item.posko_id !== selectedPosko) return false;

      // Filter Status Validasi JT
      if (validasiFilter === 'MENUNGGU') {
        if (item.validasi_ubah_jt_status === 'SESUAI' || item.validasi_ubah_jt_status === 'BELUM_SESUAI') return false;
      } else if (validasiFilter === 'SESUAI') {
        if (item.validasi_ubah_jt_status !== 'SESUAI') return false;
      } else if (validasiFilter === 'BELUM_SESUAI') {
        if (item.validasi_ubah_jt_status !== 'BELUM_SESUAI') return false;
      }

      // Pencarian Teks (NO PSB, Nama Konsumen, No WA)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchPsb = (item.no_psb || '').toLowerCase().includes(query);
        const matchNama = (item.nama_konsumen || '').toLowerCase().includes(query);
        const matchWa = (item.no_wa || '').toLowerCase().includes(query);
        if (!matchPsb && !matchNama && !matchWa) return false;
      }

      return true;
    });
  }, [baseUbahJtRecords, currentUser, isNationalUser, selectedCabang, selectedPosko, validasiFilter, searchTerm]);

  // Statistik Ringkasan KPI
  const stats = useMemo(() => {
    const total = baseUbahJtRecords.length;
    const menunggu = baseUbahJtRecords.filter(r => !r.validasi_ubah_jt_status).length;
    const sesuai = baseUbahJtRecords.filter(r => r.validasi_ubah_jt_status === 'SESUAI').length;
    const belumSesuai = baseUbahJtRecords.filter(r => r.validasi_ubah_jt_status === 'BELUM_SESUAI').length;
    return { total, menunggu, sesuai, belumSesuai };
  }, [baseUbahJtRecords]);

  // Open Validation Modal
  const handleOpenValidationModal = (rec: SalesControlRecord) => {
    setActiveRecordForValidation(rec);
    setConfirmStatus(rec.validasi_ubah_jt_status === 'BELUM_SESUAI' ? 'BELUM_SESUAI' : 'SESUAI');
    setCatatanValidasi(rec.validasi_ubah_jt_catatan || '');
    setActionError(null);
  };

  // Submit Validation
  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecordForValidation) return;
    setActionError(null);

    setIsSubmitting(true);
    try {
      const res = await SalesService.validateUbahJtStatus(
        activeRecordForValidation.no_psb,
        confirmStatus,
        currentUser,
        catatanValidasi.trim()
      );

      if (res.success) {
        setActiveRecordForValidation(null);
      } else {
        setActionError(res.message);
      }
    } catch (err: any) {
      setActionError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kolom Tabel Data Ubah JT
  const columns: ColumnDef<SalesControlRecord>[] = useMemo(() => [
    {
      key: 'no_psb',
      header: 'NO PSB',
      sticky: 'left',
      width: 'w-28',
      render: (row) => (
        <span className="font-mono font-bold text-white tracking-wider bg-[#181a24] px-2 py-1 rounded-md border border-[#272d3e]">
          {row.no_psb}
        </span>
      ),
    },
    {
      key: 'nama_konsumen',
      header: 'Nama Konsumen',
      width: 'min-w-[170px]',
      render: (row) => (
        <div>
          <span className="text-xs font-bold text-white block uppercase">
            {row.nama_konsumen}
          </span>
          <span className="text-[10px] text-[#8e96a8] block mt-0.5">
            Dibuat: {row.created_by_name || row.created_by}
          </span>
        </div>
      ),
    },
    {
      key: 'no_wa',
      header: 'Nomor WhatsApp',
      width: 'w-32',
      render: (row) => {
        const waLink = getWhatsAppUrl(row.no_wa, `Halo Bapak/Ibu ${row.nama_konsumen}, kami dari KAMM Manado konfirmasi terkait pencairan no PSB ${row.no_psb}`);
        return (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors"
            title="Chat WhatsApp"
          >
            <Phone className="h-3 w-3 shrink-0" />
            <span>{row.no_wa}</span>
          </a>
        );
      },
    },
    {
      key: 'cabang_id',
      header: 'Cabang / Posko',
      width: 'min-w-[130px]',
      render: (row) => {
        const cabangName = allCabang.find(c => c.kd_cabang === row.cabang_id)?.nama_cabang || row.cabang_id;
        const poskoName = allPosko.find(p => p.kd_posko === row.posko_id)?.nama_posko || row.posko_id;
        return (
          <div className="text-xs">
            <span className="text-[#c2c7d0] font-medium block">{cabangName}</span>
            <span className="text-[10px] text-[#8e96a8] block font-mono">{poskoName} ({row.posko_id})</span>
          </div>
        );
      },
    },
    {
      key: 'perbandingan_jt',
      header: 'Tgl Cair & Tgl JT',
      width: 'min-w-[180px]',
      render: (row) => {
        const cairDay = extractDayDD(row.tgl_cair);
        const jtDay = extractDayDD(row.tgl_jt || row.tgl_cair);

        return (
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#8e96a8]">Cair:</span>
              <span className="text-[#c2c7d0] font-medium">{row.tgl_cair} (Tgl {cairDay})</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#8e96a8]">Tgl JT:</span>
              <span className="text-amber-300 font-mono font-bold bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded text-[11px]">
                Tanggal {jtDay}
              </span>
              <span className="px-1.5 py-0.2 bg-amber-600 text-black font-black text-[9px] rounded uppercase">
                UBAH JT
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status_accept',
      header: 'Status Pencairan',
      width: 'w-32',
      render: (row) => {
        const lockStatus = checkAcceptLockStatus(row);
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>ACCEPT</span>
            </span>
            {lockStatus.isLocked ? (
              <span className="text-[10px] text-[#8e96a8] block">Terkunci (24 Jam)</span>
            ) : (
              <span className="text-[10px] text-purple-300 block">Sisa {Math.floor(lockStatus.hoursRemaining)}j</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'validasi_ubah_jt_status',
      header: 'Konfirmasi Tanggal JT',
      width: 'min-w-[190px]',
      render: (row) => {
        const valStatus = row.validasi_ubah_jt_status;

        if (valStatus === 'SESUAI') {
          return (
            <div className="space-y-1">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-sm">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>JT SESUAI</span>
              </span>
              {row.validasi_ubah_jt_by && (
                <span className="text-[10px] text-[#8e96a8] block leading-tight">
                  Oleh: {row.validasi_ubah_jt_by}
                </span>
              )}
            </div>
          );
        }

        if (valStatus === 'BELUM_SESUAI') {
          return (
            <div className="space-y-1">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950/90 text-rose-300 border border-rose-700/80 shadow-sm">
                <X className="h-3.5 w-3.5 text-rose-400" />
                <span>JT BELUM SESUAI</span>
              </span>
              {row.validasi_ubah_jt_catatan && (
                <span className="text-[10px] text-rose-200 block italic leading-tight">
                  &quot;{row.validasi_ubah_jt_catatan}&quot;
                </span>
              )}
              {row.validasi_ubah_jt_by && (
                <span className="text-[10px] text-[#8e96a8] block leading-tight">
                  Oleh: {row.validasi_ubah_jt_by}
                </span>
              )}
            </div>
          );
        }

        // Belum divalidasi
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/50">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Menunggu Konfirmasi</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi Validasi',
      sticky: 'right',
      width: 'w-32',
      render: (row) => {
        return (
          <div className="flex items-center justify-center">
            {canValidate ? (
              <button
                type="button"
                onClick={() => handleOpenValidationModal(row)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                  row.validasi_ubah_jt_status
                    ? 'bg-[#181d29] hover:bg-[#202738] text-purple-300 border border-purple-800/60'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50 ring-1 ring-purple-400/40'
                }`}
                title="Konfirmasi apakah Tanggal JT telah sesuai atau belum sesuai"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{row.validasi_ubah_jt_status ? 'Ubah Status' : 'Validasi JT'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-[#8e96a8] font-mono">
                {row.validasi_ubah_jt_status || 'Belum Validasi'}
              </span>
            )}
          </div>
        );
      },
    }
  ], [allCabang, allPosko, canValidate]);

  const canAccess = isSuperAdmin || isAdmDe;

  if (!canAccess) {
    return (
      <div className="p-8 bg-[#141721] border border-amber-800/40 rounded-2xl text-center max-w-md mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Akses Dibatasi</h3>
          <p className="text-xs text-[#8e96a8] mt-1">
            Fitur Data Ubah JT hanya dapat diakses oleh pengguna dengan peran <strong>SUPER ADMIN</strong> dan <strong>ADM DE</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Context Note */}
      <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#181a24] to-[#141721] border border-amber-800/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-amber-900/40 border border-amber-700/60 rounded-xl text-amber-300 shrink-0 mt-0.5">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white">Tabel Khusus: Data Ubah JT (Jatuh Tempo)</h2>
              <span className="px-2 py-0.5 bg-amber-900 text-amber-200 text-[10px] font-black rounded uppercase">
                Khusus ACCEPT &amp; UBAH JT
              </span>
            </div>
            <p className="text-xs text-[#8e96a8] mt-0.5">
              Daftar konsumen yang telah berstatus <strong>ACCEPT</strong> dan memiliki perbedaan tanggal antara <strong>Tgl Cair</strong> dan <strong>Tgl JT</strong> (format hari DD).
            </p>
          </div>
        </div>

        {canValidate && (
          <div className="px-3 py-1.5 bg-purple-950/60 border border-purple-800/50 rounded-xl text-purple-200 text-xs flex items-center space-x-2 shrink-0">
            <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
            <span>Hak Akses Verifikator: <strong>{currentUser.role}</strong></span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#141721] border border-[#272d3e] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#8e96a8] font-medium">Total Data Ubah JT</p>
            <p className="text-xl font-extrabold text-white font-mono mt-0.5">{stats.total}</p>
          </div>
          <div className="p-2 bg-purple-950/50 border border-purple-800/40 rounded-lg text-purple-400">
            <FileText className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#141721] border border-amber-900/40 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-300/80 font-medium">Menunggu Konfirmasi</p>
            <p className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">{stats.menunggu}</p>
          </div>
          <div className="p-2 bg-amber-950/50 border border-amber-800/40 rounded-lg text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#141721] border border-emerald-900/40 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-300/80 font-medium">JT Telah Sesuai</p>
            <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">{stats.sesuai}</p>
          </div>
          <div className="p-2 bg-emerald-950/50 border border-emerald-800/40 rounded-lg text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#141721] border border-rose-900/40 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-rose-300/80 font-medium">JT Belum Sesuai</p>
            <p className="text-xl font-extrabold text-rose-400 font-mono mt-0.5">{stats.belumSesuai}</p>
          </div>
          <div className="p-2 bg-rose-950/50 border border-rose-800/40 rounded-lg text-rose-400">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari NO PSB, nama, no WA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#8e96a8] focus:outline-none focus:border-blue-500"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8e96a8]" />
          </div>

          {/* Cabang Filter */}
          <div>
            <select
              value={selectedCabang}
              onChange={(e) => {
                setSelectedCabang(e.target.value);
                setSelectedPosko('');
              }}
              disabled={!isNationalUser}
              className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">Semua Cabang (Nasional)</option>
              {allCabang.map((c) => (
                <option key={c.kd_cabang} value={c.kd_cabang}>
                  {c.nama_cabang} ({c.kd_cabang})
                </option>
              ))}
            </select>
          </div>

          {/* Posko Filter */}
          <div>
            <select
              value={selectedPosko}
              onChange={(e) => setSelectedPosko(e.target.value)}
              disabled={currentUser.role === 'ADM' || currentUser.role === 'KAPOS'}
              className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">Semua Posko</option>
              {availablePoskos.map((p) => (
                <option key={p.kd_posko} value={p.kd_posko}>
                  {p.nama_posko} ({p.kd_posko})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Validasi JT */}
          <div>
            <select
              value={validasiFilter}
              onChange={(e) => setValidasiFilter(e.target.value as any)}
              className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Status Validasi JT</option>
              <option value="MENUNGGU">Menunggu Konfirmasi</option>
              <option value="SESUAI">Status: JT SESUAI</option>
              <option value="BELUM_SESUAI">Status: JT BELUM SESUAI</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#1e2330]">
          <span className="text-xs text-[#8e96a8]">
            Menampilkan <strong className="text-white font-mono">{filteredRecords.length}</strong> data dari total <strong className="text-amber-400 font-mono">{baseUbahJtRecords.length}</strong> nasabah Ubah JT.
          </span>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-[#8e96a8] hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable<SalesControlRecord>
        tableKey="sales-ubah-jt-table-v1"
        data={filteredRecords}
        columns={columns}
        keyExtractor={(item) => item.no_psb}
        clientPagination={true}
        initialPageSize={15}
        emptyTitle="Tidak Ada Data Ubah JT"
        emptyDescription="Tidak ada data konsumen dengan status ACCEPT dan UBAH JT yang memenuhi kriteria filter."
        title={
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white">Daftar Konsumen Ubah JT</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 font-bold border border-amber-800/60 font-mono">
              {filteredRecords.length} data
            </span>
          </div>
        }
      />

      {/* Modal Aksi Validasi JT: SESUAI / BELUM SESUAI */}
      {activeRecordForValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141721] border border-[#272d3e] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#232734] pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-950/80 border border-purple-800 rounded-lg text-purple-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Konfirmasi Validasi Tanggal JT
                  </h3>
                  <p className="text-[11px] text-[#8e96a8]">
                    NO PSB: <span className="font-mono text-white font-bold">{activeRecordForValidation.no_psb}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecordForValidation(null)}
                className="text-[#8e96a8] hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Consumer Detail Card */}
            <div className="bg-[#181a24] border border-[#272d3e] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#8e96a8] block text-[11px]">Nama Konsumen</span>
                  <span className="text-white font-semibold uppercase">{activeRecordForValidation.nama_konsumen}</span>
                </div>
                <div>
                  <span className="text-[#8e96a8] block text-[11px]">WhatsApp</span>
                  <span className="text-emerald-400 font-mono font-medium">{activeRecordForValidation.no_wa}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#232734] grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#8e96a8] block text-[11px]">Tanggal Cair</span>
                  <span className="text-white font-semibold">
                    {activeRecordForValidation.tgl_cair} (Tgl {extractDayDD(activeRecordForValidation.tgl_cair)})
                  </span>
                </div>
                <div>
                  <span className="text-[#8e96a8] block text-[11px]">Tanggal JT (Format DD)</span>
                  <span className="text-amber-400 font-mono font-bold">
                    Tanggal {extractDayDD(activeRecordForValidation.tgl_jt || activeRecordForValidation.tgl_cair)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pertanyaan Konfirmasi */}
            <form onSubmit={handleSubmitValidation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-2">
                  Apakah tanggal JT konsumen ini telah sesuai? <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Pilihan: SESUAI */}
                  <button
                    type="button"
                    onClick={() => setConfirmStatus('SESUAI')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      confirmStatus === 'SESUAI'
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-[#181a24] border-[#272d3e] text-[#8e96a8] hover:bg-[#1f2330]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>SESUAI</span>
                    </div>
                    <span className="text-[10px] opacity-80 text-center">
                      Tanggal JT telah diverifikasi cocok &amp; disepakati
                    </span>
                  </button>

                  {/* Pilihan: BELUM SESUAI */}
                  <button
                    type="button"
                    onClick={() => setConfirmStatus('BELUM_SESUAI')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      confirmStatus === 'BELUM_SESUAI'
                        ? 'bg-rose-950/90 border-rose-500 text-rose-300 ring-2 ring-rose-500/20 shadow-md'
                        : 'bg-[#181a24] border-[#272d3e] text-[#8e96a8] hover:bg-[#1f2330]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      <span>BELUM SESUAI</span>
                    </div>
                    <span className="text-[10px] opacity-80 text-center">
                      Tanggal JT perlu dikoreksi atau belum cocok
                    </span>
                  </button>
                </div>
              </div>

              {/* Catatan Validasi */}
              <div>
                <label className="block text-xs font-semibold text-[#8e96a8] mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatanValidasi}
                  onChange={(e) => setCatatanValidasi(e.target.value)}
                  placeholder={confirmStatus === 'BELUM_SESUAI' ? 'Tuliskan alasan belum sesuai atau catatan tindak lanjut...' : 'Catatan opsional...'}
                  maxLength={300}
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#232734]">
                <button
                  type="button"
                  onClick={() => setActiveRecordForValidation(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8e96a8] hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Simpan Validasi ({confirmStatus})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
