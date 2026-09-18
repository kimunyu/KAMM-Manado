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
  TrendingUp
} from 'lucide-react';

export type ModuleId = 'sales' | 'mediator' | 'ex-customer' | 'master-data';

export type ActiveTab = 
  | 'dashboard' 
  | 'daftar-mediator' 
  | 'registrasi' 
  | 'validasi' 
  | 'follow-up' 
  | 'user-control'
  | 'ex-customer'
  | 'kontrol-sales';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  holdSalesCount?: number;
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  pendingCount,
  holdSalesCount = 0,
  activeModule,
  setActiveModule
}) => {
  const { 
    currentUser, 
    canRegisterMediator, 
    canValidateKdMed, 
    canInputFU, 
    canManageUsers 
  } = useAuth();

  const role = currentUser?.role;
  const isBpkbAdmin = role === 'ADM_BPKB' || role === 'ADMIN_BPKB';
  const isAdmDe = role === 'ADM_DE';

  const canAccessSales = 
    role === 'ADM_DE' || 
    role === 'ADM' || 
    role === 'KAOPS' || 
    role === 'KACAB' || 
    role === 'RM' || 
    role === 'KAPOS' || 
    role === 'SUPER_ADMIN';

  const canAccessMediator = !isBpkbAdmin && !isAdmDe;
  const canAccessExCustomer = !isAdmDe;
  const canAccessMasterData = role === 'SUPER_ADMIN' || canManageUsers;

  // Submenu items when "mediator" module is active
  const mediatorMenuItems = [
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
      desc: 'Pengajuan Baru (Belum Aktif)',
      visible: canRegisterMediator,
      badge: 'CMO/KAPOS/ADM',
    },
    {
      id: 'validasi' as ActiveTab,
      label: 'Peninjauan & KD MED',
      icon: ShieldCheck,
      desc: 'Review Admin & Input KD MED',
      visible: canValidateKdMed,
      counter: pendingCount > 0 ? pendingCount : undefined,
      badge: 'ADMIN/KAPOS',
    },
    {
      id: 'follow-up' as ActiveTab,
      label: 'Follow-Up (FU) Mediator',
      icon: PhoneCall,
      desc: 'Input Hasil FU & Log Terakhir',
      visible: canInputFU,
    },
  ];

  // All accessible modules for the user
  const allModules = [
    {
      id: 'sales' as ModuleId,
      label: 'Kontrol Sales',
      subtitle: 'Pencairan Konsumen & SLA',
      icon: TrendingUp,
      badge: 'TRIAL',
      counter: holdSalesCount > 0 ? holdSalesCount : undefined,
      visible: canAccessSales,
      targetTab: 'kontrol-sales' as ActiveTab,
      color: 'text-purple-400',
      activeBorder: 'border-purple-500',
      activeBg: 'bg-purple-950/80',
      activeText: 'text-purple-300',
    },
    {
      id: 'mediator' as ModuleId,
      label: 'Kontrol Mediator',
      subtitle: 'Registrasi, Validasi & FU',
      icon: Users,
      counter: pendingCount > 0 ? pendingCount : undefined,
      visible: canAccessMediator,
      targetTab: 'dashboard' as ActiveTab,
      color: 'text-blue-400',
      activeBorder: 'border-blue-500',
      activeBg: 'bg-blue-950/80',
      activeText: 'text-blue-300',
    },
    {
      id: 'ex-customer' as ModuleId,
      label: 'Kontrol Ex-Customer',
      subtitle: 'Drip 25/Hari & Jaminan BPKB',
      icon: Flame,
      badge: 'BARU',
      visible: canAccessExCustomer,
      targetTab: 'ex-customer' as ActiveTab,
      color: 'text-amber-400',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-950/80',
      activeText: 'text-amber-300',
    },
    {
      id: 'master-data' as ModuleId,
      label: 'Admin & Master Data',
      subtitle: 'Pengguna, Cabang & Posko',
      icon: UserCog,
      badge: 'SUPER',
      visible: canAccessMasterData,
      targetTab: 'user-control' as ActiveTab,
      color: 'text-emerald-400',
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-950/80',
      activeText: 'text-emerald-300',
    },
  ].filter(m => m.visible);

  const currentModConfig = allModules.find(m => m.id === activeModule) || allModules[0];

  return (
    <aside className="w-full lg:w-72 bg-[#13151c] border-r border-[#232734] p-4 shrink-0 flex flex-col lg:sticky lg:top-16 lg:self-start lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
      <div className="space-y-4">
        {/* Active Module Header */}
        <div className="p-3.5 bg-[#181a24] border border-[#272d3e] rounded-xl">
          <div className="flex items-center justify-between text-xs text-[#8e96a8] mb-1.5">
            <span className="font-semibold text-[#c2c7d0] uppercase tracking-wider text-[10px]">
              Ruang Kerja Aktif
            </span>
            <span className="font-bold text-[10px] px-2 py-0.5 rounded border border-[#3b4359] text-[#e0e4eb] bg-[#222838]">
              {currentUser?.role === 'ADMIN_BPKB' || currentUser?.role === 'ADM_BPKB' 
                ? 'ADM BPKB' 
                : currentUser?.role === 'ADM_DE'
                ? 'ADM DATA ENTRY'
                : currentUser?.role}
            </span>
          </div>

          {/* Current Active Module Display */}
          {currentModConfig && (
            <div className="flex items-center space-x-3 mt-2">
              <div className={`p-2 rounded-lg ${currentModConfig.activeBg} border ${currentModConfig.activeBorder} ${currentModConfig.activeText}`}>
                <currentModConfig.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#f1f3f7] truncate">{currentModConfig.label}</h2>
                <p className={`text-[11px] truncate ${currentModConfig.activeText} opacity-80`}>
                  {currentModConfig.subtitle}
                </p>
              </div>
            </div>
          )}

          {/* Quick Module Switcher Chips at the Top of Sidebar */}
          {allModules.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-[#272d3e]">
              {allModules.map((m) => {
                const isCurrent = m.id === activeModule;
                const Icon = m.icon;
                return (
                  <button
                    key={`top-switch-${m.id}`}
                    id={`top-switch-${m.id}`}
                    onClick={() => {
                      if (!isCurrent) {
                        setActiveModule(m.id);
                        setActiveTab(m.targetTab);
                      }
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all text-left truncate cursor-pointer border ${
                      isCurrent
                        ? `${m.activeBg} ${m.activeBorder} ${m.activeText} shadow-xs`
                        : 'bg-[#141620] hover:bg-[#1f2434] border-[#242938] hover:border-[#384158] text-[#8e96a8] hover:text-[#e0e4eb]'
                    }`}
                    title={`Pindah ke ${m.label}`}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 truncate">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? m.activeText : m.color}`} />
                      <span className="truncate">{m.label.replace('Kontrol ', '')}</span>
                    </div>
                    {m.counter !== undefined && m.counter > 0 && (
                      <span className={`ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full shrink-0 ${
                        isCurrent ? 'bg-white text-gray-900' : 'bg-rose-500 text-white animate-pulse'
                      }`}>
                        {m.counter}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* WORKSPACE 1: KONTROL MEDIATOR MENU */}
        {activeModule === 'mediator' && (
          <div>
            <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider px-3 mb-2">
              Menu Navigasi Mediator
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
          </div>
        )}

        {/* WORKSPACE 2: KONTROL SALES OVERVIEW */}
        {activeModule === 'sales' && (
          <div>
            <div className="text-[11px] font-bold text-purple-400/90 uppercase tracking-wider px-3 mb-2">
              Menu Kontrol Sales
            </div>

            <button
              id="menu-item-kontrol-sales"
              onClick={() => setActiveTab('kontrol-sales')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-medium border-purple-500 shadow-md shadow-purple-950/40"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <TrendingUp className="h-5 w-5 shrink-0 text-white" />
                <div className="truncate">
                  <div className="text-sm font-bold leading-tight">Dashboard & Form Sales</div>
                  <div className="text-[11px] text-purple-100 truncate mt-0.5">
                    {isAdmDe ? 'Validasi Nasional & Copy WA' : 'Monitoring Cair & SLA Hold'}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 ml-2">
                {holdSalesCount > 0 && (
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded-full bg-white text-purple-700 animate-pulse shadow-sm"
                    title={`${holdSalesCount} data status hold`}
                  >
                    {holdSalesCount}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-white shrink-0" />
              </div>
            </button>

            {/* In-module feature hints */}
            <div className="mt-3 p-3 bg-[#181a24] border border-[#272d3e] rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                Fitur di Ruang Kerja Ini:
              </div>
              <ul className="text-xs text-[#b3b9c7] space-y-1.5">
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span>Dashboard Rekapitulasi Real-Time</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span>Peringatan SLA & Status HOLD</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span>Tabel Data Konsumen Per Posko</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                  <span>Form Input Pencairan Konsumen</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* WORKSPACE 3: KONTROL EX-CUSTOMER OVERVIEW */}
        {activeModule === 'ex-customer' && (
          <div>
            <div className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider px-3 mb-2">
              Menu Kontrol Ex-Customer
            </div>

            <button
              id="menu-item-ex-customer"
              onClick={() => setActiveTab('ex-customer')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium border-amber-500 shadow-md shadow-orange-950/40"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Flame className="h-5 w-5 shrink-0 text-white" />
                <div className="truncate">
                  <div className="text-sm font-bold leading-tight">Kontrol Ex-Customer</div>
                  <div className="text-[11px] text-amber-100 truncate mt-0.5">
                    {isBpkbAdmin ? 'Input BPKB & Riwayat (48 Jam)' : 'Drip 25/Hari & Penugasan CMO'}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white shrink-0" />
            </button>

            {/* In-module feature hints */}
            <div className="mt-3 p-3 bg-[#181a24] border border-[#272d3e] rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                Fitur di Ruang Kerja Ini:
              </div>
              <ul className="text-xs text-[#b3b9c7] space-y-1.5">
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Drip Pool 25 Konsumen / Hari</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Penugasan Harian CMO (Maks 5)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Input & Arsip BPKB 48 Jam</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Log Riwayat Follow-Up Konsumen</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* WORKSPACE 4: ADMIN & MASTER DATA */}
        {activeModule === 'master-data' && (
          <div>
            <div className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wider px-3 mb-2">
              Menu Master Data
            </div>

            <button
              id="menu-item-user-control"
              onClick={() => setActiveTab('user-control')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border bg-gradient-to-r from-emerald-700 to-teal-700 text-white font-medium border-emerald-500 shadow-md shadow-emerald-950/40"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <UserCog className="h-5 w-5 shrink-0 text-white" />
                <div className="truncate">
                  <div className="text-sm font-bold leading-tight">Pengguna, Cabang & Posko</div>
                  <div className="text-[11px] text-emerald-100 truncate mt-0.5">
                    User Control & Role Setting
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white shrink-0" />
            </button>

            {/* In-module feature hints */}
            <div className="mt-3 p-3 bg-[#181a24] border border-[#272d3e] rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                Fitur di Ruang Kerja Ini:
              </div>
              <ul className="text-xs text-[#b3b9c7] space-y-1.5">
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Manajemen User & Hak Akses</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Pengaturan Cabang & Posko</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Reset Password & Audit Akun</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>Sinkronisasi Cloud Firestore</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
