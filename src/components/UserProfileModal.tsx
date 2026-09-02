import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { AuditService } from '../services/auditService';
import { 
  User as UserIcon, 
  Lock, 
  Camera, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  MapPin, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Sparkles,
  Building2,
  Tag
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const { currentUser, refreshData, changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.foto_profil || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Password Criteria checks
  const criteria = useMemo(() => {
    const len = newPassword.length >= 6;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    const notDefault = newPassword !== '1234' && newPassword !== 'test1234' && newPassword !== currentUser?.username;
    const matches = newPassword.length > 0 && newPassword === confirmPassword;

    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (hasUpper || hasLower) score += 1;
    if (hasNumberOrSymbol) score += 1;
    if (notDefault) score += 1;

    return {
      length: len,
      length10: newPassword.length >= 10,
      hasUpperLower: hasUpper || hasLower,
      hasNumberOrSymbol,
      notDefault,
      matches,
      score,
      allValid: len && notDefault && matches
    };
  }, [newPassword, confirmPassword, currentUser?.username]);

  if (!isOpen || !currentUser) return null;

  // Compress image to lightweight JPEG Data URL (< 25KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoFeedback({ type: 'error', message: 'File yang dipilih harus berupa format gambar (JPG/PNG/WebP)!' });
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const compressedDataUrl = await compressImage(file);
      setAvatarPreview(compressedDataUrl);

      // Save to user object
      const updatedUser = {
        ...currentUser,
        foto_profil: compressedDataUrl
      };

      const res = await DatabaseService.saveUser(updatedUser, true);
      if (res.success) {
        // Update local session
        DatabaseService.setStoredAuthUser(updatedUser);
        refreshData();
        if (onRefresh) onRefresh();

        AuditService.record(
          { id: currentUser.id, nama: currentUser.nama, role: currentUser.role, kd_ao: currentUser.kd_ao },
          'AUTH',
          'UPDATE_AVATAR',
          `Pengguna "${currentUser.nama}" memperbarui foto profil`,
          currentUser.id
        );

        setPhotoFeedback({ type: 'success', message: 'Foto profil berhasil diperbarui!' });
      } else {
        setPhotoFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setPhotoFeedback({ type: 'error', message: `Gagal memproses foto: ${err.message}` });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Hapus foto profil dan gunakan avatar inisial?')) return;

    setIsUploadingPhoto(true);
    setPhotoFeedback(null);

    try {
      const updatedUser = {
        ...currentUser,
        foto_profil: undefined
      };

      const res = await DatabaseService.saveUser(updatedUser, true);
      if (res.success) {
        setAvatarPreview(null);
        DatabaseService.setStoredAuthUser(updatedUser);
        refreshData();
        if (onRefresh) onRefresh();

        AuditService.record(
          { id: currentUser.id, nama: currentUser.nama, role: currentUser.role, kd_ao: currentUser.kd_ao },
          'AUTH',
          'DELETE_AVATAR',
          `Pengguna "${currentUser.nama}" menghapus foto profil`,
          currentUser.id
        );

        setPhotoFeedback({ type: 'success', message: 'Foto profil telah dihapus.' });
      } else {
        setPhotoFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setPhotoFeedback({ type: 'error', message: `Gagal menghapus foto: ${err.message}` });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'Password harus memiliki panjang minimal 6 karakter!' });
      return;
    }

    if (newPassword === '1234' || newPassword === 'test1234') {
      setPasswordFeedback({ type: 'error', message: 'Password baru tidak boleh menggunakan password default ("1234" / "test1234")!' });
      return;
    }

    if (newPassword === currentUser.username) {
      setPasswordFeedback({ type: 'error', message: 'Password baru tidak boleh sama dengan username Anda!' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Konfirmasi password tidak cocok dengan password baru!' });
      return;
    }

    setIsSubmittingPassword(true);
    const res = await changePassword(newPassword);
    setIsSubmittingPassword(false);

    if (res.success) {
      setPasswordFeedback({ type: 'success', message: 'Password akun Anda berhasil diperbarui!' });
      setNewPassword('');
      setConfirmPassword('');
      AuditService.record(
        { id: currentUser.id, nama: currentUser.nama, role: currentUser.role, kd_ao: currentUser.kd_ao },
        'AUTH',
        'GANTI_PASSWORD_MANDIRI',
        `Pengguna "${currentUser.nama}" berhasil mengubah password secara mandiri`,
        currentUser.id
      );
      if (onRefresh) onRefresh();
    } else {
      setPasswordFeedback({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f2330] flex items-center justify-between bg-[#161822]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#f1f3f7]">Profil Akun Pengguna</h3>
              <p className="text-xs text-[#8e96a8]">Kelola informasi identitas & keamanan akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1f2330] bg-[#11131a] px-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#8e96a8] hover:text-[#c2c7d0]'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Info Profil & Foto</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'password'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-[#8e96a8] hover:text-[#c2c7d0]'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Ganti Password Mandiri</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {photoFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  photoFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                }`}>
                  {photoFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{photoFeedback.message}</span>
                </div>
              )}

              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 bg-[#181a24] rounded-2xl border border-[#232734]">
                <div className="relative group">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt={currentUser.nama}
                      referrerPolicy="no-referrer"
                      className="h-20 w-20 rounded-2xl object-cover border-2 border-blue-500/50 shadow-md shadow-blue-950/40"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-950/40 border-2 border-blue-400/30">
                      {currentUser.nama.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Upload overlay */}
                  <label 
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity"
                    title="Ganti Foto Profil"
                  >
                    <Camera className="h-5 w-5 mb-0.5 text-blue-300" />
                    <span className="text-[9px] font-bold">Ubah Foto</span>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp" 
                      onChange={handlePhotoSelect}
                      className="hidden" 
                      disabled={isUploadingPhoto}
                    />
                  </label>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span className="font-bold text-[#f1f3f7] text-sm">{currentUser.nama}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#8e96a8] mt-0.5">@{currentUser.username} • {currentUser.kd_ao || 'Internal'}</p>
                  
                  <div className="flex items-center justify-center sm:justify-start space-x-2 mt-2.5">
                    <label className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs">
                      <Camera className="h-3.5 w-3.5" />
                      <span>{isUploadingPhoto ? 'Memproses...' : 'Upload Foto'}</span>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handlePhotoSelect}
                        className="hidden" 
                        disabled={isUploadingPhoto}
                      />
                    </label>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleDeletePhoto}
                        disabled={isUploadingPhoto}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/60 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#6b7280] mt-1.5">
                    *Foto otomatis dikompresi ringan (&lt; 25KB) tanpa membebani database.
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734]">
                  <span className="text-[11px] text-[#8e96a8] flex items-center space-x-1">
                    <UserIcon className="h-3 w-3 text-indigo-400" />
                    <span>Username Akun</span>
                  </span>
                  <div className="font-mono font-bold text-xs text-[#f1f3f7] mt-1">
                    @{currentUser.username}
                  </div>
                </div>

                <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734]">
                  <span className="text-[11px] text-[#8e96a8] flex items-center space-x-1">
                    <Tag className="h-3 w-3 text-cyan-400" />
                    <span>Kode AO / Petugas</span>
                  </span>
                  <div className="font-mono font-bold text-xs text-[#f1f3f7] mt-1">
                    {currentUser.kd_ao || '-'}
                  </div>
                </div>

                <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734]">
                  <span className="text-[11px] text-[#8e96a8] flex items-center space-x-1">
                    <Building2 className="h-3 w-3 text-emerald-400" />
                    <span>Wilayah Cabang</span>
                  </span>
                  <div className="font-semibold text-xs text-[#f1f3f7] mt-1">
                    {currentUser.kd_cabang || 'Nasional (Semua Cabang)'}
                  </div>
                </div>

                <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734]">
                  <span className="text-[11px] text-[#8e96a8] flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-amber-400" />
                    <span>Posko Operasional</span>
                  </span>
                  <div className="font-semibold text-xs text-[#f1f3f7] mt-1">
                    {currentUser.kd_posko || 'Semua Posko'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                }`}>
                  {passwordFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              {/* Password Fields */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#c2c7d0]">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru Anda"
                    className="w-full px-3 py-2.5 bg-[#181a24] border border-[#282e42] rounded-xl text-xs text-[#f1f3f7] placeholder-[#6b7280] focus:outline-hidden focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e96a8] hover:text-[#f1f3f7]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#c2c7d0]">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru Anda"
                    className="w-full px-3 py-2.5 bg-[#181a24] border border-[#282e42] rounded-xl text-xs text-[#f1f3f7] placeholder-[#6b7280] focus:outline-hidden focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e96a8] hover:text-[#f1f3f7]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Strength Indicators */}
              <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#c2c7d0]">Kekuatan Password:</span>
                  <span className={`font-bold ${
                    criteria.score >= 4 ? 'text-emerald-400' : criteria.score >= 2 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {criteria.score >= 4 ? 'Kuat' : criteria.score >= 2 ? 'Sedang' : 'Lemah'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#232734] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      criteria.score >= 4 ? 'bg-emerald-500' : criteria.score >= 2 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${(criteria.score / 5) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1.5 text-[#8e96a8]">
                  <span className={criteria.length ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    {criteria.length ? '✓' : '•'} Minimal 6 karakter
                  </span>
                  <span className={criteria.notDefault ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    {criteria.notDefault ? '✓' : '•'} Bukan password default (1234)
                  </span>
                  <span className={criteria.hasUpperLower ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    {criteria.hasUpperLower ? '✓' : '•'} Huruf besar & kecil
                  </span>
                  <span className={criteria.matches ? 'text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                    {criteria.matches ? '✓' : '•'} Konfirmasi cocok
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPassword || !criteria.allValid}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-950/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPassword ? 'Menyimpan Password...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1f2330] bg-[#161822] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1c202d] hover:bg-[#252b3d] text-xs font-semibold text-[#c2c7d0] hover:text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
