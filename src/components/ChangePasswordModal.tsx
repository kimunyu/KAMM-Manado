import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  KeyRound, 
  LogOut, 
  X, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  isForced?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  isForced = false,
  onClose,
  onSuccess
}) => {
  const { currentUser, changePassword, logout } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Criteria checks
  const criteria = useMemo(() => {
    const len = newPassword.length >= 6;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    const notDefault = newPassword !== '1234' && newPassword !== currentUser?.username;
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Password harus memiliki panjang minimal 6 karakter!');
      return;
    }

    if (newPassword === '1234') {
      setErrorMessage('Password baru tidak boleh menggunakan password default "1234"!');
      return;
    }

    if (newPassword === currentUser?.username) {
      setErrorMessage('Password baru tidak boleh sama dengan username Anda!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru!');
      return;
    }

    setIsSubmitting(true);
    const res = await changePassword(newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Password berhasil diubah! Akun Anda kini aman.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.message);
    }
  };

  const getStrengthLabel = (score: number) => {
    if (newPassword.length === 0) return { label: 'Belum Diisi', color: 'bg-gray-700', text: 'text-gray-400' };
    if (score <= 2) return { label: 'Lemah (Kurang Unik)', color: 'bg-rose-500', text: 'text-rose-400' };
    if (score <= 4) return { label: 'Sedang (Cukup)', color: 'bg-amber-500', text: 'text-amber-400' };
    return { label: 'Sangat Kuat & Unik', color: 'bg-emerald-500', text: 'text-emerald-400' };
  };

  const strength = getStrengthLabel(criteria.score);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#13151c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-blue-900/40 space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-2xl ${isForced ? 'bg-amber-950/80 text-amber-400 border border-amber-800/80' : 'bg-blue-950/80 text-blue-400 border border-blue-800/80'}`}>
              {isForced ? <ShieldAlert className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
                <span>{isForced ? 'Wajib Ganti Password Pertama Kali' : 'Perbarui Password Akun'}</span>
              </h3>
              <p className="text-xs text-[#8e96a8] mt-0.5">
                {isForced 
                  ? 'Akun Anda baru diterbitkan dengan password default 1234. Demi keamanan, Anda wajib membuat password baru.'
                  : `Pengguna: ${currentUser?.nama} (@${currentUser?.username})`}
              </p>
            </div>
          </div>
          {!isForced && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Security Requirement Banner */}
        <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#272d3e] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#c2c7d0]">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Standar Keamanan Password:</span>
            </span>
            <span className={`text-[11px] font-bold ${strength.text}`}>
              {strength.label}
            </span>
          </div>

          {/* Strength Bar */}
          <div className="w-full bg-[#181b24] h-1.5 rounded-full overflow-hidden flex">
            <div 
              className={`h-full transition-all duration-300 ${strength.color}`} 
              style={{ width: `${Math.min(100, (criteria.score / 5) * 100)}%` }}
            />
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
            <div className={`flex items-center space-x-1.5 ${criteria.length ? 'text-emerald-400 font-medium' : 'text-[#8e96a8]'}`}>
              {criteria.length ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-[#3b4255] shrink-0" />}
              <span>Minimal 6 karakter ({newPassword.length}/6)</span>
            </div>

            <div className={`flex items-center space-x-1.5 ${criteria.matches ? 'text-emerald-400 font-medium' : 'text-[#8e96a8]'}`}>
              {criteria.matches ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-[#3b4255] shrink-0" />}
              <span>Konfirmasi password sesuai</span>
            </div>

            <div className={`flex items-center space-x-1.5 ${criteria.hasUpperLower ? 'text-emerald-400 font-medium' : 'text-[#8e96a8]'}`}>
              {criteria.hasUpperLower ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-[#3b4255] shrink-0" />}
              <span>Kombinasi huruf / angka</span>
            </div>

            <div className={`flex items-center space-x-1.5 ${criteria.notDefault ? 'text-emerald-400 font-medium' : 'text-[#8e96a8]'}`}>
              {criteria.notDefault ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-[#3b4255] shrink-0" />}
              <span>Unik & bukan &quot;1234&quot;</span>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* New Password Input */}
          <div>
            <label className="block font-bold text-[#c2c7d0] mb-1">
              Password Baru (Minimal 6 Karakter) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-3 text-[#6b7280]" />
              <input
                id="input-new-password"
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan minimal 6 karakter..."
                className="w-full pl-9 pr-10 py-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-[#8e96a8] hover:text-[#f1f3f7] cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block font-bold text-[#c2c7d0] mb-1">
              Konfirmasi Password Baru <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="h-4 w-4 absolute left-3 top-3 text-[#6b7280]" />
              <input
                id="input-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru Anda..."
                className={`w-full pl-9 pr-10 py-2.5 bg-[#0d0e12] border ${confirmPassword && newPassword !== confirmPassword ? 'border-rose-700/80 focus:ring-rose-500/50' : 'border-[#272d3e] focus:ring-blue-500/50'} text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-[#8e96a8] hover:text-[#f1f3f7] cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-400 mt-1">Konfirmasi password belum sesuai.</p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Password cocok!</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#232734] flex items-center justify-between">
            {isForced ? (
              <button
                type="button"
                onClick={() => logout()}
                className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl font-semibold flex items-center space-x-1.5 cursor-pointer text-xs"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar / Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl font-semibold cursor-pointer text-xs"
              >
                Batal
              </button>
            )}

            <button
              id="btn-submit-change-password"
              type="submit"
              disabled={isSubmitting || !criteria.allValid}
              className={`px-5 py-2.5 rounded-xl font-bold shadow-lg text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                criteria.allValid && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
                  : 'bg-[#1c202d] text-[#6b7280] border border-[#2d3448] cursor-not-allowed'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Aktifkan Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
