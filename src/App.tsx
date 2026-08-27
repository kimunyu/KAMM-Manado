import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseService } from './services/storage';
import { MediatorKontrak, FULog } from './types';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DaftarMediator } from './components/DaftarMediator';
import { RegistrasiMediator } from './components/RegistrasiMediator';
import { ValidasiKdMed } from './components/ValidasiKdMed';
import { FollowUpModule } from './components/FollowUpModule';
import { UserControl } from './components/UserControl';
import { MediatorDetailModal } from './components/MediatorDetailModal';
import { MediatorEditModal } from './components/MediatorEditModal';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

function MainApp() {
  const { currentUser, canValidateKdMed, canRegisterMediator, canInputFU, canManageUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mediators, setMediators] = useState<MediatorKontrak[]>([]);
  const [fuLogs, setFuLogs] = useState<FULog[]>([]);
  const [selectedMedForDetail, setSelectedMedForDetail] = useState<MediatorKontrak | null>(null);
  const [selectedMedForEdit, setSelectedMedForEdit] = useState<MediatorKontrak | null>(null);
  const [preSelectedKdMedForFU, setPreSelectedKdMedForFU] = useState<string | null>(null);
  const [isManualPasswordChangeOpen, setIsManualPasswordChangeOpen] = useState(false);

  const loadDatabase = () => {
    const meds = DatabaseService.getMediators();
    const logs = DatabaseService.getFULogs();
    setMediators(meds);
    setFuLogs(logs);
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

  // Safeguard tab switching when role changes and user loses access to current tab
  useEffect(() => {
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

  const pendingCount = mediators.filter(m => m.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex flex-col font-sans text-[#e0e4eb] selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header 
        onRefresh={loadDatabase} 
        onOpenChangePassword={() => setIsManualPasswordChangeOpen(true)} 
      />

      {/* Main Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row shadow-2xl border-x border-[#1c1f2b]">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
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
        </main>
      </div>

      {/* MODALS */}
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isManualPasswordChangeOpen}
        onClose={() => setIsManualPasswordChangeOpen(false)}
        onSuccess={() => {
          setIsManualPasswordChangeOpen(false);
          loadDatabase();
        }}
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
