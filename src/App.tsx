import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseService } from './services/storage';
import { MediatorKontrak, FULog, ExCustomer, ExCustomerFULog, Cabang, Posko, User } from './types';
import { Header } from './components/Header';
import { Sidebar, ActiveTab, ModuleId } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DaftarMediator } from './components/DaftarMediator';
import { RegistrasiMediator } from './components/RegistrasiMediator';
import { ValidasiKdMed } from './components/ValidasiKdMed';
import { FollowUpModule } from './components/FollowUpModule';
import { UserControl } from './components/UserControl';
import { ExCustomerControl } from './components/ExCustomerControl';
import { KontrolSalesModule } from './modules/kontrol-sales';
import { SalesService } from './modules/kontrol-sales/services/salesService';
import { SalesControlRecord } from './modules/kontrol-sales/types';
import { checkHoldDanaSla } from './modules/kontrol-sales/utils/slaUtils';
import { MediatorDetailModal } from './components/MediatorDetailModal';
import { MediatorEditModal } from './components/MediatorEditModal';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserProfileModal } from './components/UserProfileModal';
import { IdleTimeoutManager } from './components/IdleTimeoutManager';

const TAB_TO_MODULE_MAP: Record<ActiveTab, ModuleId> = {
  'kontrol-sales': 'sales',
  'dashboard': 'mediator',
  'daftar-mediator': 'mediator',
  'registrasi': 'mediator',
  'validasi': 'mediator',
  'follow-up': 'mediator',
  'ex-customer': 'ex-customer',
  'user-control': 'master-data',
};

const MODULE_DEFAULT_TAB: Record<ModuleId, ActiveTab> = {
  'sales': 'kontrol-sales',
  'mediator': 'dashboard',
  'ex-customer': 'ex-customer',
  'master-data': 'user-control',
};

function MainApp() {
  const { currentUser, canValidateKdMed, canRegisterMediator, canInputFU, canManageUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (currentUser?.role === 'ADM_DE') return 'kontrol-sales';
    if (currentUser?.role === 'ADM_BPKB' || currentUser?.role === 'ADMIN_BPKB') return 'ex-customer';
    return 'dashboard';
  });

  const [activeModule, setActiveModule] = useState<ModuleId>(() => {
    if (currentUser?.role === 'ADM_DE') return 'sales';
    if (currentUser?.role === 'ADM_BPKB' || currentUser?.role === 'ADMIN_BPKB') return 'ex-customer';
    return 'mediator';
  });

  // Keep activeModule synchronized with activeTab
  useEffect(() => {
    const mapped = TAB_TO_MODULE_MAP[activeTab];
    if (mapped && mapped !== activeModule) {
      setActiveModule(mapped);
    }
  }, [activeTab]);

  const handleSelectModule = (moduleId: ModuleId) => {
    setActiveModule(moduleId);
    if (TAB_TO_MODULE_MAP[activeTab] !== moduleId) {
      setActiveTab(MODULE_DEFAULT_TAB[moduleId]);
    }
  };
  const [mediators, setMediators] = useState<MediatorKontrak[]>([]);
  const [fuLogs, setFuLogs] = useState<FULog[]>([]);
  const [exCustomers, setExCustomers] = useState<ExCustomer[]>([]);
  const [exCustomerLogs, setExCustomerLogs] = useState<ExCustomerFULog[]>([]);
  const [allCabang, setAllCabang] = useState<Cabang[]>([]);
  const [allPosko, setAllPosko] = useState<Posko[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [selectedMedForDetail, setSelectedMedForDetail] = useState<MediatorKontrak | null>(null);
  const [selectedMedForEdit, setSelectedMedForEdit] = useState<MediatorKontrak | null>(null);
  const [preSelectedKdMedForFU, setPreSelectedKdMedForFU] = useState<string | null>(null);
  const [isManualPasswordChangeOpen, setIsManualPasswordChangeOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [salesRecords, setSalesRecords] = useState<SalesControlRecord[]>([]);

  const loadDatabase = () => {
    const meds = DatabaseService.getMediators();
    const logs = DatabaseService.getFULogs();
    const exList = DatabaseService.getExCustomers();
    const exLogs = DatabaseService.getExCustomerFULogs();
    const cabList = DatabaseService.getCabangList();
    const posList = DatabaseService.getPoskoList();
    const uList = DatabaseService.getUsers();

    setMediators(meds);
    setFuLogs(logs);
    setExCustomers(exList);
    setExCustomerLogs(exLogs);
    setAllCabang(cabList);
    setAllPosko(posList);
    setAllUsers(uList);
  };

  useEffect(() => {
    loadDatabase();
    const unsubscribe = DatabaseService.subscribe(() => {
      loadDatabase();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time synchronization for sales records & SLA hold status
  useEffect(() => {
    const unsubscribeSales = SalesService.subscribe(
      currentUser,
      (updated) => {
        setSalesRecords(updated);
      },
      (err) => {
        console.warn('Sync notice sales:', err);
      }
    );
    return () => {
      unsubscribeSales();
    };
  }, [currentUser]);

  // Safeguard tab switching when role changes and user loses access to current tab
  useEffect(() => {
    if (currentUser?.role === 'ADM_DE') {
      setActiveTab('kontrol-sales');
      return;
    }
    if (currentUser?.role === 'ADM_BPKB' || currentUser?.role === 'ADMIN_BPKB') {
      setActiveTab('ex-customer');
      return;
    }
    if (activeTab === 'user-control' && !canManageUsers) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'validasi' && !canValidateKdMed) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'registrasi' && !canRegisterMediator) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'follow-up' && !canInputFU) {
      setActiveTab('dashboard');
    }
  }, [currentUser?.role, canManageUsers, canValidateKdMed, canRegisterMediator, canInputFU, activeTab]);

  const handleSelectMediatorForFU = (kd_med: string) => {
    setPreSelectedKdMedForFU(kd_med);
    setActiveTab('follow-up');
  };

  const handleViewDetail = (med: MediatorKontrak) => {
    setSelectedMedForDetail(med);
  };

  const handleEditMediator = (med: MediatorKontrak) => {
    setSelectedMedForEdit(med);
  };

  const handleDeleteMediator = (kd_med: string) => {
    DatabaseService.deleteMediator(kd_med);
    loadDatabase();
  };

  if (!currentUser) {
    return <LoginModal />;
  }

  // Detect whether active user still has default password or must change password
  const userUsesDefaultPassword = Boolean(
    currentUser.must_change_password || 
    currentUser.password === '1234' || 
    currentUser.password === 'test1234'
  );

  const isNational = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'RM' || currentUser?.role === 'ADM_DE';
  const pendingCount = mediators.filter(m => {
    if (currentUser?.role === 'ADM') {
      if (m.status !== 'BELUM_AKTIF') return false;
    } else if (currentUser?.role === 'KAPOS') {
      if (m.status !== 'PENDING') return false;
    } else {
      if (m.status !== 'BELUM_AKTIF' && m.status !== 'PENDING') return false;
    }

    if (isNational) return true;
    if (currentUser?.kd_posko && m.kd_posko?.trim().toUpperCase() !== currentUser.kd_posko.trim().toUpperCase()) {
      return false;
    }
    if (currentUser?.kd_cabang && m.kd_cabang?.trim().toUpperCase() !== currentUser.kd_cabang.trim().toUpperCase()) {
      return false;
    }
    return true;
  }).length;

  // Calculate count of sales records currently in HOLD DANA SLA status within user scope
  const holdSalesCount = salesRecords.filter(item => {
    if (isNational) {
      // Akses nasional penuh
    } else if (currentUser?.role === 'ADM') {
      if (currentUser.kd_cabang && item.cabang_id !== currentUser.kd_cabang) return false;
      if (currentUser.kd_posko && item.posko_id !== currentUser.kd_posko) return false;
    } else if (currentUser?.role === 'KAPOS') {
      if (currentUser.kd_posko && item.posko_id !== currentUser.kd_posko) return false;
    } else if (currentUser?.role === 'KAOPS' || currentUser?.role === 'KACAB') {
      if (currentUser.kd_cabang && item.cabang_id !== currentUser.kd_cabang) return false;
    }
    return checkHoldDanaSla(item.tgl_cair, item.status).isHoldDana;
  }).length;

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex flex-col font-sans text-[#e0e4eb] selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header 
        onRefresh={loadDatabase} 
        onOpenChangePassword={() => setIsManualPasswordChangeOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        pendingCount={pendingCount}
        holdSalesCount={holdSalesCount}
      />

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row shadow-2xl border-x border-[#1c1f2b]">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          holdSalesCount={holdSalesCount}
          activeModule={activeModule}
          setActiveModule={handleSelectModule}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#0c0e12] min-w-0">
          {activeTab === 'dashboard' && (
            <Dashboard
              mediators={mediators}
              fuLogs={fuLogs}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'daftar-mediator' && (
            <DaftarMediator
              mediators={mediators}
              onSelectMediatorForFU={handleSelectMediatorForFU}
              onViewDetail={handleViewDetail}
              onEditMediator={handleEditMediator}
              onDeleteMediator={handleDeleteMediator}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'registrasi' && (
            <RegistrasiMediator
              onSuccess={loadDatabase}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'validasi' && (
            <ValidasiKdMed
              mediators={mediators}
              onValidationSuccess={loadDatabase}
              onNavigate={setActiveTab}
              onEditMediator={handleEditMediator}
            />
          )}

          {activeTab === 'follow-up' && (
            <FollowUpModule
              mediators={mediators}
              preSelectedKdMed={preSelectedKdMedForFU}
              onFollowUpSuccess={loadDatabase}
            />
          )}

          {activeTab === 'user-control' && (
            <UserControl onRefresh={loadDatabase} />
          )}

          {activeTab === 'ex-customer' && (
            <ExCustomerControl
              currentUser={currentUser}
              allCabang={allCabang}
              allPosko={allPosko}
              allUsers={allUsers}
              allExCustomers={exCustomers}
              allExCustomerLogs={exCustomerLogs}
              onRefresh={loadDatabase}
            />
          )}

          {activeTab === 'kontrol-sales' && (
            <KontrolSalesModule
              currentUser={currentUser}
              allCabang={allCabang}
              allPosko={allPosko}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* Mandatory / Manual Change Password Modal */}
      <ChangePasswordModal
        isOpen={userUsesDefaultPassword || isManualPasswordChangeOpen}
        isForced={userUsesDefaultPassword}
        onClose={() => setIsManualPasswordChangeOpen(false)}
        onSuccess={() => {
          setIsManualPasswordChangeOpen(false);
          loadDatabase();
        }}
      />

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onRefresh={loadDatabase}
      />

      {selectedMedForDetail && (
        <MediatorDetailModal
          mediator={selectedMedForDetail}
          onClose={() => setSelectedMedForDetail(null)}
          onSelectForFU={handleSelectMediatorForFU}
        />
      )}

      {selectedMedForEdit && (
        <MediatorEditModal
          mediator={selectedMedForEdit}
          onClose={() => setSelectedMedForEdit(null)}
          onSuccess={loadDatabase}
        />
      )}

      {/* Auto Session Inactivity Timeout Guard */}
      <IdleTimeoutManager />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
