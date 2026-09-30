import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KammLogo } from './KammLogo';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  FileSpreadsheet, 
  ShieldAlert, 
  LogOut, 
  ChevronDown,
  User as UserIcon,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export type MainModule = 'sales-acquisition' | 'kontrol-sales' | 'kontrol-mediator' | 'ex-customer';

interface HeaderProps {
  activeModule: MainModule;
  onSelectModule: (mod: MainModule) => void;
  onOpenProfile?: () => void;
  onOpenPassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onSelectModule,
  onOpenProfile,
  onOpenPassword
}) => {
  const { 
    currentUser, 
    allUsers, 
    switchUser, 
    logout,
    canAccessKontrolMediator,
    canAccessExCustomer,
    canAccessSalesAcquisition,
    canAccessKontrolSales
  } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitchMenuOpen, setIsSwitchMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0d1017]/90 backdrop-blur-md border-b border-[#202636] px-4 lg:px-6 py-2.5 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center space-x-6">
        <KammLogo size="sm" />

        {/* Top Module Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#131722] p-1 rounded-xl border border-[#202738]">
          {/* 1. Prospek Sales */}
          {canAccessSalesAcquisition && (
            <button
              type="button"
              onClick={() => onSelectModule('sales-acquisition')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                activeModule === 'sales-acquisition'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#1a2030]'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Prospek Sales</span>
            </button>
          )}

          {/* 2. Kontrol Sales */}
          {canAccessKontrolSales && (
            <button
              type="button"
              onClick={() => onSelectModule('kontrol-sales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                activeModule === 'kontrol-sales'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#1a2030]'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Kontrol Sales</span>
            </button>
          )}

          {/* 3. Kontrol Mediator (Accessible by CMO!) */}
          {canAccessKontrolMediator && (
            <button
              type="button"
              onClick={() => onSelectModule('kontrol-mediator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                activeModule === 'kontrol-mediator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#1a2030]'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Kontrol Mediator</span>
            </button>
          )}

          {/* 4. Ex-Customer (Accessible by CMO!) */}
          {canAccessExCustomer && (
            <button
              type="button"
              onClick={() => onSelectModule('ex-customer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                activeModule === 'ex-customer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#1a2030]'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Ex-Customer</span>
            </button>
          )}
        </nav>
      </div>

      {/* Right Controls: Role Switcher & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Switch Account Quick Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSwitchMenuOpen(!isSwitchMenuOpen)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-[#141926] border border-[#232c40] text-xs hover:border-blue-500 transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline text-[#8e96a8]">Simulasi Role:</span>
            <span className="font-bold text-white font-mono">{currentUser?.role || '-'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#5c6479]" />
          </button>

          {isSwitchMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#141824] border border-[#273044] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#717b94] uppercase tracking-wider">
                Ganti Akun Demo
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setIsSwitchMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      currentUser?.id === u.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-[#1d2334] text-[#c2c9d6]'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{u.nama}</div>
                      <div className="text-[10px] opacity-75 font-mono">
                        {u.role} • {u.kd_posko} {u.kd_ao ? `• AO: ${u.kd_ao}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-1.5 rounded-xl bg-[#141926] border border-[#232c40] hover:border-[#384460] transition-colors cursor-pointer"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {currentUser?.nama?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left text-xs leading-none pr-1">
              <div className="font-semibold text-white max-w-[120px] truncate">{currentUser?.nama}</div>
              <div className="text-[10px] text-[#717b94] font-mono mt-0.5">{currentUser?.username}</div>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[#141824] border border-[#273044] rounded-2xl shadow-2xl p-1.5 z-50">
              <div className="px-3 py-2 border-b border-[#232b3d] mb-1">
                <div className="text-xs font-bold text-white truncate">{currentUser?.nama}</div>
                <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                  {currentUser?.role} ({currentUser?.kd_posko})
                </div>
              </div>

              {onOpenProfile && (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#c2c9d6] hover:bg-[#1d2334] hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Profil Pengguna</span>
                </button>
              )}

              {onOpenPassword && (
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenPassword();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#c2c9d6] hover:bg-[#1d2334] hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Ganti Password</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 flex items-center space-x-2 transition-colors cursor-pointer mt-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
