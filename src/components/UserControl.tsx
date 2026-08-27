import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { CabangPoskoControl } from './CabangPoskoControl';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
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
  Sparkles
} from 'lucide-react';

interface UserControlProps {
  onRefresh: () => void;
}

export const UserControl: React.FC<UserControlProps> = ({ onRefresh }) => {
  const { allUsers, allCabang, allPosko, refreshData, currentUser, resetUserPassword } = useAuth();

  const [activeSection, setActiveSection] = useState<'users' | 'master_cabang_posko'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Form states
  const [username, setUsername] = useState('');
  const [nama, setNama] = useState('');
  const [role, setRole] = useState<UserRole>('CMO');
  const [kdAo, setKdAo] = useState('CMO-01');
  const [kdCabang, setKdCabang] = useState('');
  const [kdPosko, setKdPosko] = useState('');
  const [status, setStatus] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('1234');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pageNotification, setPageNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availablePosko = allPosko.filter(p => !kdCabang || p.kd_cabang.toUpperCase() === kdCabang.toUpperCase());

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setNama('');
    setRole('CMO');
    setKdAo('AO-' + Math.floor(10 + Math.random() * 90));
    const defaultCab = allCabang.length > 0 ? allCabang[0].kd_cabang : '';
    setKdCabang(defaultCab);
    const matchingPoskos = allPosko.filter(p => defaultCab && p.kd_cabang.toUpperCase() === defaultCab.toUpperCase());
    setKdPosko(matchingPoskos.length > 0 ? matchingPoskos[0].kd_posko : '');
    setStatus('AKTIF');
    setEmail('');
    setPassword('1234');
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setNama(u.nama);
    setRole(u.role);
    setKdAo(u.kd_ao || '');
    const userCab = u.kd_cabang || (allCabang[0]?.kd_cabang || '');
    setKdCabang(userCab);
    setKdPosko(u.kd_posko || '');
    setStatus(u.status);
    setEmail(u.email || '');
    setPassword(u.password || '1234');
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !nama.trim()) {
      setFeedback({ type: 'error', message: 'Username dan Nama Pengguna wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    const userData: User = {
      id: editingUser ? editingUser.id : `USR-${Date.now().toString().slice(-4)}`,
      username: username.trim(),
      nama: nama.trim(),
      role,
      kd_ao: kdAo.trim() || undefined,
      kd_cabang: role === 'SUPER_ADMIN' || role === 'RM' ? undefined : kdCabang,
      kd_posko: role === 'SUPER_ADMIN' || role === 'RM' ? undefined : kdPosko,
      status,
      email: email.trim() || undefined,
      password: password.trim() || '1234',
      must_change_password: false,
    };

    const res = DatabaseService.saveUser(userData, !!editingUser);
    setIsSubmitting(false);

    if (res.success) {
      // Close modal immediately and notify parent
      setIsModalOpen(false);
      setFeedback(null);
      setPageNotification({ type: 'success', message: res.message });
      refreshData();
      onRefresh();
      
      // Auto dismiss page banner after 5 seconds
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

  const handleExecuteResetPassword = () => {
    if (!userToReset) return;
    const res = resetUserPassword(userToReset.id);
    if (res.success) {
      refreshData();
      onRefresh();
    }
    setUserToReset(null);
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
            Kelola akun petugas RBAC, pantau password seluruh user, reset password ke 1234, dan atur master cabang & posko
          </p>
        </div>

        {/* Tab Switcher: User Control vs Master Cabang & Posko */}
        <div className="flex items-center space-x-2">
          <div className="bg-[#13151c] p-1 rounded-xl border border-[#272d3e] flex space-x-1">
            <button
              id="tab-btn-user-control-users"
              type="button"
              onClick={() => setActiveSection('users')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'users'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Manajemen Akun & Password ({allUsers.length})</span>
            </button>

            <button
              id="tab-btn-user-control-master"
              type="button"
              onClick={() => setActiveSection('master_cabang_posko')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSection === 'master_cabang_posko'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Cabang & Posko ({allCabang.length}/{allPosko.length})</span>
            </button>
          </div>

          {activeSection === 'users' && (
            <button
              id="btn-add-new-user"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-950/40 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
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

      {/* MASTER DATA CABANG & POSKO SECTION */}
      {activeSection === 'master_cabang_posko' && (
        <CabangPoskoControl onRefresh={onRefresh} />
      )}

      {/* USERS TABLE SECTION */}
      {activeSection === 'users' && (
        <div className="bg-[#13151c] rounded-2xl border border-[#232734] shadow-md overflow-hidden space-y-3">
          {/* Note Banner for Super Admin */}
          <div className="p-3 bg-[#0d0e12] border-b border-[#232734] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#8e96a8]">
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                Super Admin berwenang melihat password seluruh user dan mereset password ke <strong className="text-amber-300">1234</strong> bila user lupa password.
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-[#c2c7d0]">
              <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
              <span>Default: 1234 (Wajib ganti)</span>
              <span className="mx-1">•</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              <span>Kustom & Aman (Minimal 6 karakter)</span>
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
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2330] text-xs">
                {allUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isPasswordVisible = !!visiblePasswords[u.id];
                  const isDefaultPass = u.password === '1234' || u.must_change_password;

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
                        <div className="text-[11px] text-[#6b7280] font-mono">@{u.username} • {u.email || '-'}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-lg font-bold text-[11px] bg-purple-950/70 text-purple-300 border border-purple-800/60">
                          {u.role}
                        </span>
                      </td>

                      {/* Password (Visible to Super Admin) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="bg-[#0d0e12] px-2.5 py-1 rounded-lg border border-[#272d3e] font-mono text-xs text-[#f1f3f7] flex items-center space-x-1.5">
                            <Key className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span>
                              {isPasswordVisible ? u.password : '••••••••'}
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

                        {/* Status badge password */}
                        <div className="mt-1">
                          {isDefaultPass ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 font-semibold bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
                              <span>Default 1234 (Wajib ganti)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Telah Diganti Pengguna</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kode AO */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#c2c7d0]">
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
                            title="Reset Password ke 1234"
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL USER ADD / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
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

            {/* Note Password Policy */}
            {!editingUser ? (
              <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-200 space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kebijakan Password Akun Baru:</span>
                </div>
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  Password awal otomatis diatur ke <strong className="text-white bg-blue-900/60 px-1.5 py-0.5 rounded font-mono">1234</strong>. Pengguna wajib mengganti password menjadi minimal 6 karakter saat pertama kali login.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center space-x-1">
                    <Key className="h-3.5 w-3.5" />
                    <span>Password Saat Ini:</span>
                  </span>
                  <span className="font-mono text-xs bg-amber-900/60 px-2 py-0.5 rounded text-white font-bold">
                    {editingUser.password}
                  </span>
                </div>
                <div className="text-[11px] text-amber-200/80">
                  Status: {editingUser.must_change_password ? 'Wajib ganti password saat login' : 'Password telah disesuaikan'}
                </div>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#c2c7d0] mb-1">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="rian_cmo"
                    className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#c2c7d0] mb-1">
                    Kode AO (Opsional)
                  </label>
                  <input
                    type="text"
                    value={kdAo}
                    onChange={(e) => setKdAo(e.target.value)}
                    placeholder="CMO-03"
                    className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Role Akses Sistem (RBAC) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-semibold"
                >
                  <option value="CMO">CMO (Registrasi + Input FU)</option>
                  <option value="KAPOS">KAPOS (Registrasi + Input FU)</option>
                  <option value="ADM">ADM (Registrasi + Koreksi Data + Input FU)</option>
                  <option value="KAOPS">KAOPS (Validasi KD MED + Aktivasi + FU)</option>
                  <option value="KACAB">KACAB (Monitoring View-Only Cabang)</option>
                  <option value="RM">RM (Monitoring View-Only Nasional)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Control + KD MED + Users)</option>
                </select>
              </div>

              {role !== 'SUPER_ADMIN' && role !== 'RM' && (
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
                      {/* Preserve user posko if not in filtered list */}
                      {kdPosko && !availablePosko.some(p => p.kd_posko.toUpperCase() === kdPosko.toUpperCase()) && (
                        <option value={kdPosko}>{kdPosko} (Tersimpan / Kustom)</option>
                      )}
                    </select>

                    {availablePosko.length === 0 && (
                      <p className="text-[10px] text-amber-400/90 mt-1">
                        Belum ada posko di cabang ini. Pengguna akan dialokasikan ke Kantor Cabang Utama.
                      </p>
                    )}
                  </div>
                </div>
              )}

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
        title="Reset Password Akun ke 1234"
        itemCode={userToReset?.role}
        itemName={`${userToReset?.nama} (@${userToReset?.username})`}
        description={`Apakah Anda ingin mereset password akun ${userToReset?.nama} (@${userToReset?.username}) kembali ke "1234"? Pengguna akan diwajibkan membuat password baru minimal 6 karakter saat login berikutnya.`}
        confirmButtonText="Ya, Reset ke 1234"
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
        onConfirm={() => {
          if (userToDelete) {
            DatabaseService.deleteUser(userToDelete.id);
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

