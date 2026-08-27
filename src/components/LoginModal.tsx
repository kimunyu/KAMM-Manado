import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Lock, 
  User, 
  AlertCircle, 
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(username, password);
    if (!res.success) {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-radial from-[#121520] via-[#0d0e14] to-[#0a0b0d]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border border-blue-400/30">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-[#f1f3f7] tracking-tight">
          Super App KAMM Manado
        </h2>
        <p className="mt-1 text-xs text-[#8e96a8]">
          Sistem Pengendalian & Monitoring
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#13151c] py-8 px-6 shadow-2xl rounded-2xl sm:px-8 border border-[#232734] space-y-5">
          {/* Information Banner regarding Password Policy */}
          <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 text-blue-300 font-bold">
              <KeyRound className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Autentikasi Akun:</span>
            </div>
            <ul className="text-[11px] text-[#c2c7d0] space-y-1 list-disc list-inside">
              <li>
                Masukkan username dan password terdaftar.
              </li>
              <li>
                Password awal akun baru: <strong className="text-white font-mono bg-blue-900/60 px-1 rounded">1234</strong> (Wajib diganti minimal 6 karakter saat login pertama).
              </li>
              <li>
                Lupa password? Hubungi <strong className="text-white">Super Admin</strong> untuk reset akun ke <strong className="text-amber-300 font-mono">1234</strong>.
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/70 text-rose-200 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide mb-1">
                Username Pengguna
              </label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-3 text-[#6b7280]" />
                <input
                  id="input-login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#c2c7d0] uppercase tracking-wide">
                  Password
                </label>
                <span className="text-[11px] text-[#8e96a8]">Default: 1234</span>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-3 text-[#6b7280]" />
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password akun..."
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#8e96a8] hover:text-[#f1f3f7] cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>Masuk ke Dashboard Sistem</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-2 text-center">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#6b7280]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Sistem Terenkripsi & Terlindungi RBAC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

