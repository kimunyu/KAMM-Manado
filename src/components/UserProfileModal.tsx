import React from 'react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { X, User as UserIcon, Shield, Building2, MapPin, Hash, Calendar } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onRefresh?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  user: propUser,
  onRefresh 
}) => {
  const { currentUser: authUser } = useAuth();
  const user = propUser || authUser;

  if (!isOpen || !user) return null;


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Profil Pengguna</h3>
              <p className="text-[11px] text-[#8e96a8]">Detail akun yang sedang aktif</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#202534] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center space-x-4 p-4 rounded-xl bg-[#161a26] border border-[#232734]">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
              {user.nama.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{user.nama}</div>
              <div className="text-[#8e96a8] font-mono mt-0.5">@{user.username}</div>
              <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                {user.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <Hash className="h-3 w-3 text-blue-400" />
                <span>Kode AO</span>
              </span>
              <div className="font-mono font-bold text-white">{user.kd_ao || '-'}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <Building2 className="h-3 w-3 text-blue-400" />
                <span>Cabang</span>
              </span>
              <div className="font-mono font-bold text-white">{user.kd_cabang}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <MapPin className="h-3 w-3 text-blue-400" />
                <span>Posko</span>
              </span>
              <div className="font-mono font-bold text-white">{user.kd_posko}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <Shield className="h-3 w-3 text-blue-400" />
                <span>Status Akun</span>
              </span>
              <div className="font-bold text-emerald-400">{user.status}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#232734] bg-[#161a26]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#202534] hover:bg-[#282f42] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
