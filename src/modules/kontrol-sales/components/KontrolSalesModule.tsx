import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  ShieldCheck, 
  Building2,
  CalendarClock
} from 'lucide-react';
import { User, Cabang, Posko } from '../../../types';
import { SalesControlRecord } from '../types';
import { SalesService } from '../services/salesService';
import { isUbahJt } from '../utils/slaUtils';
import { DashboardRekapitulasi } from './DashboardRekapitulasi';
import { TableDataKonsumen } from './TableDataKonsumen';
import { TableDataUbahJt } from './TableDataUbahJt';
import { FormInputPencairan } from './FormInputPencairan';
import { ModalValidasiAdmDe } from './ModalValidasiAdmDe';
import { ModalCopyWaCabang } from './ModalCopyWaCabang';

interface KontrolSalesModuleProps {
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
}

type SubTab = 'dashboard' | 'table' | 'ubah_jt' | 'input';

export const KontrolSalesModule: React.FC<KontrolSalesModuleProps> = ({
  currentUser,
  allCabang,
  allPosko,
}) => {
  const isAdmDe = currentUser.role === 'ADM_DE';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const canAccessUbahJt = isSuperAdmin || isAdmDe;
  // Poin 3: ADM_DE juga diizinkan mengakses dan menginput pencairan
  const canInput = currentUser.role === 'ADM' || currentUser.role === 'KAOPS' || isAdmDe || isSuperAdmin;

  // Active SubTab
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(
    isAdmDe ? 'table' : 'dashboard'
  );

  useEffect(() => {
    if (activeSubTab === 'ubah_jt' && !canAccessUbahJt) {
      setActiveSubTab('table');
    }
  }, [activeSubTab, canAccessUbahJt]);

  // Real-time Records State
  const [records, setRecords] = useState<SalesControlRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterOnlyHoldDana, setFilterOnlyHoldDana] = useState<boolean>(false);

  // Modals state
  const [validasiRecord, setValidasiRecord] = useState<SalesControlRecord | null>(null);
  const [copyWaState, setCopyWaState] = useState<{
    isOpen: boolean;
    kdCabang: string;
    namaCabang: string;
  }>({
    isOpen: false,
    kdCabang: '',
    namaCabang: '',
  });

  const handleNavigateToHoldDana = () => {
    setFilterOnlyHoldDana(true);
    setActiveSubTab('table');
  };

  // Subscribe to real-time sales control records with role filter
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = SalesService.subscribe(
      currentUser,
      (updated) => {
        setRecords(updated);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Sync notice:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Hitung jumlah data Ubah JT (ACCEPT + beda hari)
  const ubahJtCount = useMemo(() => {
    return records.filter(r => {
      if (r.status !== 'ACCEPT') return false;
      return r.is_ubah_jt !== undefined ? r.is_ubah_jt : isUbahJt(r.tgl_cair, r.tgl_jt);
    }).length;
  }, [records]);

  const handleOpenValidasi = (rec: SalesControlRecord) => {
    setValidasiRecord(rec);
  };

  const handleOpenCopyWa = (kdCabang: string, namaCabang: string) => {
    setCopyWaState({
      isOpen: true,
      kdCabang,
      namaCabang,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Modul Terisolasi</span>
              </span>
              <span className="text-xs text-[#8e96a8]">
                Role Anda: <strong className="text-white font-mono">{currentUser.role}</strong>
                {currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADM_DE' || currentUser.role === 'RM' ? (
                  <span className="text-purple-300 font-semibold"> • Lingkup: Nasional (Seluruh Cabang &amp; Posko)</span>
                ) : (
                  <>
                    {currentUser.kd_cabang && ` • Cabang: ${currentUser.kd_cabang}`}
                    {currentUser.kd_posko && ` • Posko: ${currentUser.kd_posko}`}
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
              <span>KONTROL SALES</span>
              <span className="text-[#8e96a8] font-normal text-lg">•</span>
              <span className="text-purple-400 font-bold text-lg">Monitoring Pencairan Konsumen</span>
            </h1>
            <p className="text-xs text-[#8e96a8] mt-1 max-w-2xl">
              Pusat rekonsiliasi data pencairan nasabah baru, verifikasi berkas oleh ADM Data Entry (ADM_DE), dan deteksi dini SLA Hold Dana.
            </p>
          </div>

          {/* SubTab Navigation Pills */}
          <div className="flex items-center p-1.5 bg-[#10121a] border border-[#272d3e] rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === 'dashboard'
                  ? 'bg-[#1e2330] text-white shadow-sm border border-[#2e3547]'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#181a24]'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-purple-400" />
              <span>Dashboard Rekap</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('table');
                setFilterOnlyHoldDana(false);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === 'table'
                  ? 'bg-[#1e2330] text-white shadow-sm border border-[#2e3547]'
                  : 'text-[#8e96a8] hover:text-white hover:bg-[#181a24]'
              }`}
            >
              <Users className="h-4 w-4 text-blue-400" />
              <span>Data Konsumen</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 font-mono">
                {records.length}
              </span>
            </button>

            {canAccessUbahJt && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('ubah_jt');
                  setFilterOnlyHoldDana(false);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeSubTab === 'ubah_jt'
                    ? 'bg-[#1e2330] text-amber-300 shadow-sm border border-amber-800/60'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#181a24]'
                }`}
              >
                <CalendarClock className="h-4 w-4 text-amber-400" />
                <span>Data Ubah JT</span>
                {ubahJtCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 font-mono border border-amber-800/60">
                    {ubahJtCount}
                  </span>
                )}
              </button>
            )}

            {canInput && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('input');
                  setFilterOnlyHoldDana(false);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeSubTab === 'input'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#8e96a8] hover:text-white hover:bg-[#181a24]'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Input Pencairan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div>
        {activeSubTab === 'dashboard' && (
          <DashboardRekapitulasi
            records={records}
            allCabang={allCabang}
            allPosko={allPosko}
            currentUser={currentUser}
            onOpenCopyWaModal={handleOpenCopyWa}
            onNavigateToHoldDana={handleNavigateToHoldDana}
          />
        )}

        {activeSubTab === 'table' && (
          <TableDataKonsumen
            records={records}
            allCabang={allCabang}
            allPosko={allPosko}
            currentUser={currentUser}
            initialOnlyHoldDana={filterOnlyHoldDana}
            onOpenValidasiModal={handleOpenValidasi}
            onOpenCopyWaModal={handleOpenCopyWa}
          />
        )}

        {activeSubTab === 'ubah_jt' && canAccessUbahJt && (
          <TableDataUbahJt
            records={records}
            allCabang={allCabang}
            allPosko={allPosko}
            currentUser={currentUser}
          />
        )}

        {activeSubTab === 'input' && canInput && (
          <FormInputPencairan
            currentUser={currentUser}
            allCabang={allCabang}
            allPosko={allPosko}
            onNavigateToTable={() => setActiveSubTab('table')}
          />
        )}
      </div>

      {/* Modal Validasi Khusus ADM_DE & Super Admin (Poin 1: Koreksi TGL CAIR) */}
      {validasiRecord && (
        <ModalValidasiAdmDe
          isOpen={!!validasiRecord}
          onClose={() => setValidasiRecord(null)}
          record={validasiRecord}
          currentUser={currentUser}
        />
      )}

      {/* Poin 7: Modal Copy WA Laporan Agregasi Per-Cabang */}
      {copyWaState.isOpen && (
        <ModalCopyWaCabang
          isOpen={copyWaState.isOpen}
          onClose={() => setCopyWaState(prev => ({ ...prev, isOpen: false }))}
          kdCabang={copyWaState.kdCabang}
          namaCabang={copyWaState.namaCabang}
          records={records.filter(r => 
            r.cabang_id === copyWaState.kdCabang || (r as any).kd_cabang === copyWaState.kdCabang
          )}
          allPosko={allPosko}
        />
      )}
    </div>
  );
};
