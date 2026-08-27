import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  PhoneCall, 
  UserCog,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'daftar-mediator' 
  | 'registrasi' 
  | 'validasi' 
  | 'follow-up' 
  | 'user-control';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, pendingCount }) => {
  const { 
    currentUser, 
    canRegisterMediator, 
    canValidateKdMed, 
    canInputFU, 
    canManageUsers 
  } = useAuth();

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard Kontrol',
      icon: LayoutDashboard,
      desc: 'Ringkasan Status & Kategori FU',
      visible: true,
    },
    {
      id: 'daftar-mediator' as ActiveTab,
      label: 'Daftar Seluruh Mediator',
      icon: Users,
      desc: 'Tabel KD MED, Status, Tgl FU',
      visible: true,
    },
    {
      id: 'registrasi' as ActiveTab,
      label: 'Registrasi Mediator',
      icon: UserPlus,
      desc: 'Pengajuan Status PENDING',
      visible: canRegisterMediator,
      badge: 'CMO/KAPOS/ADM',
    },
    {
      id: 'validasi' as ActiveTab,
      label: 'Validasi / Input KD MED',
      icon: ShieldCheck,
      desc: 'Input KD MED & Aktivasi',
      visible: canValidateKdMed,
      counter: pendingCount > 0 ? pendingCount : undefined,
      badge: 'KAOPS/ADMIN',
    },
    {
      id: 'follow-up' as ActiveTab,
      label: 'Follow-Up (FU) Mediator',
      icon: PhoneCall,
      desc: 'Input Hasil FU & 5 Log Terakhir',
      visible: canInputFU,
    },
    {
      id: 'user-control' as ActiveTab,
      label: 'Admin & Master Data',
      icon: UserCog,
      desc: 'User, Role, Cabang & Posko',
      visible: canManageUsers,
      badge: 'SUPER ADMIN',
    },
  ];

  return (
    <aside className="w-full lg:w-72 bg-[#13151c] border-r border-[#232734] p-4 shrink-0">
      {/* Role permission summary banner */}
      <div className="mb-4 p-3.5 bg-[#181a24] border border-[#272d3e] rounded-xl">
        <div className="flex items-center justify-between text-xs text-[#8e96a8] mb-1.5">
          <span className="font-semibold text-[#c2c7d0]">Hak Akses Role:</span>
          <span className="font-bold text-blue-300 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded text-[10px]">
            {currentUser?.role}
          </span>
        </div>
        <p className="text-[11px] text-[#8e96a8] leading-relaxed">
          {currentUser?.role === 'SUPER_ADMIN' && 'Full Control: Tambah, Edit, Hapus, User Control, Cabang & Posko, dan Input KD MED.'}
          {currentUser?.role === 'RM' && 'Akses Monitoring: Melihat seluruh data cabang & posko (View-Only).'}
          {currentUser?.role === 'KACAB' && `Akses Monitoring Cabang ${currentUser.kd_cabang || ''} (View-Only).`}
          {currentUser?.role === 'KAOPS' && 'Registrasi, Validasi KD MED (Aktivasi), Edit Data, dan Input FU.'}
          {currentUser?.role === 'ADM' && 'Registrasi (PENDING), Koreksi/Edit Data, dan Input FU.'}
          {currentUser?.role === 'KAPOS' && `Registrasi & FU khusus Posko ${currentUser.kd_posko || ''} (${currentUser.kd_cabang || ''}).`}
          {currentUser?.role === 'CMO' && `Registrasi & FU khusus mediator terdaftar Kode CMO ${currentUser.kd_ao || 'CMO'}.`}
        </p>
      </div>

      <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-3 mb-2.5">
        Menu Utama
      </div>

      <nav className="space-y-1.5">
        {menuItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`menu-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium border-blue-500 shadow-md shadow-blue-950/40'
                    : 'text-[#a6adbb] hover:bg-[#1c202d] hover:text-[#f1f3f7] border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#7e879b]'
                    }`}
                  />
                  <div className="truncate">
                    <div className="text-sm font-medium leading-tight">{item.label}</div>
                    <div
                      className={`text-[11px] truncate mt-0.5 ${
                        isActive ? 'text-blue-100' : 'text-[#6b7280]'
                      }`}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  {item.counter !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        isActive
                          ? 'bg-white text-blue-700'
                          : 'bg-rose-500 text-white animate-pulse'
                      }`}
                    >
                      {item.counter}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 text-white" />}
                </div>
              </button>
            );
          })}
      </nav>
    </aside>
  );
};
