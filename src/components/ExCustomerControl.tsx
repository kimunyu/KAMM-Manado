import React, { useState, useMemo } from 'react';
import { 
  ExCustomer, 
  ExCustomerFULog, 
  User, 
  Cabang, 
  Posko, 
  StatusKreditLunas, 
  HasilFUExCustomer 
} from '../types';
import { DatabaseService } from '../services/storage';
import { ImportBpkbModal } from './ImportBpkbModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { generateBpkbCSVTemplate } from '../utils/csvParser';
import { 
  ShieldCheck, 
  Clock, 
  Phone, 
  Send, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Building2, 
  MapPin, 
  UserCheck, 
  Download, 
  UploadCloud,
  X, 
  MessageSquare,
  Users,
  Flame,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ExCustomerControlProps {
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  allUsers: User[];
  allExCustomers: ExCustomer[];
  allExCustomerLogs: ExCustomerFULog[];
  onRefresh: () => void;
}

export const ExCustomerControl: React.FC<ExCustomerControlProps> = ({
  currentUser,
  allCabang,
  allPosko,
  allUsers,
  allExCustomers,
  allExCustomerLogs,
  onRefresh
}) => {
  // Navigation tabs for Ex-Customer module
  const [activeTab, setActiveTab] = useState<'drip' | 'input_bpkb' | 'my_assignments' | 'master' | 'logs'>(
    currentUser.role === 'ADMIN_BPKB' ? 'input_bpkb' : currentUser.role === 'CMO' ? 'my_assignments' : 'drip'
  );

  // Selected Branch & Posko filters
  const [selectedCabang, setSelectedCabang] = useState<string>(currentUser.kd_cabang || allCabang[0]?.kd_cabang || 'C16');
  const [selectedPosko, setSelectedPosko] = useState<string>(currentUser.kd_posko || allPosko[0]?.kd_posko || 'QJ0');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusLunasFilter, setStatusLunasFilter] = useState<string>('ALL');
  const [statusFUFilter, setStatusFUFilter] = useState<string>('ALL');

  // Form State for Admin BPKB Input
  const [inputNoPsb, setInputNoPsb] = useState('');
  const [inputNama, setInputNama] = useState('');
  const [inputTelp, setInputTelp] = useState('');
  const [inputTglBpkb, setInputTglBpkb] = useState(new Date().toISOString().split('T')[0]);
  const [inputStatusLunas, setInputStatusLunas] = useState<StatusKreditLunas>('Lebih Awal');
  const [inputKdCab, setInputKdCab] = useState(currentUser.kd_cabang || 'C16');
  const [inputKdPos, setInputKdPos] = useState(currentUser.kd_posko || 'QJ0');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ExCustomer | null>(null);
  const [fuModalCustomer, setFuModalCustomer] = useState<ExCustomer | null>(null);
  const [assignModalCustomer, setAssignModalCustomer] = useState<ExCustomer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<ExCustomer | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // FU Form Modal state
  const [hasilFU, setHasilFU] = useState<HasilFUExCustomer>('WA/Tlpn Aktif, ada respon');
  const [catatanFU, setCatatanFU] = useState('');
  const [fuError, setFuError] = useState('');

  // Assign CMO Modal state
  const [selectedCmoId, setSelectedCmoId] = useState('');

  // Filtered Posko based on selected branch
  const availablePosko = useMemo(() => {
    return allPosko.filter(p => !selectedCabang || p.kd_cabang.toUpperCase() === selectedCabang.toUpperCase());
  }, [allPosko, selectedCabang]);

  // CMOs available for assignment in current posko
  const cmoListForPosko = useMemo(() => {
    return allUsers.filter(u => 
      u.role === 'CMO' && 
      u.status === 'AKTIF' && 
      (!selectedPosko || u.kd_posko?.toUpperCase() === selectedPosko.toUpperCase())
    );
  }, [allUsers, selectedPosko]);

  // Admin BPKB Data (<= 48 hours / 2x24h)
  const adminBpkbData = useMemo(() => {
    return DatabaseService.getExCustomersForAdminBpkb(currentUser);
  }, [currentUser, allExCustomers]);

  // Drip-Feeding Data for current Posko (25 items per day, shared pool for Admin & Kapos)
  const dailyDrip = useMemo(() => {
    return DatabaseService.getDailyDripForPosko(selectedCabang, selectedPosko);
  }, [selectedCabang, selectedPosko, allExCustomers]);

  // CMO Assigned items
  const myAssignedList = useMemo(() => {
    if (currentUser.role !== 'CMO') return [];
    return DatabaseService.getAssignedExCustomersForCMO(currentUser.id);
  }, [currentUser, allExCustomers]);

  // Filtered Drip / Master list
  const filteredList = useMemo(() => {
    const listToFilter = activeTab === 'drip' 
      ? dailyDrip.dripList 
      : activeTab === 'my_assignments' 
      ? myAssignedList 
      : allExCustomers;

    return listToFilter.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        item.nama_konsumen.toLowerCase().includes(q) ||
        item.no_psb.toLowerCase().includes(q) ||
        item.no_telepon.includes(q) ||
        item.kd_cab.toLowerCase().includes(q) ||
        item.kd_pos.toLowerCase().includes(q);

      const matchStatusLunas = statusLunasFilter === 'ALL' || item.status_kredit_lunas === statusLunasFilter;
      
      const matchStatusFU = statusFUFilter === 'ALL' || (
        statusFUFilter === 'SUDAH_FU' ? !!item.last_fu_date :
        statusFUFilter === 'BELUM_FU' ? !item.last_fu_date :
        item.last_fu_status === statusFUFilter
      );

      return matchQuery && matchStatusLunas && matchStatusFU;
    });
  }, [activeTab, dailyDrip.dripList, myAssignedList, allExCustomers, searchQuery, statusLunasFilter, statusFUFilter]);

  // Handle Submit BPKB Input
  const handleSaveBpkb = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const res = await DatabaseService.saveExCustomer({
      no_psb: inputNoPsb,
      kd_cab: inputKdCab,
      kd_pos: inputKdPos,
      nama_konsumen: inputNama,
      no_telepon: inputTelp,
      tgl_bpkb_sdk: inputTglBpkb,
      status_kredit_lunas: inputStatusLunas
    }, false, undefined, currentUser);

    if (!res.success) {
      setFormError(res.message);
    } else {
      setFormSuccess(res.message);
      // Reset form
      setInputNoPsb('');
      setInputNama('');
      setInputTelp('');
      setInputTglBpkb(new Date().toISOString().split('T')[0]);
      onRefresh();
    }
  };

  // Handle Edit Submit
  const handleUpdateBpkb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const res = await DatabaseService.saveExCustomer({
      no_psb: editingCustomer.no_psb,
      kd_cab: editingCustomer.kd_cab,
      kd_pos: editingCustomer.kd_pos,
      nama_konsumen: editingCustomer.nama_konsumen,
      no_telepon: editingCustomer.no_telepon,
      tgl_bpkb_sdk: editingCustomer.tgl_bpkb_sdk,
      status_kredit_lunas: editingCustomer.status_kredit_lunas
    }, true, editingCustomer.no_psb, currentUser);

    if (!res.success) {
      alert(res.message);
    } else {
      alert(res.message);
      setEditingCustomer(null);
      onRefresh();
    }
  };

  // Handle Submit Follow Up
  const handleSubmitFU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuModalCustomer) return;
    setFuError('');

    if (catatanFU.length > 100) {
      setFuError('Catatan FU maksimal 100 karakter!');
      return;
    }

    const res = await DatabaseService.submitExCustomerFU({
      no_psb: fuModalCustomer.no_psb,
      hasil_fu: hasilFU,
      catatan_fu: catatanFU,
      currentUser
    });

    if (!res.success) {
      setFuError(res.message);
    } else {
      setFuModalCustomer(null);
      setCatatanFU('');
      onRefresh();
    }
  };

  // Handle Assign CMO
  const handleAssignCmo = async () => {
    if (!assignModalCustomer || !selectedCmoId) return;
    const cmo = cmoListForPosko.find(c => c.id === selectedCmoId);
    if (!cmo) return;

    const res = await DatabaseService.assignExCustomerToCMO(assignModalCustomer.no_psb, cmo.id, cmo.nama);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(res.message);
      setAssignModalCustomer(null);
      setSelectedCmoId('');
      onRefresh();
    }
  };

  // Handle Unassign CMO
  const handleUnassignCmo = async (no_psb: string) => {
    if (confirm('Batalkan penugasan CMO untuk nasabah ini?')) {
      const res = await DatabaseService.unassignExCustomer(no_psb);
      alert(res.message);
      onRefresh();
    }
  };

  // Handle Delete Single Ex-Customer (Super Admin)
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const res = await DatabaseService.deleteExCustomer(customerToDelete.no_psb);
    alert(res.message);
    setCustomerToDelete(null);
    onRefresh();
  };

  // Handle Clear All Ex-Customers (Super Admin)
  const handleConfirmClearAllExCustomers = async () => {
    const res = await DatabaseService.clearAllExCustomers();
    alert(res.message);
    setIsClearAllModalOpen(false);
    onRefresh();
  };

  // Export BPKB CSV Handler
  const handleExportBpkbCSV = () => {
    if (currentUser.role !== 'SUPER_ADMIN') {
      alert('Akses Ditolak: Fitur Ekspor CSV hanya dapat diakses oleh Super Admin.');
      return;
    }
    const listToExport = allExCustomers;
    if (listToExport.length === 0) {
      alert('Tidak ada data BPKB untuk diekspor.');
      return;
    }

    const headers = [
      'NO_PSB',
      'KD_CAB',
      'KD_POS',
      'NAMA_KONSUMEN',
      'NO_TELEPON',
      'TGL_BPKB_SDK',
      'STATUS_KREDIT_LUNAS',
      'TGL_LAST_FU',
      'STATUS_LAST_FU',
      'USER_LAST_FU',
      'CATATAN_LAST_FU'
    ];

    const rows = listToExport.map(item => [
      `"${item.no_psb}"`,
      `"${item.kd_cab}"`,
      `"${item.kd_pos}"`,
      `"${(item.nama_konsumen || '').replace(/"/g, '""')}"`,
      `"${item.no_telepon}"`,
      `"${item.tgl_bpkb_sdk}"`,
      `"${item.status_kredit_lunas}"`,
      `"${item.last_fu_date || ''}"`,
      `"${item.last_fu_status || ''}"`,
      `"${item.last_fu_by_user || ''}"`,
      `"${(item.last_fu_notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `data_jaminan_bpkb_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format WA Link
  const getCleanWhatsappLink = (phone: string, nama: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    const greeting = encodeURIComponent(`Halo Bpk/Ibu ${nama}, kami dari BAF ingin menginformasikan promo khusus pembiayaan kembali untuk nasabah setia kami.`);
    return `https://wa.me/${clean}?text=${greeting}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-[#13151c] p-5 sm:p-6 rounded-2xl border border-[#232734] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#f1f3f7] flex items-center gap-2">
                <span>Kontrol & Follow-Up (FU) Ex-Customer</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  Drip-Feed 25/Hari
                </span>
              </h2>
              <p className="text-xs text-[#8e96a8] mt-0.5">
                Manajemen jaminan BPKB nasabah lunas, retensi data harian, dan sistem penugasan follow-up terintegrasi
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls / Scope Selection */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch & Posko Selectors (For Roles that can switch, including ADMIN_BPKB with national scope) */}
          {currentUser.role !== 'CMO' && (
            <>
              <div className="relative">
                <select
                  id="select-cabang-ex"
                  value={selectedCabang}
                  onChange={(e) => {
                    setSelectedCabang(e.target.value);
                    const matching = allPosko.filter(p => p.kd_cabang === e.target.value);
                    if (matching.length > 0) setSelectedPosko(matching[0].kd_posko);
                  }}
                  className="px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {allCabang.map(c => (
                    <option key={c.kd_cabang} value={c.kd_cabang}>{c.kd_cabang} - {c.nama_cabang}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  id="select-posko-ex"
                  value={selectedPosko}
                  onChange={(e) => setSelectedPosko(e.target.value)}
                  className="px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {availablePosko.map(p => (
                    <option key={p.kd_posko} value={p.kd_posko}>{p.kd_posko} - {p.nama_posko}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Refresh Button */}
          <button
            id="btn-refresh-ex"
            onClick={onRefresh}
            className="p-2 bg-[#1c1f2a] hover:bg-[#252a3a] text-[#8e96a8] hover:text-[#f1f3f7] rounded-xl border border-[#272d3e] transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* MODULE TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#232734] pb-3">
        {/* Tab: Drip Feeding 25 (Admin, Kapos, BM, RM, Super Admin) */}
        {currentUser.role !== 'ADMIN_BPKB' && currentUser.role !== 'CMO' && (
          <button
            id="tab-ex-drip"
            onClick={() => setActiveTab('drip')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'drip'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-[#13151c] text-[#8e96a8] hover:text-[#f1f3f7] border border-[#232734]'
            }`}
          >
            <Flame className="h-4 w-4 text-amber-400" />
            <span>25 Drip Harian Posko</span>
            <span className="ml-1.5 px-2 py-0.2 bg-[#0d0e12] rounded-full text-[11px] font-mono">
              {dailyDrip.completedToday}/25
            </span>
          </button>
        )}

        {/* Tab: Input BPKB (Admin BPKB & Super Admin) */}
        {(currentUser.role === 'ADMIN_BPKB' || currentUser.role === 'SUPER_ADMIN') && (
          <button
            id="tab-ex-input-bpkb"
            onClick={() => setActiveTab('input_bpkb')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'input_bpkb'
                ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'bg-[#13151c] text-[#8e96a8] hover:text-[#f1f3f7] border border-[#232734]'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-orange-400" />
            <span>Input BPKB (Akses 2x24 Jam)</span>
          </button>
        )}

        {/* Tab: My Assignments (CMO) */}
        {currentUser.role === 'CMO' && (
          <button
            id="tab-ex-cmo-assigned"
            onClick={() => setActiveTab('my_assignments')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'my_assignments'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'bg-[#13151c] text-[#8e96a8] hover:text-[#f1f3f7] border border-[#232734]'
            }`}
          >
            <UserCheck className="h-4 w-4 text-blue-400" />
            <span>Tugas FU Saya (Maks 5)</span>
            <span className="ml-1.5 px-2 py-0.2 bg-[#0d0e12] rounded-full text-[11px] font-mono">
              {myAssignedList.length}/5
            </span>
          </button>
        )}

        {/* Tab: Master Data (All Ex-Customers) */}
        {currentUser.role !== 'ADMIN_BPKB' && currentUser.role !== 'CMO' && (
          <button
            id="tab-ex-master"
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'master'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-[#13151c] text-[#8e96a8] hover:text-[#f1f3f7] border border-[#232734]'
            }`}
          >
            <Users className="h-4 w-4 text-purple-400" />
            <span>Master Data Ex-Customer</span>
            <span className="ml-1.5 px-2 py-0.2 bg-[#0d0e12] rounded-full text-[11px] font-mono">
              {allExCustomers.length}
            </span>
          </button>
        )}

        {/* Tab: Log FU */}
        {currentUser.role !== 'ADMIN_BPKB' && (
          <button
            id="tab-ex-logs"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-[#13151c] text-[#8e96a8] hover:text-[#f1f3f7] border border-[#232734]'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <span>Riwayat Log FU</span>
            <span className="ml-1.5 px-2 py-0.2 bg-[#0d0e12] rounded-full text-[11px] font-mono">
              {allExCustomerLogs.length}
            </span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INPUT DATA BPKB (ADMIN BPKB & SUPER ADMIN)                         */}
      {/* ========================================================================= */}
      {activeTab === 'input_bpkb' && (
        <div className="space-y-6">
          {/* Action Toolbar for Super Admin & Export */}
          <div className="bg-[#13151c] p-4 sm:p-5 rounded-2xl border border-[#232734] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-orange-950/80 border border-orange-800/60 rounded-xl text-orange-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#f1f3f7] flex items-center gap-2">
                  <span>Input & Manajemen Data Jaminan BPKB</span>
                  {currentUser.role === 'SUPER_ADMIN' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-300 border border-orange-800/60">
                      SUPER ADMIN
                    </span>
                  )}
                  {currentUser.role === 'ADMIN_BPKB' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
                      NASIONAL
                    </span>
                  )}
                </h4>
                <p className="text-xs text-[#8e96a8] mt-0.5">
                  {currentUser.role === 'SUPER_ADMIN' 
                    ? 'Super Admin memiliki hak akses impor massal CSV / Excel dan ekspor seluruh arsip BPKB' 
                    : 'Akses seluruh cabang & posko secara nasional untuk input serah terima jaminan BPKB'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentUser.role === 'SUPER_ADMIN' && (
                <>
                  <button
                    id="btn-import-bpkb-csv"
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Import CSV / Excel</span>
                  </button>

                  <button
                    id="btn-export-bpkb-csv"
                    type="button"
                    onClick={handleExportBpkbCSV}
                    className="px-3.5 py-2 bg-[#1c1f2a] hover:bg-[#252a3a] text-amber-300 text-xs font-bold rounded-xl border border-[#373e54] transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Ekspor CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const csv = generateBpkbCSVTemplate();
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', 'template_import_bpkb.csv');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3 py-2 bg-[#14161f] hover:bg-[#1c1f2a] text-[#8e96a8] hover:text-[#f1f3f7] text-xs font-semibold rounded-xl border border-[#272d3e] transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="Unduh Template Standar CSV BPKB"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Template CSV</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Security Banner: Data Leakage Guard (2x24 Jam) */}
          <div className="p-4 bg-[#14120a] border border-amber-500/30 rounded-2xl flex items-start space-x-3 text-xs text-amber-200/90">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 text-sm">Ketentuan Keamanan & Batas Waktu Akses (2x24 Jam)</p>
              <p className="mt-1 leading-relaxed text-[#c7cbcf]">
                Admin BPKB hanya dapat melihat serta mengedit data penyerahan BPKB dalam kurun waktu <strong>maksimal 2x24 jam (48 jam)</strong> sejak waktu input. Setelah 48 jam, data otomatis terkunci dan tersembunyi dari tampilan Admin BPKB demi perlindungan privasi data nasabah.
              </p>
            </div>
          </div>

          {/* Form Input Data BPKB */}
          <div className="bg-[#13151c] p-5 sm:p-6 rounded-2xl border border-[#232734] shadow-md space-y-4">
            <h3 className="text-sm font-bold text-[#f1f3f7] flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Formulir Pengambilan & Penyerahan Jaminan BPKB</span>
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveBpkb} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KD_CAB & KD_POS */}
              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">Cabang (KD_CAB) *</label>
                <select
                  id="input-ex-kdcab"
                  value={inputKdCab}
                  onChange={(e) => {
                    setInputKdCab(e.target.value);
                    const matching = allPosko.filter(p => p.kd_cabang === e.target.value);
                    if (matching.length > 0) setInputKdPos(matching[0].kd_posko);
                  }}
                  className="w-full px-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-amber-500 font-semibold"
                  required
                >
                  {allCabang.map(c => (
                    <option key={c.kd_cabang} value={c.kd_cabang}>{c.kd_cabang} - {c.nama_cabang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">Posko (KD_POS) *</label>
                <select
                  id="input-ex-kdpos"
                  value={inputKdPos}
                  onChange={(e) => setInputKdPos(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-amber-500 font-semibold"
                  required
                >
                  {allPosko.filter(p => !inputKdCab || p.kd_cabang === inputKdCab).map(p => (
                    <option key={p.kd_posko} value={p.kd_posko}>{p.kd_posko} - {p.nama_posko}</option>
                  ))}
                </select>
              </div>

              {/* NO_PSB */}
              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">No PSB / Perjanjian *</label>
                <input
                  id="input-ex-nopsb"
                  type="text"
                  value={inputNoPsb}
                  onChange={(e) => setInputNoPsb(e.target.value)}
                  placeholder="Contoh: PSB-16-9921"
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-mono uppercase focus:outline-none focus:border-amber-500 placeholder-[#6b7280]"
                  required
                />
              </div>

              {/* NAMA_KONSUMEN */}
              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">Nama Konsumen *</label>
                <input
                  id="input-ex-namakonsumen"
                  type="text"
                  value={inputNama}
                  onChange={(e) => setInputNama(e.target.value)}
                  placeholder="Nama Lengkap Konsumen"
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-amber-500 placeholder-[#6b7280]"
                  required
                />
              </div>

              {/* NO_TELEPON */}
              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">No. Telepon / WhatsApp *</label>
                <input
                  id="input-ex-notelp"
                  type="text"
                  value={inputTelp}
                  onChange={(e) => setInputTelp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-mono focus:outline-none focus:border-amber-500 placeholder-[#6b7280]"
                  required
                />
              </div>

              {/* TGL_BPKB_SDK */}
              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">Tgl BPKB Diserahkan *</label>
                <input
                  id="input-ex-tglbpkb"
                  type="date"
                  value={inputTglBpkb}
                  onChange={(e) => setInputTglBpkb(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* STATUS_KREDIT_LUNAS (Dropdown mandatory) */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-[#8e96a8] uppercase mb-1.5">Status Kredit Saat Lunas *</label>
                <select
                  id="input-ex-statuslunas"
                  value={inputStatusLunas}
                  onChange={(e) => setInputStatusLunas(e.target.value as StatusKreditLunas)}
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                  required
                >
                  <option value="Lebih Awal">Lebih Awal (Pelunasan Dipercepat - Prioritas 1)</option>
                  <option value="Tepat Waktu">Tepat Waktu (Lancar Sesuai Jadwal - Prioritas 2)</option>
                  <option value="Dalam Perhatian Khusus">Dalam Perhatian Khusus (DPK)</option>
                  <option value="Kurang Lancar">Kurang Lancar</option>
                  <option value="Diragukan">Diragukan</option>
                  <option value="AR2">AR2</option>
                  <option value="AR3">AR3</option>
                  <option value="AR4">AR4</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  id="btn-submit-ex-bpkb"
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Simpan Data BPKB</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table: Riwayat Input Data BPKB (2x24 Jam Terakhir) */}
          <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden space-y-3">
            <div className="p-4 bg-[#0d0e12] border-b border-[#232734] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-[#f1f3f7]">
                  Riwayat Input Terakhir (Jendela Waktu Edit: 2x24 Jam)
                </span>
              </div>
              <span className="text-[11px] text-[#8e96a8]">
                Menampilkan <strong>{adminBpkbData.data.length}</strong> data aktif
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase">
                    <th className="py-3 px-4">No. PSB</th>
                    <th className="py-3 px-4">Nama Konsumen</th>
                    <th className="py-3 px-4">No. Telepon</th>
                    <th className="py-3 px-4">Tgl Serah BPKB</th>
                    <th className="py-3 px-4">Status Lunas</th>
                    <th className="py-3 px-4 text-center">Sisa Akses Edit</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2330]">
                  {adminBpkbData.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#8e96a8]">
                        Belum ada data BPKB yang diinput dalam kurun 48 jam terakhir.
                      </td>
                    </tr>
                  ) : (
                    adminBpkbData.data.map(item => {
                      const canEdit = adminBpkbData.canEdit(item);
                      const remHours = adminBpkbData.remainingHours(item);

                      return (
                        <tr key={item.no_psb} className="hover:bg-[#181b24] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#f1f3f7]">
                            {item.no_psb}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#f1f3f7]">
                            {item.nama_konsumen}
                            <span className="block text-[10px] text-[#6b7280]">
                              {item.kd_cab} • {item.kd_pos}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#c2c7d0]">
                            {item.no_telepon}
                          </td>
                          <td className="py-3 px-4 text-[#8e96a8]">
                            {item.tgl_bpkb_sdk}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              item.status_kredit_lunas === 'Lebih Awal' ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' :
                              item.status_kredit_lunas === 'Tepat Waktu' ? 'bg-blue-950/70 text-blue-300 border-blue-800/60' :
                              'bg-amber-950/70 text-amber-300 border-amber-800/60'
                            }`}>
                              {item.status_kredit_lunas}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canEdit ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                                <Clock className="h-3 w-3 text-amber-400" />
                                <span>{remHours} Jam Tersisa</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-900 text-gray-500 border border-gray-800">
                                Terkunci
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {canEdit && (
                                <button
                                  id={`btn-edit-ex-${item.no_psb}`}
                                  onClick={() => setEditingCustomer(item)}
                                  className="px-2.5 py-1 bg-[#1f2330] hover:bg-[#2a3042] text-amber-300 text-xs font-semibold rounded-lg border border-[#373e54] transition-colors cursor-pointer inline-flex items-center space-x-1"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {currentUser.role === 'SUPER_ADMIN' && (
                                <button
                                  id={`btn-delete-ex-hist-${item.no_psb}`}
                                  onClick={() => setCustomerToDelete(item)}
                                  className="p-1.5 bg-[#1c1417] hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-900/60 transition-colors cursor-pointer inline-flex items-center"
                                  title="Hapus Data Ex-Customer (Super Admin)"
                                >
                                  <Trash2 className="h-3 w-3" />
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 & 3: DRIP FEEDING 25 & MASTER LIST & CMO ASSIGNMENTS                */}
      {/* ========================================================================= */}
      {(activeTab === 'drip' || activeTab === 'master' || activeTab === 'my_assignments') && (
        <div className="space-y-4">
          {/* Status Metrics Cards */}
          {activeTab === 'drip' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#8e96a8] uppercase">Kuota Drip Harian Posko</p>
                  <p className="text-2xl font-bold text-[#f1f3f7] mt-1 font-mono">
                    {dailyDrip.dripList.length} <span className="text-xs text-[#8e96a8]">/ 25 Data</span>
                  </p>
                  <p className="text-[11px] text-amber-400 mt-1 font-medium">
                    {dailyDrip.completedToday} selesai di-FU • {dailyDrip.pendingToday} antrean
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Flame className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#8e96a8] uppercase">Sinkronisasi Admin & Kapos</p>
                  <p className="text-sm font-bold text-[#f1f3f7] mt-1">Shared Posko Pool</p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Real-time Active Retention (1x24 Jam)</span>
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Users className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-[#13151c] p-4 rounded-2xl border border-[#232734] shadow-md flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#8e96a8] uppercase">Total Master Ex-Customer</p>
                  <p className="text-2xl font-bold text-[#f1f3f7] mt-1 font-mono">
                    {dailyDrip.totalAvailable} <span className="text-xs text-[#8e96a8]">Nasabah Posko</span>
                  </p>
                  <p className="text-[11px] text-[#8e96a8] mt-1">
                    Posko {selectedPosko} • Cabang {selectedCabang}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}

          {/* Search & Filters Toolbar */}
          <div className="bg-[#13151c] p-3.5 rounded-2xl border border-[#232734] shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e96a8]" />
              <input
                id="search-ex-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama nasabah, No. PSB, nomor HP/WA..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] placeholder-[#6b7280] focus:outline-none focus:border-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e96a8] hover:text-[#f1f3f7] p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="filter-ex-statuslunas"
                value={statusLunasFilter}
                onChange={(e) => setStatusLunasFilter(e.target.value)}
                className="px-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Semua Status Lunas</option>
                <option value="Lebih Awal">Lebih Awal</option>
                <option value="Tepat Waktu">Tepat Waktu</option>
                <option value="Dalam Perhatian Khusus">Dalam Perhatian Khusus</option>
                <option value="Kurang Lancar">Kurang Lancar</option>
              </select>

              <select
                id="filter-ex-statusfu"
                value={statusFUFilter}
                onChange={(e) => setStatusFUFilter(e.target.value)}
                className="px-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Semua Status FU</option>
                <option value="SUDAH_FU">Sudah di-FU</option>
                <option value="BELUM_FU">Belum di-FU</option>
                <option value="WA/Tlpn Aktif, ada respon">WA Aktif - Ada Respon</option>
                <option value="WA/Tlpn Aktif, tidak ada respon">WA Aktif - Tidak Respon</option>
                <option value="WA/Tlpn Tidak Aktif">WA/Tlpn Tidak Aktif</option>
              </select>

              {currentUser.role === 'SUPER_ADMIN' && (
                <>
                  <button
                    id="btn-import-ex-bpkb"
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Import Data BPKB (CSV)"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Import BPKB</span>
                  </button>

                  <button
                    id="btn-export-ex-bpkb-toolbar"
                    type="button"
                    onClick={handleExportBpkbCSV}
                    className="px-3 py-2.5 bg-[#1c1f2a] hover:bg-[#252a3a] text-amber-300 rounded-xl text-xs font-bold border border-[#373e54] transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Ekspor Seluruh Data BPKB ke CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ekspor CSV</span>
                  </button>

                  <button
                    id="btn-clear-all-ex-customers"
                    type="button"
                    onClick={() => setIsClearAllModalOpen(true)}
                    className="px-3 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title="Hapus Semua Data Ex-Customer (Persiapan Data Real)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Hapus Semua Data</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TABLE OF CONSUMERS */}
          <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden space-y-3">
            <div className="p-3.5 bg-[#0d0e12] border-b border-[#232734] flex items-center justify-between text-xs text-[#8e96a8]">
              <span>
                Menampilkan <strong className="text-[#f1f3f7]">{filteredList.length}</strong> konsumen
                {activeTab === 'drip' && ' dalam kuota drip hari ini (Prioritas Lunas Lebih Awal & Tepat Waktu)'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase">
                    <th className="py-3 px-4">No. PSB & Konsumen</th>
                    <th className="py-3 px-4">Kontak / WhatsApp</th>
                    <th className="py-3 px-4">Status Pelunasan</th>
                    <th className="py-3 px-4">Status & Catatan FU</th>
                    <th className="py-3 px-4">Penugasan CMO</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2330]">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#8e96a8]">
                        Tidak ada data konsumen yang sesuai kriteria pencarian/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map(item => {
                      const isFued = !!item.last_fu_date;

                      return (
                        <tr key={item.no_psb} className="hover:bg-[#181b24] transition-colors">
                          {/* PSB & Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#f1f3f7]">{item.nama_konsumen}</div>
                            <div className="font-mono text-[11px] text-amber-400/90">{item.no_psb}</div>
                            <div className="text-[10px] text-[#6b7280]">
                              Tgl BPKB: {item.tgl_bpkb_sdk} • Posko: {item.kd_pos}
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-medium text-[#f1f3f7] flex items-center space-x-1.5">
                              <span>{item.no_telepon}</span>
                            </div>
                            <a
                              href={getCleanWhatsappLink(item.no_telepon, item.nama_konsumen)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center space-x-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                            >
                              <Send className="h-3 w-3" />
                              <span>Hubungi WA</span>
                            </a>
                          </td>

                          {/* Status Kredit Lunas */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                              item.status_kredit_lunas === 'Lebih Awal' ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' :
                              item.status_kredit_lunas === 'Tepat Waktu' ? 'bg-blue-950/70 text-blue-300 border-blue-800/60' :
                              'bg-amber-950/70 text-amber-300 border-amber-800/60'
                            }`}>
                              {item.status_kredit_lunas}
                            </span>
                          </td>

                          {/* Last FU Status & Notes */}
                          <td className="py-3.5 px-4 max-w-xs">
                            {isFued ? (
                              <div className="space-y-1">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  item.last_fu_status === 'WA/Tlpn Aktif, ada respon' ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' :
                                  item.last_fu_status === 'WA/Tlpn Aktif, tidak ada respon' ? 'bg-amber-950/70 text-amber-300 border-amber-800/60' :
                                  'bg-rose-950/70 text-rose-300 border-rose-800/60'
                                }`}>
                                  {item.last_fu_status}
                                </span>
                                {item.last_fu_notes && (
                                  <p className="text-[11px] text-[#c2c7d0] italic line-clamp-2">
                                    "{item.last_fu_notes}"
                                  </p>
                                )}
                                <span className="text-[10px] text-[#6b7280] block">
                                  Oleh {item.last_fu_by_user} ({item.last_fu_by_role})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-400/80 font-medium flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>Belum di-Follow Up</span>
                              </span>
                            )}
                          </td>

                          {/* Penugasan CMO */}
                          <td className="py-3.5 px-4">
                            {item.assigned_to_cmo_name ? (
                              <div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                                  {item.assigned_to_cmo_name}
                                </span>
                                {currentUser.role === 'KAPOS' && (
                                  <button
                                    onClick={() => handleUnassignCmo(item.no_psb)}
                                    className="block mt-1 text-[10px] text-rose-400 hover:underline cursor-pointer"
                                  >
                                    Batal Tugas
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#6b7280] italic">
                                Pool Bersama Posko
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Direct FU Button */}
                              <button
                                id={`btn-fu-ex-${item.no_psb}`}
                                onClick={() => {
                                  setFuModalCustomer(item);
                                  setHasilFU('WA/Tlpn Aktif, ada respon');
                                  setCatatanFU(item.last_fu_notes || '');
                                }}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center space-x-1"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{isFued ? 'Update FU' : 'Form FU'}</span>
                              </button>

                              {/* Kapos Assign to CMO Button */}
                              {(currentUser.role === 'KAPOS' || currentUser.role === 'SUPER_ADMIN') && (
                                <button
                                  id={`btn-assign-cmo-${item.no_psb}`}
                                  onClick={() => {
                                    const allowed: StatusKreditLunas[] = ['Lebih Awal', 'Tepat Waktu', 'Dalam Perhatian Khusus', 'Kurang Lancar'];
                                    if (!allowed.includes(item.status_kredit_lunas)) {
                                      alert(`Hanya konsumen kategori 'Lebih Awal', 'Tepat Waktu', 'Dalam Perhatian Khusus', dan 'Kurang Lancar' yang dapat ditugaskan ke CMO! Kategori saat ini: ${item.status_kredit_lunas}`);
                                      return;
                                    }
                                    setAssignModalCustomer(item);
                                  }}
                                  className="p-1.5 bg-[#1c1f2a] hover:bg-[#252a3a] text-blue-300 rounded-xl border border-[#272d3e] transition-colors cursor-pointer"
                                  title="Tugaskan ke CMO (Khusus kategori Lebih Awal, Tepat Waktu, DPK, Kurang Lancar)"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Super Admin Delete Button */}
                              {currentUser.role === 'SUPER_ADMIN' && (
                                <button
                                  id={`btn-delete-ex-${item.no_psb}`}
                                  onClick={() => setCustomerToDelete(item)}
                                  className="p-1.5 bg-[#1c1417] hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-900/60 transition-colors cursor-pointer"
                                  title="Hapus Data Ex-Customer (Super Admin)"
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOG RIWAYAT FOLLOW UP                                              */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden space-y-3">
          <div className="p-4 bg-[#0d0e12] border-b border-[#232734] flex items-center justify-between">
            <span className="text-xs font-bold text-[#f1f3f7] flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span>Log Riwayat Hasil Follow-Up Ex-Customer</span>
            </span>
            <span className="text-xs text-[#8e96a8]">
              Total <strong>{allExCustomerLogs.length}</strong> Aktivitas Tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase">
                  <th className="py-3 px-4">Waktu FU</th>
                  <th className="py-3 px-4">No. PSB & Konsumen</th>
                  <th className="py-3 px-4">Hasil Follow-Up</th>
                  <th className="py-3 px-4">Catatan (Maks 100 Karakter)</th>
                  <th className="py-3 px-4">Petugas FU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2330]">
                {allExCustomerLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#8e96a8]">
                      Belum ada aktivitas follow-up yang tercatat.
                    </td>
                  </tr>
                ) : (
                  allExCustomerLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[#181b24] transition-colors">
                      <td className="py-3 px-4 text-[#8e96a8] font-mono text-[11px]">
                        {new Date(log.tgl_fu).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#f1f3f7] block">{log.nama_konsumen}</span>
                        <span className="font-mono text-[10px] text-amber-400">{log.no_psb}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          log.hasil_fu === 'WA/Tlpn Aktif, ada respon' ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' :
                          log.hasil_fu === 'WA/Tlpn Aktif, tidak ada respon' ? 'bg-amber-950/70 text-amber-300 border-amber-800/60' :
                          'bg-rose-950/70 text-rose-300 border-rose-800/60'
                        }`}>
                          {log.hasil_fu}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#c2c7d0] italic">
                        "{log.catatan_fu || '-'}"
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#f1f3f7] block">{log.user_fu}</span>
                        <span className="text-[10px] text-[#6b7280] font-mono">{log.user_role} {log.kd_ao ? `• ${log.kd_ao}` : ''}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORM INPUT HASIL FOLLOW-UP (MANDATORY 3 DROPDOWNS & MAX 100 CHR) */}
      {/* ========================================================================= */}
      {fuModalCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] border border-[#232734] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0d0e12] border-b border-[#232734] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm text-[#f1f3f7]">Input Hasil Follow-Up Ex-Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setFuModalCustomer(null)}
                className="text-[#8e96a8] hover:text-[#f1f3f7] p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFU} className="p-5 space-y-4">
              {/* Konsumen Info Summary */}
              <div className="p-3 bg-[#0d0e12] rounded-xl border border-[#232734] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8e96a8]">Nama Konsumen:</span>
                  <strong className="text-[#f1f3f7]">{fuModalCustomer.nama_konsumen}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e96a8]">No. PSB:</span>
                  <span className="font-mono text-amber-400">{fuModalCustomer.no_psb}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e96a8]">No. Telepon / WA:</span>
                  <span className="font-mono text-[#f1f3f7]">{fuModalCustomer.no_telepon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e96a8]">Status Kredit Saat Lunas:</span>
                  <span className="font-semibold text-emerald-400">{fuModalCustomer.status_kredit_lunas}</span>
                </div>
              </div>

              {fuError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fuError}</span>
                </div>
              )}

              {/* Dropdown Hasil FU (Mandatory 3 options) */}
              <div>
                <label className="block text-xs font-bold text-[#8e96a8] uppercase mb-1.5">
                  Hasil Follow-Up (Wajib) *
                </label>
                <select
                  id="select-hasil-fu"
                  value={hasilFU}
                  onChange={(e) => setHasilFU(e.target.value as HasilFUExCustomer)}
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
                  required
                >
                  <option value="WA/Tlpn Aktif, ada respon">WA/Tlpn Aktif, ada respon</option>
                  <option value="WA/Tlpn Aktif, tidak ada respon">WA/Tlpn Aktif, tidak ada respon</option>
                  <option value="WA/Tlpn Tidak Aktif">WA/Tlpn Tidak Aktif</option>
                </select>
              </div>

              {/* Catatan FU (Max 100 characters with character counter) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#8e96a8] uppercase">
                    Catatan Follow-Up
                  </label>
                  <span className={`text-[11px] font-mono ${catatanFU.length > 90 ? 'text-rose-400 font-bold' : 'text-[#8e96a8]'}`}>
                    {catatanFU.length} / 100 Karakter
                  </span>
                </div>
                <textarea
                  id="textarea-catatan-fu"
                  value={catatanFU}
                  maxLength={100}
                  onChange={(e) => setCatatanFU(e.target.value)}
                  placeholder="Contoh: Konsumen minta dihubungi lagi tgl 5, tertarik pengajuan motor baru."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-amber-500 resize-none placeholder-[#6b7280]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFuModalCustomer(null)}
                  className="px-4 py-2 bg-[#1f2330] hover:bg-[#2a3042] text-[#8e96a8] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Simpan Hasil FU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TUGASKAN KE CMO (KAPOS - MAKS 5 KONSUMEN / CMO)                   */}
      {/* ========================================================================= */}
      {assignModalCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] border border-[#232734] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#0d0e12] border-b border-[#232734] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-sm text-[#f1f3f7]">Penugasan Konsumen ke CMO</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalCustomer(null)}
                className="text-[#8e96a8] hover:text-[#f1f3f7] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#0d0e12] rounded-xl border border-[#232734] space-y-1.5">
                <p className="text-[#8e96a8]">Nasabah: <strong className="text-[#f1f3f7]">{assignModalCustomer.nama_konsumen}</strong></p>
                <div className="flex items-center justify-between">
                  <p className="text-[#8e96a8]">No. PSB: <span className="font-mono text-amber-400">{assignModalCustomer.no_psb}</span></p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    Status: {assignModalCustomer.status_kredit_lunas}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e96a8] uppercase mb-1.5">
                  Pilih CMO di Posko {selectedPosko} (Maks 5 Tugas Aktif / CMO) *
                </label>
                <select
                  id="select-cmo-assign"
                  value={selectedCmoId}
                  onChange={(e) => setSelectedCmoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Pilih Petugas CMO --</option>
                  {cmoListForPosko.map(cmo => {
                    const currentAssigned = DatabaseService.getAssignedExCustomersForCMO(cmo.id).length;
                    return (
                      <option key={cmo.id} value={cmo.id} disabled={currentAssigned >= 5}>
                        {cmo.nama} ({cmo.kd_ao || cmo.username}) - {currentAssigned}/5 Tugas Aktif
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalCustomer(null)}
                  className="px-4 py-2 bg-[#1f2330] hover:bg-[#2a3042] text-[#8e96a8] text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAssignCmo}
                  disabled={!selectedCmoId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  Tugaskan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT DATA BPKB (ADMIN BPKB <= 48 JAM ATAU SUPER ADMIN)          */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] border border-[#232734] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-[#0d0e12] border-b border-[#232734] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm text-[#f1f3f7]">Edit Data Penyerahan BPKB</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-[#8e96a8] hover:text-[#f1f3f7] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBpkb} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#8e96a8] uppercase mb-1">No. PSB (Primary)</label>
                  <input
                    type="text"
                    value={editingCustomer.no_psb}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, no_psb: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-[#f1f3f7] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#8e96a8] uppercase mb-1">Nama Konsumen</label>
                  <input
                    type="text"
                    value={editingCustomer.nama_konsumen}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, nama_konsumen: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-[#f1f3f7]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#8e96a8] uppercase mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={editingCustomer.no_telepon}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, no_telepon: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-[#f1f3f7] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#8e96a8] uppercase mb-1">Tgl Serah BPKB</label>
                  <input
                    type="date"
                    value={editingCustomer.tgl_bpkb_sdk}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, tgl_bpkb_sdk: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-[#f1f3f7]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#8e96a8] uppercase mb-1">Status Kredit Saat Lunas</label>
                <select
                  value={editingCustomer.status_kredit_lunas}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, status_kredit_lunas: e.target.value as StatusKreditLunas })}
                  className="w-full px-3 py-2 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-[#f1f3f7] font-semibold"
                >
                  <option value="Lebih Awal">Lebih Awal</option>
                  <option value="Tepat Waktu">Tepat Waktu</option>
                  <option value="Dalam Perhatian Khusus">Dalam Perhatian Khusus</option>
                  <option value="Kurang Lancar">Kurang Lancar</option>
                  <option value="Diragukan">Diragukan</option>
                  <option value="AR2">AR2</option>
                  <option value="AR3">AR3</option>
                  <option value="AR4">AR4</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-[#1f2330] hover:bg-[#2a3042] text-[#8e96a8] rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: IMPORT BPKB EXCEL / CSV (SUPER ADMIN)                           */}
      {/* ========================================================================= */}
      <ImportBpkbModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          onRefresh();
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 5: CONFIRM DELETE SINGLE EX-CUSTOMER (SUPER ADMIN)                  */}
      {/* ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={!!customerToDelete}
        title="Hapus Data Ex-Customer"
        itemCode={customerToDelete?.no_psb}
        itemName={customerToDelete?.nama_konsumen}
        description={`Apakah Anda yakin ingin menghapus data jaminan BPKB nasabah "${customerToDelete?.nama_konsumen}" (PSB: ${customerToDelete?.no_psb})? Seluruh riwayat follow-up nasabah ini juga akan terhapus secara permanen.`}
        confirmButtonText="Hapus Permanen"
        onConfirm={handleConfirmDeleteCustomer}
        onClose={() => setCustomerToDelete(null)}
      />

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIRM CLEAR ALL EX-CUSTOMERS (SUPER ADMIN)                     */}
      {/* ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={isClearAllModalOpen}
        title="Hapus / Kosongkan Semua Data Ex-Customer"
        description="PERINGATAN: Anda akan menghapus SELURUH data penyerahan BPKB / Ex-Customer dan seluruh riwayat follow-up yang ada di sistem untuk persiapan input data real. Tindakan ini bersifat permanen dan tidak dapat dibatalkan!"
        confirmButtonText="Kosongkan Semua Data Real"
        onConfirm={handleConfirmClearAllExCustomers}
        onClose={() => setIsClearAllModalOpen(false)}
      />
    </div>
  );
};
