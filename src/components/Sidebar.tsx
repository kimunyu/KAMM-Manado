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
  Flame,
  Clock
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'daftar-mediator' 
  | 'registrasi' 
  | 'validasi' 
  | 'follow-up' 
  | 'user-control'
  | 'ex-customer';

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

  const isBpkbAdmin = currentUser?.role === 'ADMIN_BPKB';

  const mediatorMenuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard Kontrol',
      icon: LayoutDashboard,
      desc: 'Ringkasan Status & Kategori FU',
      visible: !isBpkbAdmin,
    },
    {
      id: 'daftar-mediator' as ActiveTab,
      label: 'Daftar Seluruh Mediator',
      icon: Users,
      desc: 'Tabel KD MED, Status, Tgl FU',
      visible: !isBpkbAdmin,
    },
    {
      id: 'registrasi' as ActiveTab,
      label: 'Registrasi Mediator',
      icon: UserPlus,
      desc: 'Pengajuan Baru (Belum Aktif)',
      visible: canRegisterMediator && !isBpkbAdmin,
      badge: 'CMO/KAPOS/ADM',
    },
    {
      id: 'validasi' as ActiveTab,
      label: 'Peninjauan & KD MED',
      icon: ShieldCheck,
      desc: 'Review Admin & Input KD MED',
      visible: canValidateKdMed && !isBpkbAdmin,
      counter: pendingCount > 0 ? pendingCount : undefined,
      badge: 'ADMIN/KAPOS',
    },
    {
      id: 'follow-up' as ActiveTab,
      label: 'Follow-Up (FU) Mediator',
      icon: PhoneCall,
      desc: 'Input Hasil FU & 5 Log Terakhir',
      visible: canInputFU && !isBpkbAdmin,
    },
    {
      id: 'user-control' as ActiveTab,
      label: 'Admin & Master Data',
      icon: UserCog,
      desc: 'User, Role, Cabang & Posko',
      visible: canManageUsers && !isBpkbAdmin,
      badge: 'SUPER ADMIN',
    },
  ];

  return (
    <aside className="w-full lg:w-72 bg-[#13151c] border-r border-[#232734] p-4 shrink-0">
      {/* Role permission summary banner */}
      <div className="mb-4 p-3.5 bg-[#181a24] border border-[#272d3e] rounded-xl">
        <div className="flex items-center justify-between text-xs text-[#8e96a8] mb-1.5">
          <span className="font-semibold text-[#c2c7d0]">Hak Akses Role:</span>
          <span className="font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded text-[10px]">
            {currentUser?.role}
          </span>
        </div>
        <p className="text-[11px] text-[#8e96a8] leading-relaxed">
          {currentUser?.role === 'SUPER_ADMIN' && 'Full Control: Kontrol Mediator & Kontrol Ex-Customer, User Management, Cabang & Posko.'}
          {currentUser?.role === 'ADMIN_BPKB' && 'Khusus Input Data Jaminan BPKB nasabah lunas. Akses data & edit aktif 2x24 jam.'}
          {currentUser?.role === 'RM' && 'Akses Monitoring Nasional: Mediator & Ex-Customer seluruh cabang & posko (View-Only).'}
          {currentUser?.role === 'KACAB' && `Akses Monitoring Cabang ${currentUser.kd_cabang || ''}: Mediator & Drip Ex-Customer.`}
          {currentUser?.role === 'KAOPS' && 'Registrasi, Peninjauan Berkas, Input KD MED, serta FU Mediator & Ex-Customer.'}
          {currentUser?.role === 'ADM' && 'Admin Cabang: Pengelolaan Mediator & Shared Pool FU Ex-Customer Posko.'}
          {currentUser?.role === 'KAPOS' && `Pengelolaan Mediator & Drip-Feed Ex-Customer Posko ${currentUser.kd_posko || ''} + Penugasan CMO.`}
          {currentUser?.role === 'CMO' && `FU Mediator & Tugas Harian Ex-Customer (Maks 5) oleh KAPOS ${currentUser.kd_posko || ''}.`}
        </p>
      </div>

      {/* EX-CUSTOMER MODULE ITEM (FEATURED) */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
          <span>Modul Ex-Customer</span>
          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
            BARU
          </span>
        </div>
        <button
          id="menu-item-ex-customer"
          onClick={() => setActiveTab('ex-customer')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
            activeTab === 'ex-customer'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium border-amber-500 shadow-md shadow-orange-950/40'
              : 'bg-[#181a24] text-[#f1f3f7] hover:bg-[#1f2330] border-[#272d3e]'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <Flame className={`h-5 w-5 shrink-0 ${activeTab === 'ex-customer' ? 'text-white' : 'text-amber-400'}`} />
            <div className="truncate">
              <div className="text-sm font-bold leading-tight">Kontrol Ex-Customer</div>
              <div className={`text-[11px] truncate mt-0.5 ${activeTab === 'ex-customer' ? 'text-amber-100' : 'text-[#8e96a8]'}`}>
                {isBpkbAdmin ? 'Input BPKB & Riwayat (48 Jam)' : 'Drip 25/Hari & Penugasan CMO'}
              </div>
            </div>
          </div>
          {activeTab === 'ex-customer' && <ChevronRight className="h-4 w-4 text-white shrink-0" />}
        </button>
      </div>

      {/* MEDIATOR CONTROL SECTION */}
      {!isBpkbAdmin && (
        <>
          <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-3 mb-2.5">
            Modul Kontrol Mediator
          </div>

          <nav className="space-y-1.5">
            {mediatorMenuItems
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
        </>
      )}
    </aside>
  );
};

