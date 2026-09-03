import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { UserProvisioningService, deriveUserAuthEmail, BulkProvisionSummary } from '../services/userProvisioning';
import { CabangPoskoControl } from './CabangPoskoControl';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { AuditTrailPanel } from './AuditTrailPanel';
import { SystemHealthPanel } from './SystemHealthPanel';
import { 
  UserCog, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Shield, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  X, 
  Lock, 
  Users, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Sparkles, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Flame, 
  Copy, 
  Check, 
  Loader2, 
  Zap, 
  RefreshCw,
  Activity,
  Server
} from 'lucide-react';

interface UserControlProps {
  onRefresh: () => void;
}

export const UserControl: React.FC<UserControlProps> = ({ onRefresh }) => {
  const { allUsers, allCabang, allPosko, refreshData, currentUser, resetUserPassword } = useAuth();

  const [activeSection, setActiveSection] = useState<'users' | 'master_cabang_posko' | 'audit_trail' | 'system_health'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Bulk & Single Provisioning states
  const [isBulkProvisioning, setIsBulkProvisioning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; message: string; percent: number } | null>(null);
  const [bulkResultSummary, setBulkResultSummary] = useState<BulkProvisionSummary | null>(null);
  const [provisioningUserId, setProvisioningUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form states
  const [username, setUsername] = useState('');
  const [nama, setNama] = useState('');
  const [role, setRole] = useState<UserRole>('CMO');
  const [kdAo, setKdAo] = useState('CMO-01');
  const [kdCabang, setKdCabang] = useState('');
  const [kdPosko, setKdPosko] = useState('');
  const [status, setStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('test1234');
  const [autoProvisionOnSave, setAutoProvisionOnSave] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pageNotification, setPageNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availablePosko = allPosko.filter(p => !kdCabang || p.kd_cabang.toUpperCase() === kdCabang.toUpperCase());

  // Filtered Users computation
  const filteredUsers = allUsers.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery = !query || 
      (u.nama && u.nama.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      (u.kd_ao && u.kd_ao.toLowerCase().includes(query)) ||
      (u.id && u.id.toLowerCase().includes(query)) ||
      (u.kd_cabang && u.kd_cabang.toLowerCase().includes(query)) ||
      (u.kd_posko && u.kd_posko.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query));

    const matchRole = roleFilter === 'ALL' || 
      (roleFilter === 'ADM_BPKB' ? (u.role === 'ADM_BPKB' || u.role === 'ADMIN_BPKB') : u.role === roleFilter);
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchQuery && matchRole && matchStatus;
  });

  const isFiltered = searchQuery.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';
  const unlinkedUsers = allUsers.filter(u => !u.firebase_uid || u.firebase_uid.trim().length === 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(prev => (prev === id ? null : prev));
    }, 2000);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setNama('');
    setRole('CMO');
    setKdAo('');
    const defaultCab = allCabang.length > 0 ? allCabang[0].kd_cabang : '';
    setKdCabang(defaultCab);
    const matchingPoskos = allPosko.filter(p => defaultCab && p.kd_cabang.toUpperCase() === defaultCab.toUpperCase());
    setKdPosko(matchingPoskos.length > 0 ? matchingPoskos[0].kd_posko : '');
    setStatus('AKTIF');
    setEmail('');
    setPassword('test1234');
    setAutoProvisionOnSave(true);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setNama(u.nama);
    setRole(u.role);
    setKdAo(u.kd_ao || u.username.toUpperCase());
    const userCab = u.kd_cabang || (allCabang[0]?.kd_cabang || '');
    setKdCabang(userCab);
    setKdPosko(u.kd_posko || '');
    setStatus(u.status);
    setEmail(u.email || deriveUserAuthEmail(u));
    setPassword(u.password || 'test1234');
    setAutoProvisionOnSave(!u.firebase_uid);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
    const cleanAo = (kdAo.trim() || cleanUser).toUpperCase().replace(/\s+/g, '');

    if (!cleanUser || !nama.trim()) {
      setFeedback({ type: 'error', message: 'Username / Kode AO dan Nama Pengguna wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    const isNationalRole = role === 'SUPER_ADMIN' || role === 'RM' || role === 'ADM_BPKB' || role === 'ADMIN_BPKB';
    const cleanEmail = (email.trim() || `${cleanAo.toLowerCase().replace(/[^a-z0-9_.-]/g, '')}@kamm-manado.internal`).toLowerCase();

    let userData: User = {
      id: editingUser ? editingUser.id : `USR-${Date.now().toString().slice(-4)}`,
      username: cleanUser,
      nama: nama.trim(),
      role,
      kd_ao: cleanAo,
      kd_cabang: isNationalRole ? undefined : kdCabang,
      kd_posko: isNationalRole ? undefined : kdPosko,
      status,
      email: cleanEmail,
      password: password.trim() || 'test1234',
      must_change_password: editingUser ? editingUser.must_change_password : false,
      firebase_uid: editingUser?.firebase_uid,
    };

    const res = await DatabaseService.saveUser(userData, !!editingUser);

    // If requested, also provision Firebase UID immediately
    if (res.success && autoProvisionOnSave && !userData.firebase_uid) {
      try {
        const provRes = await UserProvisioningService.provisionSingleUser(userData, password.trim() || 'test1234');
        if (provRes.success && provRes.firebase_uid) {
          userData.firebase_uid = provRes.firebase_uid;
        }
      } catch (provErr) {
        console.warn('Auto-provisioning during save user notice:', provErr);
      }
    }

    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setFeedback(null);
      setPageNotification({ type: 'success', message: res.message });
      refreshData();
      onRefresh();
      
      setTimeout(() => {
        setPageNotification(prev => prev?.message === res.message ? null : prev);
      }, 5000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser?.id) {
      setFeedback({ type: 'error', message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' });
      return;
    }
    setUserToDelete(u);
  };

  const handleExecuteResetPassword = async () => {
    if (!userToReset) return;
    const res = await resetUserPassword(userToReset.id);
    if (res.success) {
      refreshData();
      onRefresh();
    }
    setUserToReset(null);
  };

  // Bulk Provisioning Handler
  const handleExecuteBulkProvision = async () => {
    if (isBulkProvisioning) return;
    setIsBulkProvisioning(true);
    setBulkResultSummary(null);

    const targetList = allUsers.filter(u => !u.firebase_uid || u.firebase_uid.trim().length === 0);
    const totalCount = targetList.length;

    setBulkProgress({
      current: 0,
      total: totalCount,
      percent: 0,
      message: `Memulai pembuatan akun Firebase Authentication untuk ${totalCount} pengguna...`
    });

    try {
      const summary = await UserProvisioningService.provisionAllUnlinkedUsers(
        allUsers,
        'test1234',
        (current, total, user, status, message) => {
          const percent = Math.round((current / total) * 100);
          setBulkProgress({
            current,
            total,
            percent,
            message: message || `Memproses ${user.nama} (${deriveUserAuthEmail(user)})...`
          });
        }
      );

      setBulkResultSummary(summary);
      setPageNotification({
        type: summary.successCount > 0 ? 'success' : 'error',
        message: `Selesai: ${summary.successCount} pengguna berhasil dibuatkan Firebase UID (email: kd_ao@kamm-manado.internal, password: test1234).`
      });

      refreshData();
      onRefresh();
    } catch (err: any) {
      setPageNotification({
        type: 'error',
        message: `Terjadi kendala saat bulk provisioning: ${err?.message || 'Gagal memproses'}`
      });
    } finally {
      setIsBulkProvisioning(false);
      setBulkProgress(null);
    }
  };

  // Single User Provisioning Handler
  const handleProvisionSingle = async (u: User) => {
    if (provisioningUserId) return;
    setProvisioningUserId(u.id);

    try {
      const res = await UserProvisioningService.provisionSingleUser(u, 'test1234');
      if (res.success) {
        setPageNotification({
          type: 'success',
          message: `Berhasil membuat Firebase Auth untuk ${u.nama} (${res.email}) dengan password test1234.`
        });
        refreshData();
        onRefresh();
      } else {
        setPageNotification({
          type: 'error',
          message: `Gagal membuat akun Firebase untuk ${u.nama}: ${res.message}`
        });
      }
    } catch (err: any) {
      setPageNotification({
        type: 'error',
        message: `Error: ${err?.message || 'Gagal memproses user'}`
      });
    } finally {
      setProvisioningUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#232734]">
        <div>
          <h1 className="text-xl font-bold text-[#f1f3f7] tracking-tight flex items-center space-x-2">
            <UserCog className="h-5 w-5 text-purple-400" />
            <span>Kontrol Administrasi, Pengguna & Password</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-800/60 font-bold">
              SUPER ADMIN ONLY
            </span>
          </h1>
          <p className="text-xs text-[#8e96a8] mt-0.5">
            Kelola akun petugas RBAC, otentikasi Firebase Auth (kd_ao@kamm-manado.internal), dan master cabang & posko
          </p>
        </div>

        {/* Tab Switcher: Users vs Cabang/Posko vs Audit Trail vs Health Check */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#13151c] p-1 rounded-xl border border-[#272d3e] flex flex-wrap gap-1">
            <button
              id="tab-btn-user-control-users"
              type="button"
              onClick={() => setActiveSection('users')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'users'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Manajemen Akun ({allUsers.length})</span>
            </button>

            <button
              id="tab-btn-user-control-master"
              type="button"
              onClick={() => setActiveSection('master_cabang_posko')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'master_cabang_posko'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Cabang & Posko</span>
            </button>

            <button
              id="tab-btn-user-control-audit"
              type="button"
              onClick={() => setActiveSection('audit_trail')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'audit_trail'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Audit Trail</span>
            </button>

            <button
              id="tab-btn-user-control-health"
              type="button"
              onClick={() => setActiveSection('system_health')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'system_health'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>Health Check</span>
            </button>
          </div>

          {activeSection === 'users' && (
            <button
              id="btn-add-new-user"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-950/40 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Tambah Pengguna</span>
            </button>
          )}
        </div>
      </div>

      {/* Page Notification */}
      {pageNotification && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
          pageNotification.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-200'
            : 'bg-rose-950/70 border-rose-800/80 text-rose-200'
        }`}>
          <div className="flex items-center space-x-2">
            {pageNotification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{pageNotification.message}</span>
          </div>
          <button
            onClick={() => setPageNotification(null)}
            className="text-white/60 hover:text-white ml-2 p-1 rounded hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Bulk Provisioning Progress Card */}
      {isBulkProvisioning && bulkProgress && (
        <div className="p-4 bg-purple-950/50 border border-purple-800/80 rounded-2xl shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Loader2 className="h-5 w-5 text-purple-400 animate-spin shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-[#f1f3f7]">
                  Sedang Membuat & Menautkan Akun Firebase Authentication...
                </h4>
                <p className="text-xs text-purple-200/80">{bulkProgress.message}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-purple-300">{bulkProgress.percent}%</span>
              <span className="text-xs text-[#8e96a8] block">
                {bulkProgress.current} dari {bulkProgress.total} akun
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#181a24] rounded-full h-2 overflow-hidden border border-[#272d3e]">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${bulkProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* PROVISIONING HERO BANNER: If unlinked users exist */}
      {unlinkedUsers.length > 0 && !isBulkProvisioning && activeSection === 'users' && (
        <div className="p-4 bg-gradient-to-r from-purple-950/60 via-[#181a24] to-indigo-950/60 border border-purple-800/60 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-[#f1f3f7]">
                Sinkronisasi Firebase Authentication Diperlukan ({unlinkedUsers.length} Pengguna)
              </h3>
            </div>
            <p className="text-xs text-[#c2c7d0] leading-relaxed">
              Format Email: <code className="bg-[#0e1015] px-2 py-0.5 rounded text-purple-300 font-mono font-bold">kd_ao@kamm-manado.internal</code> • Password default: <code className="bg-[#0e1015] px-2 py-0.5 rounded text-amber-300 font-mono font-bold">test1234</code>
            </p>
          </div>

          <button
            id="btn-bulk-provision-firebase"
            type="button"
            onClick={handleExecuteBulkProvision}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/60 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Zap className="h-4 w-4 text-amber-300" />
            <span>Buat & Tautkan Semua Firebase UID ({unlinkedUsers.length})</span>
          </button>
        </div>
      )}

      {/* MASTER DATA CABANG & POSKO SECTION */}
      {activeSection === 'master_cabang_posko' && (
        <CabangPoskoControl onRefresh={onRefresh} />
      )}

      {/* AUDIT TRAIL & ACTIVITY LOG SECTION */}
      {activeSection === 'audit_trail' && (
        <AuditTrailPanel />
      )}

      {/* SYSTEM HEALTH MONITORING SECTION */}
      {activeSection === 'system_health' && (
        <SystemHealthPanel />
      )}

      {/* USERS TABLE SECTION */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-[#13151c] p-3.5 rounded-2xl border border-[#232734] shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e96a8]" />
              <input
                id="search-user-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pengguna, username, kode AO, cabang, posko..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] placeholder-[#6b7280] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e96a8] hover:text-[#f1f3f7] p-0.5 rounded-md cursor-pointer transition-colors"
                  title="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Role Filter */}
              <div className="relative min-w-[130px] flex-1 sm:flex-none">
                <select
                  id="filter-user-role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-purple-500 cursor-pointer appearance-none pr-8 font-medium"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADM_BPKB">ADM BPKB (Jaminan BPKB)</option>
                  <option value="RM">RM (Regional)</option>
                  <option value="KACAB">KACAB (Kepala Cabang)</option>
                  <option value="KAOPS">KAOPS (Kepala Operasional)</option>
                  <option value="ADM">ADM (Admin Cabang/Posko)</option>
                  <option value="KAPOS">KAPOS (Kepala Posko)</option>
                  <option value="CMO">CMO / AO</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8e96a8] pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative min-w-[110px] flex-1 sm:flex-none">
                <select
                  id="filter-user-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs text-[#f1f3f7] focus:outline-none focus:border-purple-500 cursor-pointer appearance-none pr-8 font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8e96a8] pointer-events-none" />
              </div>

              {/* Reset Filter Button */}
              {isFiltered && (
                <button
                  id="btn-reset-user-filter"
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2.5 bg-[#1f2330] hover:bg-[#282d3e] text-[#f1f3f7] text-xs font-semibold rounded-xl border border-[#333a4f] transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                  title="Reset semua filter dan pencarian"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Info Count & Active Filter Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#8e96a8] px-1 gap-2">
            <div className="flex items-center space-x-2">
              <span>
                Menampilkan <strong className="text-[#f1f3f7]">{filteredUsers.length}</strong> dari <strong className="text-[#f1f3f7]">{allUsers.length}</strong> akun pengguna
              </span>
              {isFiltered && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold">
                  Difilter
                </span>
              )}
            </div>

            {/* Firebase Migration Readiness Indicator */}
            {(() => {
              const summary = UserProvisioningService.getMigrationSummary(allUsers);
              return (
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-[#8e96a8]">Status Firebase Auth:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-semibold">
                    {summary.migratedCount} Terhubung
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/50 font-semibold">
                    {summary.readyCount} Siap Dibuatkan
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden space-y-3">
            {/* Note Banner for Super Admin */}
            <div className="p-3 bg-[#0d0e12] border-b border-[#232734] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#8e96a8]">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  Format email resmi Firebase Auth: <strong className="text-purple-300 font-mono font-bold">kd_ao@kamm-manado.internal</strong> dengan password default <strong className="text-amber-300 font-mono font-bold">test1234</strong>.
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#c2c7d0]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                <span>Terhubung Firebase Auth</span>
                <span className="mx-1">•</span>
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                <span>Belum Terhubung</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nama & Username</th>
                    <th className="py-3.5 px-4">Role Akses</th>
                    <th className="py-3.5 px-4">Password Saat Ini</th>
                    <th className="py-3.5 px-4">Kode AO</th>
                    <th className="py-3.5 px-4">Cabang / Posko</th>
                    <th className="py-3.5 px-4">Firebase Auth (Email & UID)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2330] text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-4 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="p-3.5 rounded-full bg-[#1c1f2a] border border-[#272d3e] text-[#8e96a8]">
                            <Search className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#f1f3f7]">Tidak Ada Pengguna Ditemukan</p>
                            <p className="text-xs text-[#8e96a8] mt-1">
                              {searchQuery ? `Tidak ada hasil untuk pencarian "${searchQuery}"` : 'Tidak ada data pengguna yang sesuai dengan filter yang dipilih.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Reset Filter & Pencarian
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrent = u.id === currentUser?.id;
                      const isPasswordVisible = !visiblePasswords[u.id];
                      const authEval = UserProvisioningService.evaluateUserStatus(u, allUsers);
                      const derivedEmail = deriveUserAuthEmail(u);
                      const isThisProvisioning = provisioningUserId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-[#181b24] transition-colors">
                          {/* Name & Username */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#f1f3f7] flex items-center space-x-1.5">
                              <span>{u.nama}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-full font-semibold">
                                  (Anda)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6b7280] font-mono">@{u.username} • {u.id}</div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] border ${
                              u.role === 'SUPER_ADMIN' ? 'bg-purple-950/80 text-purple-300 border-purple-800/60' :
                              (u.role === 'ADM_BPKB' || u.role === 'ADMIN_BPKB') ? 'bg-amber-950/80 text-amber-300 border-amber-800/60' :
                              u.role === 'KAPOS' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' :
                              u.role === 'ADM' ? 'bg-blue-950/80 text-blue-300 border-blue-800/60' :
                              u.role === 'CMO' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60' :
                              u.role === 'KAOPS' ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60' :
                              'bg-slate-900/80 text-slate-300 border-slate-700/60'
                            }`}>
                              {u.role === 'ADMIN_BPKB' ? 'ADM BPKB' : u.role === 'ADM_BPKB' ? 'ADM BPKB' : u.role}
                            </span>
                          </td>

                          {/* Password (Visible to Super Admin) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="bg-[#0d0e12] px-2.5 py-1 rounded-lg border border-[#272d3e] font-mono text-xs text-[#f1f3f7] flex items-center space-x-1.5">
                                <Key className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                <span>
                                  {isPasswordVisible ? (u.password || 'test1234') : '••••••••'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#202534] transition-colors cursor-pointer"
                                title={isPasswordVisible ? 'Sembunyikan Password' : 'Lihat Password'}
                              >
                                {isPasswordVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>

                          {/* Kode AO */}
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                            {u.kd_ao || '-'}
                          </td>

                          {/* Cabang / Posko */}
                          <td className="py-3.5 px-4">
                            {u.kd_cabang ? (
                              <div>
                                <span className="font-semibold text-[#f1f3f7]">{u.kd_cabang}</span>
                                <span className="text-[11px] text-[#6b7280] block">{u.kd_posko || '-'}</span>
                              </div>
                            ) : (
                              <span className="text-[#6b7280] italic">Semua Cabang (Nasional)</span>
                            )}
                          </td>

                          {/* Firebase Auth Mapping Column */}
                          <td className="py-3.5 px-4">
                            {authEval.status === 'MIGRATED' ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/70">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span>Terhubung</span>
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(u.email || derivedEmail, `email-${u.id}`)}
                                    className="p-0.5 text-[#8e96a8] hover:text-purple-300 transition-colors"
                                    title="Salin Email Firebase"
                                  >
                                    {copiedId === `email-${u.id}` ? (
                                      <Check className="h-3 w-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                                <span className="text-[11px] font-mono text-purple-300/90 block truncate max-w-[200px]" title={u.email || derivedEmail}>
                                  {u.email || derivedEmail}
                                </span>
                                {u.firebase_uid && (
                                  <span className="text-[10px] font-mono text-[#6b7280] block truncate max-w-[180px]" title={u.firebase_uid}>
                                    UID: {u.firebase_uid.slice(0, 10)}...
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800/70">
                                    <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                                    <span>Belum Terhubung</span>
                                  </span>
                                </div>

                                <span className="text-[11px] font-mono text-[#8e96a8] block truncate max-w-[200px]" title={derivedEmail}>
                                  Target: {derivedEmail}
                                </span>

                                <button
                                  type="button"
                                  disabled={isThisProvisioning || isBulkProvisioning}
                                  onClick={() => handleProvisionSingle(u)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-700/60 font-semibold text-[10px] transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {isThisProvisioning ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                                      <span>Membuat...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-3 w-3 text-amber-400" />
                                      <span>Buat Firebase UID</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.status === 'AKTIF'
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                                : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                            }`}>
                              {u.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Reset Password Button */}
                              <button
                                id={`btn-reset-pass-${u.id}`}
                                onClick={() => setUserToReset(u)}
                                className="p-1.5 text-amber-400 hover:bg-amber-950/50 border border-transparent hover:border-amber-800/50 rounded-xl transition-colors cursor-pointer"
                                title="Reset Password ke test1234"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>

                              {/* Edit User Button */}
                              <button
                                id={`btn-edit-user-${u.id}`}
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 text-blue-400 hover:bg-blue-950/50 border border-transparent hover:border-blue-800/50 rounded-xl transition-colors cursor-pointer"
                                title="Edit Pengguna & Role"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              {/* Delete User Button */}
                              {!isCurrent && (
                                <button
                                  id={`btn-del-user-${u.id}`}
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-800/50 rounded-xl transition-colors cursor-pointer"
                                  title="Hapus Pengguna"
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
          </div>
        </div>
      )}

      {/* MODAL USER ADD / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <h3 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
                <UserCog className="h-5 w-5 text-purple-400" />
                <span>{editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Rian Firmansyah"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                />
              </div>

              <div className="p-3 bg-[#0d0e12] border border-[#272d3e] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#c2c7d0] text-xs flex items-center space-x-1.5">
                    <UserCog className="h-3.5 w-3.5 text-purple-400" />
                    <span>Identitas Akun (Username & Kode AO)</span>
                    <span className="text-rose-400">*</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8e96a8] mb-1">
                      Username Login <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/\s+/g, '');
                        setUsername(val);
                        if (!kdAo || kdAo === username.toUpperCase()) {
                          setKdAo(val.toUpperCase());
                        }
                      }}
                      placeholder="contoh: mn.72"
                      className="w-full p-2.5 bg-[#141721] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8e96a8] mb-1">
                      Kode AO <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={kdAo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/\s{2,}/g, ' ');
                        setKdAo(val);
                      }}
                      placeholder="contoh: MN.72 atau ADM BPKB"
                      className="w-full p-2.5 bg-[#141721] border border-[#272d3e] text-purple-300 placeholder-[#6b7280] rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Email Preview Info */}
                <div className="p-2 bg-[#1a1d29] rounded-lg border border-[#272d3e] flex items-center justify-between text-[11px]">
                  <span className="text-[#8e96a8]">Email Firebase:</span>
                  <span className="font-mono font-bold text-purple-300">
                    {(kdAo || username || 'user').toLowerCase().replace(/[^a-z0-9_.-]/g, '')}@kamm-manado.internal
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Role Akses Sistem (RBAC) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setRole(newRole);
                    if (!editingUser && newRole === 'ADM_BPKB') {
                      if (!kdAo || kdAo === 'MN.72') setKdAo('ADM BPKB');
                      if (!username) setUsername('admbpkb');
                    }
                  }}
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-semibold"
                >
                  <option value="CMO">CMO (Registrasi + Input FU)</option>
                  <option value="KAPOS">KAPOS (Registrasi + Input FU + Penugasan CMO)</option>
                  <option value="ADM">ADM (Registrasi + Koreksi Data + FU Ex-Customer)</option>
                  <option value="ADM_BPKB">ADM BPKB (Input Jaminan BPKB - Akses Nasional 2x24 Jam)</option>
                  <option value="KAOPS">KAOPS (Validasi KD MED + Aktivasi + FU)</option>
                  <option value="KACAB">KACAB (Monitoring View-Only Cabang)</option>
                  <option value="RM">RM (Monitoring View-Only Nasional)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Control + KD MED + Users)</option>
                </select>
              </div>

              {role !== 'SUPER_ADMIN' && role !== 'RM' && role !== 'ADM_BPKB' && role !== 'ADMIN_BPKB' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#c2c7d0] mb-1">
                      Cabang Penugasan <span className="text-rose-400">*</span>
                    </label>
                    {allCabang.length > 0 ? (
                      <select
                        id="user-select-cabang"
                        value={kdCabang}
                        onChange={(e) => {
                          const newCab = e.target.value;
                          setKdCabang(newCab);
                          const pos = allPosko.filter(p => p.kd_cabang.toUpperCase() === newCab.toUpperCase());
                          if (pos.length > 0) {
                            setKdPosko(pos[0].kd_posko);
                          } else {
                            setKdPosko('');
                          }
                        }}
                        className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {allCabang.map((c) => (
                          <option key={c.kd_cabang} value={c.kd_cabang}>
                            {c.kd_cabang} - {c.nama_cabang}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-300">
                        Belum ada Cabang. Buat di tab "Master Cabang & Posko".
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-[#c2c7d0]">
                        Posko Operasional
                      </label>
                      {role === 'KACAB' || role === 'KAOPS' ? (
                        <span className="text-[10px] text-[#8e96a8]">Opsional</span>
                      ) : null}
                    </div>

                    <select
                      id="user-select-posko"
                      value={kdPosko}
                      onChange={(e) => setKdPosko(e.target.value)}
                      className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">-- Kantor Cabang Utama / Posko Bebas --</option>
                      {availablePosko.map((p) => (
                        <option key={p.kd_posko} value={p.kd_posko}>
                          {p.kd_posko} - {p.nama_posko}
                        </option>
                      ))}
                      {kdPosko && !availablePosko.some(p => p.kd_posko.toUpperCase() === kdPosko.toUpperCase()) && (
                        <option value={kdPosko}>{kdPosko} (Tersimpan / Kustom)</option>
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#0d0e12] border border-[#272d3e] rounded-xl flex items-center space-x-2.5 text-xs text-[#8e96a8]">
                  <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="font-bold text-[#f1f3f7] block">Cakupan Wilayah: Akses Nasional (Seluruh Cabang & Posko)</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="test1234"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">Status Akun</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'AKTIF' | 'NONAKTIF')}
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium"
                >
                  <option value="AKTIF">AKTIF (Dapat Login)</option>
                  <option value="NONAKTIF">NONAKTIF (Blokir Akses)</option>
                </select>
              </div>

              {/* Auto provision toggle */}
              {!editingUser?.firebase_uid && (
                <label className="flex items-center space-x-2 p-2.5 bg-purple-950/30 border border-purple-800/40 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoProvisionOnSave}
                    onChange={(e) => setAutoProvisionOnSave(e.target.checked)}
                    className="rounded border-purple-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-purple-200">
                    Otomatis buat akun Firebase Authentication saat menyimpan
                  </span>
                </label>
              )}

              <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-user-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-md shadow-purple-950/40 cursor-pointer flex items-center space-x-1.5 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!userToReset}
        title="Reset Password Akun ke test1234"
        itemCode={userToReset?.role}
        itemName={`${userToReset?.nama} (@${userToReset?.username})`}
        description={`Apakah Anda ingin mereset password akun ${userToReset?.nama} (@${userToReset?.username}) kembali ke "test1234"?`}
        confirmButtonText="Ya, Reset ke test1234"
        onConfirm={handleExecuteResetPassword}
        onClose={() => setUserToReset(null)}
      />

      {/* Delete User Modal */}
      <ConfirmDeleteModal
        isOpen={!!userToDelete}
        title="Hapus Akun Pengguna"
        itemCode={userToDelete?.role}
        itemName={`${userToDelete?.nama} (@${userToDelete?.username})`}
        description={`Apakah Anda yakin ingin menghapus akun ${userToDelete?.nama} (${userToDelete?.username})? Pengguna ini tidak akan bisa login lagi ke sistem.`}
        confirmButtonText="Hapus Pengguna"
        onConfirm={async () => {
          if (userToDelete) {
            await DatabaseService.deleteUser(userToDelete.id);
            refreshData();
            onRefresh();
            setUserToDelete(null);
          }
        }}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};
