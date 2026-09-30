import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MainModule } from './Header';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CheckSquare,
  PhoneCall,
  UserCheck,
  FileSpreadsheet,
  Building2,
  Shield,
  History,
  MapPin,
  Kanban,
  TableProperties,
  Upload,
  CalendarClock,
  PlusCircle,
  FileCheck,
  Activity
} from 'lucide-react';

export type ActiveTab = string;
export type ModuleId = MainModule;

interface SidebarProps {
  activeModule: MainModule;
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  setActiveTab?: (tab: any) => void;
  pendingCount?: number;
  holdSalesCount?: number;
  setActiveModule?: (moduleId: any) => void;
  onOpenQuickEntry?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  activeTab,
  onSelectTab: propOnSelectTab,
  setActiveTab,
  pendingCount,
  holdSalesCount,
  setActiveModule,
  onOpenQuickEntry
}) => {
  const onSelectTab = propOnSelectTab || setActiveTab || (() => {});

  const { currentUser, canAccessUserManagement, canAccessAudit } = useAuth();
  const role = currentUser?.role || '';

  return (
    <aside className="w-64 bg-[#0d1017] border-r border-[#202636] flex flex-col shrink-0 min-h-[calc(100vh-53px)]">
      {/* Module Context Header */}
      <div className="p-4 border-b border-[#202636]/80 bg-[#121622]/40">
        <div className="text-[10px] font-bold text-[#717b94] uppercase tracking-wider">
          Navigasi Modul
        </div>
        <div className="text-sm font-bold text-white mt-0.5 flex items-center justify-between">
          <span>
            {activeModule === 'sales-acquisition' && 'Prospek Sales'}
            {activeModule === 'kontrol-sales' && 'Kontrol Sales'}
            {activeModule === 'kontrol-mediator' && 'Kontrol Mediator'}
            {activeModule === 'ex-customer' && 'Ex-Customer Control'}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            {role}
          </span>
        </div>
      </div>

      {/* Navigation Menu by Active Module */}
      <div className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* Module Specific Tabs */}
        <div className="space-y-1">
          {/* ================= 1. PROSPEK SALES ================= */}
          {activeModule === 'sales-acquisition' && (
            <>
              {onOpenQuickEntry && (
                <button
                  type="button"
                  onClick={onOpenQuickEntry}
                  className="w-full mb-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Input Prospek Baru</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectTab('pipeline')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <Kanban className="h-4 w-4 shrink-0" />
                <span>Pipeline Board</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('tabel-prospek')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'tabel-prospek'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <TableProperties className="h-4 w-4 shrink-0" />
                <span>Tabel Data Prospek</span>
              </button>
            </>
          )}

          {/* ================= 2. KONTROL MEDIATOR ================= */}
          {/* BUG FIX: CMO DAPAT MENGAKSES DAFTAR MEDIATOR, DASHBOARD, DAN FOLLOW UP! */}
          {activeModule === 'kontrol-mediator' && (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard Mediator</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('daftar-mediator')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'daftar-mediator'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Daftar Mediator</span>
              </button>

              {/* Input Mediator (Bisa diakses CMO, KAPOS, ADM, KAOPS, KACAB, SA) */}
              <button
                type="button"
                onClick={() => onSelectTab('registrasi-mediator')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'registrasi-mediator'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Input Mediator Baru</span>
              </button>

              {/* Validasi KD MED (Hanya Admin / Kaops / Kacab / SA) */}
              {['SUPER_ADMIN', 'KACAB', 'KAOPS', 'ADM'].includes(role) && (
                <button
                  type="button"
                  onClick={() => onSelectTab('validasi-kd-med')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                    activeTab === 'validasi-kd-med'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                  }`}
                >
                  <CheckSquare className="h-4 w-4 shrink-0" />
                  <span>Validasi KD MED</span>
                </button>
              )}

              {/* Follow Up (CMO, KAPOS, KACAB, SA) */}
              <button
                type="button"
                onClick={() => onSelectTab('follow-up')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'follow-up'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <PhoneCall className="h-4 w-4 shrink-0" />
                <span>Follow Up Mediator</span>
              </button>
            </>
          )}

          {/* ================= 3. EX-CUSTOMER ================= */}
          {/* BUG FIX: CMO DAPAT MENGAKSES DATA EX-CUSTOMER & FOLLOW UP! */}
          {activeModule === 'ex-customer' && (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('ex-customer-list')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'ex-customer-list'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                <span>Data BPKB Lunas</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('ex-customer-fu')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'ex-customer-fu'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <PhoneCall className="h-4 w-4 shrink-0" />
                <span>Log Follow Up Nasabah</span>
              </button>

              {/* Import BPKB Lunas (Khusus ADM BPKB & Super Admin) */}
              {['SUPER_ADMIN', 'ADM_BPKB', 'ADMIN_BPKB', 'KACAB'].includes(role) && (
                <button
                  type="button"
                  onClick={() => onSelectTab('import-bpkb')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                    activeTab === 'import-bpkb'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                  }`}
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>Import Data BPKB</span>
                </button>
              )}
            </>
          )}

          {/* ================= 4. KONTROL SALES ================= */}
          {activeModule === 'kontrol-sales' && (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('rekapitulasi')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'rekapitulasi'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard Rekapitulasi</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('data-konsumen')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'data-konsumen'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>Data Konsumen Cair</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('ubah-jt')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                  activeTab === 'ubah-jt'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                }`}
              >
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span>Pengajuan Ubah JT</span>
              </button>

              {['SUPER_ADMIN', 'KACAB', 'KAOPS', 'KAPOS', 'ADM', 'ADM_DE'].includes(role) && (
                <button
                  type="button"
                  onClick={() => onSelectTab('input-pencairan')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                    activeTab === 'input-pencairan'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
                  }`}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span>Input Pencairan Baru</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Master & System Settings Section */}
        <div className="pt-4 border-t border-[#202636]/80 space-y-1">
          <div className="px-3 text-[10px] font-bold text-[#717b94] uppercase tracking-wider mb-1.5">
            Master Data &amp; Sistem
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('master-wilayah')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
              activeTab === 'master-wilayah'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
            }`}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Master Wilayah</span>
          </button>

          {['SUPER_ADMIN', 'KACAB', 'RM', 'KAOPS'].includes(role) && (
            <button
              type="button"
              onClick={() => onSelectTab('cabang-posko')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                activeTab === 'cabang-posko'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Cabang &amp; Posko</span>
            </button>
          )}

          {canAccessUserManagement && (
            <button
              type="button"
              onClick={() => onSelectTab('user-control')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                activeTab === 'user-control'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Manajemen User</span>
            </button>
          )}

          {canAccessAudit && (
            <button
              type="button"
              onClick={() => onSelectTab('audit-trail')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                activeTab === 'audit-trail'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
              }`}
            >
              <History className="h-4 w-4 shrink-0" />
              <span>Audit Trail</span>
            </button>
          )}

          {role === 'SUPER_ADMIN' && (
            <button
              type="button"
              onClick={() => onSelectTab('system-health')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                activeTab === 'system-health'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
              }`}
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span>System Health</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
