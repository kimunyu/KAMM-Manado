import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Lock,
  Calendar,
  Phone,
  Building2,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { SalesControlRecord } from '../types';
import { User, Cabang, Posko } from '../../../types';
import { checkHoldDanaSla, isDateInAllowedWindow, getAllowedWindowLabel, getWhatsAppUrl, checkAcceptLockStatus } from '../utils/slaUtils';
import { DataTable, ColumnDef } from '../../../components/DataTable';
import { SalesService } from '../services/salesService';
import { SingleDatePicker } from './SingleDatePicker';

interface TableDataKonsumenProps {
  records: SalesControlRecord[];
  allCabang: Cabang[];
  allPosko: Posko[];
  currentUser: User;
  onOpenValidasiModal: (record: SalesControlRecord) => void;
  onOpenCopyWaModal: (cabangId: string, namaCabang: string) => void;
}

export const TableDataKonsumen: React.FC<TableDataKonsumenProps> = ({
  records,
  allCabang,
  allPosko,
  currentUser,
  onOpenValidasiModal,
  onOpenCopyWaModal,
}) => {
  const isAdmDe = currentUser.role === 'ADM_DE';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isNationalUser = isSuperAdmin || currentUser.role === 'RM' || isAdmDe;
  const canValidate = isAdmDe || isSuperAdmin;
  // Fitur Lapor WA Cabang hanya untuk role nasional (SUPER_ADMIN, ADM_DE, RM). Dinonaktifkan untuk KAOPS, KACAB, KAPOS, ADM.
  const canCopyWa = isNationalUser;

  // Filters (ADM_DE dan role nasional default ke semua cabang & posko)
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
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [onlyHoldDana, setOnlyHoldDana] = useState<boolean>(false);

  // Edit Modal State (Poin 1: tgl_cair dapat diedit khusus ADM_DE & SUPER_ADMIN)
  const canEditTglCair = isAdmDe || isSuperAdmin;
  const [editingRecord, setEditingRecord] = useState<SalesControlRecord | null>(null);
  const [editNama, setEditNama] = useState<string>('');
  const [editWa, setEditWa] = useState<string>('');
  const [editTglCair, setEditTglCair] = useState<string>('');
  const [editKet, setEditKet] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [recordToDelete, setRecordToDelete] = useState<SalesControlRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    if (isNationalUser) {
      setSelectedCabang('');
      setSelectedPosko('');
    } else if (currentUser.role === 'KAOPS' || currentUser.role === 'KACAB') {
      setSelectedPosko('');
    }
    setSelectedStatus('ALL');
    setOnlyHoldDana(false);
  };

  // Filtered posko options based on selectedCabang
  const availablePoskos = useMemo(() => {
    if (!selectedCabang) return allPosko;
    return allPosko.filter(p => p.kd_cabang === selectedCabang);
  }, [allPosko, selectedCabang]);

  // Apply Window Restriction and search/filters
  const filteredData = useMemo(() => {
    return records.filter(item => {
      // 1. Tanggal Window Restriction (role nasional tidak dibatasi window)
      const inWindow = isDateInAllowedWindow(item.tgl_cair, currentUser.role);
      if (!inWindow) return false;

      // 2. Role Cabang / Posko Scope (Role Nasional ADM_DE, SUPER_ADMIN, RM bebas seluruh wilayah)
      if (isNationalUser) {
        // Akses Nasional: melihat seluruh wilayah
      } else if (currentUser.role === 'ADM') {
        if (currentUser.kd_cabang && item.cabang_id !== currentUser.kd_cabang) return false;
        if (currentUser.kd_posko && item.posko_id !== currentUser.kd_posko) return false;
      } else if (currentUser.role === 'KAPOS') {
        if (currentUser.kd_posko && item.posko_id !== currentUser.kd_posko) return false;
      } else if (currentUser.role === 'KAOPS' || currentUser.role === 'KACAB') {
        if (currentUser.kd_cabang && item.cabang_id !== currentUser.kd_cabang) return false;
      }

      // 3. User Select Filters
      if (selectedCabang && item.cabang_id !== selectedCabang) return false;
      if (selectedPosko && item.posko_id !== selectedPosko) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

      // 4. HOLD DANA Filter
      const sla = checkHoldDanaSla(item.tgl_cair, item.status);
      if (onlyHoldDana && !sla.isHoldDana) return false;

      // 5. Search Term (NO PSB, Nama, No WA, Keterangan)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchPsb = (item.no_psb || '').toLowerCase().includes(term);
        const matchNama = (item.nama_konsumen || '').toLowerCase().includes(term);
        const matchWa = (item.no_wa || '').toLowerCase().includes(term);
        const matchKet = (item.keterangan || '').toLowerCase().includes(term);
        if (!matchPsb && !matchNama && !matchWa && !matchKet) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize HOLD DANA at the very top
      const slaA = checkHoldDanaSla(a.tgl_cair, a.status);
      const slaB = checkHoldDanaSla(b.tgl_cair, b.status);
      if (slaA.isHoldDana && !slaB.isHoldDana) return -1;
      if (!slaA.isHoldDana && slaB.isHoldDana) return 1;

      // Then by date created / cair desc
      return String(b.created_at || b.tgl_cair).localeCompare(String(a.created_at || a.tgl_cair));
    });
  }, [records, currentUser, selectedCabang, selectedPosko, selectedStatus, onlyHoldDana, searchTerm]);

  // Open Edit Modal for ADM/KAOPS / ADM_DE
  const handleOpenEditModal = (rec: SalesControlRecord) => {
    setEditingRecord(rec);
    setEditNama(rec.nama_konsumen);
    setEditWa(rec.no_wa);
    setEditTglCair(rec.tgl_cair);
    setEditKet(rec.keterangan || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditError(null);

    const cleanNama = editNama.trim();
    if (!cleanNama) {
      setEditError('Nama konsumen wajib diisi.');
      return;
    }

    const cleanWa = editWa.trim();
    if (!cleanWa.startsWith('08') || cleanWa.length < 10) {
      setEditError('Nomor WhatsApp wajib diawali 08 dengan minimal 10 digit.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await SalesService.editRecordByCreator(
        editingRecord.no_psb,
        {
          nama_konsumen: cleanNama,
          no_wa: cleanWa,
          tgl_cair: canEditTglCair ? editTglCair.trim() : undefined,
          keterangan: currentUser.role === 'ADM' ? undefined : editKet.trim(),
        },
        currentUser
      );

      if (res.success) {
        setEditingRecord(null);
      } else {
        setEditError(res.message);
      }
    } catch (err: any) {
      setEditError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await SalesService.deleteRecord(recordToDelete.no_psb, currentUser);
      setRecordToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Define Table Columns
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
      key: 'tgl_cair',
      header: 'Tgl Cair',
      width: 'w-24',
      render: (row) => (
        <span className="text-xs text-[#c2c7d0] font-medium whitespace-nowrap">
          {row.tgl_cair}
        </span>
      ),
    },
    {
      key: 'tgl_jt',
      header: 'Tgl JT',
      width: 'w-24',
      render: (row) => (
        <span className="text-xs text-[#c2c7d0] font-medium whitespace-nowrap">
          {row.tgl_jt || row.tgl_cair}
        </span>
      ),
    },
    {
      key: 'nama_konsumen',
      header: 'Nama Konsumen',
      width: 'min-w-[160px]',
      render: (row) => (
        <div>
          <span className="text-xs font-bold text-white block">
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
      header: 'Nomor WA',
      width: 'w-32',
      render: (row) => {
        const waLink = getWhatsAppUrl(row.no_wa, `Halo Bapak/Ibu ${row.nama_konsumen}, terkait pencairan no PSB ${row.no_psb}`);
        return (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors"
            title="Kirim Pesan WhatsApp"
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
      key: 'status',
      header: 'Status & SLA',
      width: 'min-w-[140px]',
      render: (row) => {
        const sla = checkHoldDanaSla(row.tgl_cair, row.status);

        if (row.status === 'ACCEPT') {
          const lockStatus = checkAcceptLockStatus(row);
          return (
            <div className="space-y-1">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>ACCEPT</span>
              </span>
              {lockStatus.isLocked ? (
                <span 
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#181d29] text-[#8e96a8] border border-[#2b3346] block w-fit" 
                  title={`Terkunci permanen: Status ACCEPT telah lebih dari 1x24 jam (divalidasi: ${lockStatus.formattedValidationDate}). Tidak dapat diubah lagi.`}
                >
                  <Lock className="h-2.5 w-2.5 text-amber-400" />
                  <span>Kunci 24 Jam</span>
                </span>
              ) : (
                <span 
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/40 block w-fit" 
                  title={`Sisa waktu sebelum terkunci permanen: ${Math.floor(lockStatus.hoursRemaining)} jam`}
                >
                  <Clock className="h-2.5 w-2.5 text-purple-400" />
                  <span>Sisa {Math.floor(lockStatus.hoursRemaining)}j</span>
                </span>
              )}
            </div>
          );
        }

        if (row.status === 'BELUM SELESAI') {
          return (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-sm">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>BELUM SELESAI</span>
            </span>
          );
        }

        // SUBMISS
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60 shadow-sm">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>SUBMISS</span>
            </span>
            {sla.isHoldDana && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-sm animate-pulse block w-fit">
                <AlertTriangle className="h-3 w-3" />
                <span>HOLD DANA ({sla.workingDays} HK)</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'keterangan',
      header: 'Keterangan / Poin Kekurangan',
      width: 'min-w-[200px]',
      render: (row) => (
        <div className="text-xs text-[#d1d7e0] max-w-xs break-words line-clamp-2" title={row.keterangan}>
          {row.keterangan || <span className="text-[#8e96a8]/50 italic">-</span>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      sticky: 'right',
      width: 'w-24',
      render: (row) => {
        const isAccept = row.status === 'ACCEPT';

        return (
          <div className="flex items-center justify-center space-x-1.5">
            {/* Action for ADM_DE and SUPER_ADMIN */}
            {canValidate ? (
              (() => {
                const lockStatus = checkAcceptLockStatus(row);
                if (isAccept && lockStatus.isLocked) {
                  return (
                    <button
                      type="button"
                      disabled
                      className="px-2.5 py-1 bg-[#181d29] border border-[#2b3346] text-[#6b758d] rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-not-allowed opacity-75"
                      title={`Aksi validasi terkunci: Status ACCEPT telah lebih dari 1x24 jam (divalidasi: ${lockStatus.formattedValidationDate}). Tidak dapat divalidasi kembali.`}
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Terkunci</span>
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => onOpenValidasiModal(row)}
                    className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-700 text-purple-200 border border-purple-600/50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    title={isAccept ? `Ubah Validasi (Sisa waktu: ${Math.floor(lockStatus.hoursRemaining)} jam)` : 'Validasi & Koreksi ADM_DE'}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-300" />
                    <span>{isAccept ? 'Ubah' : 'Validasi'}</span>
                  </button>
                );
              })()
            ) : currentUser.role === 'KAPOS' ? (
              /* KAPOS has Read-Only view */
              <span className="text-[11px] text-[#8e96a8] font-mono">View Only</span>
            ) : (
              /* Action for ADM and KAOPS */
              !isAccept ? (
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(row)}
                  className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-700 text-blue-200 border border-blue-600/50 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Edit Data Konsumen"
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-300" />
                  <span>Edit</span>
                </button>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40">
                  <Lock className="h-3 w-3" />
                  <span>Accept</span>
                </span>
              )
            )}

            {/* Super Admin Delete */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setRecordToDelete(row)}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title="Hapus Data (Super Admin)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      },
    }
  ], [allCabang, allPosko, canValidate, isSuperAdmin, currentUser.role, onOpenValidasiModal]);

  return (
    <div className="space-y-4">
      {/* Date Window Information Banner: Khusus role lokal atau Pengawasan Nasional */}
      {isNationalUser ? (
        <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-purple-400" />
            <span>
              <strong>Akses Nasional ({currentUser.role}):</strong> Anda memiliki akses pengawasan &amp; validasi ke seluruh cabang dan posko se-Indonesia tanpa sekat wilayah.
            </span>
          </div>
          <span className="text-[11px] bg-purple-900/80 border border-purple-700/60 px-2.5 py-0.5 rounded-full font-bold text-purple-200">
            Akses Seluruh Wilayah
          </span>
        </div>
      ) : (
        <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 shrink-0 text-blue-400" />
            <span>
              <strong>Ketentuan Tampilan:</strong> Menampilkan data pencairan periode <strong>{getAllowedWindowLabel()}</strong>.
            </span>
          </div>
          <span className="text-[11px] bg-blue-900/60 px-2 py-0.5 rounded font-mono text-blue-200">
            Current + 10 Days
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari NO PSB, nama konsumen, no WA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#8e96a8] focus:outline-none focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8e96a8]" />
            </div>
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

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUBMISS">SUBMISS</option>
              <option value="ACCEPT">ACCEPT</option>
              <option value="BELUM SELESAI">BELUM SELESAI</option>
            </select>
          </div>
        </div>

        {/* Second Row: HOLD DANA Toggle & Quick WA per Cabang */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1e2330]">
          <div className="flex items-center space-x-3">
            {/* HOLD DANA Toggle */}
            <button
              type="button"
              onClick={() => setOnlyHoldDana(!onlyHoldDana)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                onlyHoldDana
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-2 ring-rose-400'
                  : 'bg-[#181a24] border border-rose-900/40 text-rose-400 hover:bg-rose-950/30'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Hanya HOLD DANA (&gt;2 Hari Kerja)</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl text-xs text-[#8e96a8] hover:text-white hover:bg-[#181a24] transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Poin 7: WhatsApp Report Quick Action per CABANG */}
          {canCopyWa && (selectedCabang || currentUser.kd_cabang) && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-[#8e96a8]">Laporan WhatsApp:</span>
              <button
                type="button"
                onClick={() => {
                  const targetCabang = selectedCabang || currentUser.kd_cabang || (allCabang.length > 0 ? allCabang[0].kd_cabang : '');
                  const cabangObj = allCabang.find(c => c.kd_cabang === targetCabang);
                  onOpenCopyWaModal(
                    targetCabang,
                    cabangObj?.nama_cabang || targetCabang
                  );
                }}
                className="px-3.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/80 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span>
                  Copy WA Cabang ({allCabang.find(c => c.kd_cabang === (selectedCabang || currentUser.kd_cabang))?.nama_cabang || (selectedCabang || currentUser.kd_cabang)})
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Universal DataTable */}
      <DataTable
        tableKey="sales-control-table-v1"
        columns={columns}
        data={filteredData}
        keyExtractor={(item) => item.no_psb}
        clientPagination={true}
        initialPageSize={15}
        title={
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white">Daftar Konsumen Pencairan</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#181a24] text-blue-400 font-bold border border-[#272d3e]">
              {filteredData.length} data
            </span>
          </div>
        }
      />

      {/* Edit Data Konsumen Modal (Poin 1: tgl_cair dapat diedit khusus ADM_DE / SUPER_ADMIN) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141721] border border-[#272d3e] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#232734] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Edit3 className="h-4 w-4 text-blue-400" />
                <span>Edit Data Konsumen (NO PSB: {editingRecord.no_psb})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-[#8e96a8] hover:text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Poin 1 & 2: Single Date Picker for Tgl Cair */}
              <div>
                <SingleDatePicker
                  id="edit-modal-tgl-cair"
                  label="Tgl Cair (Pencairan)"
                  value={editTglCair}
                  onChange={setEditTglCair}
                  disabled={!canEditTglCair}
                  helperText={
                    canEditTglCair 
                      ? 'Khusus ADM_DE & SUPER_ADMIN: Ubah/koreksi tanggal pencairan.' 
                      : 'Terkunci: Hanya ADM_DE & SUPER_ADMIN yang berwenang mengubah Tgl Cair.'
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e96a8] mb-1">
                  Nama Konsumen
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8e96a8] mb-1">
                  Nomor WhatsApp (08...)
                </label>
                <input
                  type="text"
                  value={editWa}
                  onChange={(e) => setEditWa(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={15}
                  required
                  className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Keterangan hanya dapat diedit oleh non-ADM */}
              {currentUser.role !== 'ADM' && (
                <div>
                  <label className="block text-xs font-semibold text-[#8e96a8] mb-1">
                    Keterangan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={editKet}
                    onChange={(e) => setEditKet(e.target.value)}
                    maxLength={500}
                    className="w-full bg-[#181a24] border border-[#272d3e] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-2 text-xs font-medium text-[#8e96a8] hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete for Super Admin */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141721] border border-red-900/60 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Hapus Data Pencairan?
            </h3>
            <p className="text-xs text-[#8e96a8]">
              Yakin ingin menghapus data nasabah <strong>{recordToDelete.nama_konsumen}</strong> (NO PSB: {recordToDelete.no_psb})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#8e96a8] hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
