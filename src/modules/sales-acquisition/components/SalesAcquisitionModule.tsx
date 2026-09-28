import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Table, 
  UserPlus, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Users, 
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  FileCheck
} from 'lucide-react';
import { User, Cabang, Posko, MediatorKontrak, ExCustomer } from '../../../types';
import { SalesAcquisition } from '../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';
import { PipelineBoard } from './PipelineBoard';
import { TableProspek } from './TableProspek';
import { QuickEntryModal } from './QuickEntryModal';
import { ProspekDetailModal } from './ProspekDetailModal';
import { ConvertCairModal } from './ConvertCairModal';
import { ReassignModal } from './ReassignModal';
import { TolakBatalModal } from './TolakBatalModal';

interface SalesAcquisitionModuleProps {
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  allUsers: User[];
  allMediators: MediatorKontrak[];
  allExCustomers: ExCustomer[];
}

type ViewMode = 'board' | 'table';

export const SalesAcquisitionModule: React.FC<SalesAcquisitionModuleProps> = ({
  currentUser,
  allCabang,
  allPosko,
  allUsers,
  allMediators,
  allExCustomers
}) => {
  const [records, setRecords] = useState<SalesAcquisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Modals state
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<SalesAcquisition | null>(null);
  const [selectedRecordForCair, setSelectedRecordForCair] = useState<SalesAcquisition | null>(null);
  const [selectedRecordForReassign, setSelectedRecordForReassign] = useState<SalesAcquisition | null>(null);
  const [tolakBatalState, setTolakBatalState] = useState<{
    isOpen: boolean;
    record: SalesAcquisition | null;
    targetStatus: 'DITOLAK' | 'BATAL';
  }>({
    isOpen: false,
    record: null,
    targetStatus: 'DITOLAK'
  });

  // Role permissions
  const isCmo = currentUser.role === 'CMO';
  const isKapos = currentUser.role === 'KAPOS';
  const isAdm = currentUser.role === 'ADM';
  const isKaops = currentUser.role === 'KAOPS';
  const isKacab = currentUser.role === 'KACAB';
  const isRm = currentUser.role === 'RM';
  const isAdmDe = currentUser.role === 'ADM_DE';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const canCreateLead = isCmo || isKapos || isAdm || isKaops || isSuperAdmin;

  // Real-time synchronization
  const loadRecords = () => {
    setIsLoading(true);
    const data = SalesAcquisitionService.getRecords(currentUser);
    setRecords(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRecords();
    const unsubscribe = SalesAcquisitionService.subscribe(
      currentUser,
      (updated) => {
        setRecords(updated);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[SalesAcquisition] Error syncing:', err);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Metrics calculation
  const metrics = useMemo(() => {
    return SalesAcquisitionService.getMetrics(records);
  }, [records]);

  // Handler for delete
  const handleDeleteRecord = async (leadId: string) => {
    const res = await SalesAcquisitionService.deleteLead(leadId, currentUser);
    if (res.success) {
      loadRecords();
      if (selectedRecordForDetail?.id === leadId) {
        setSelectedRecordForDetail(null);
      }
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="bg-[#141721] border border-[#272d3e] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800/60 flex items-center space-x-1">
                <ShieldCheck className="h-3 w-3" />
                <span>PROSPEK SALES</span>
              </span>
              <span className="text-xs text-[#8e96a8]">
                Role: <strong className="text-white font-mono">{currentUser.role}</strong>
                {isSuperAdmin || isRm || isAdmDe ? (
                  <span className="text-blue-300 font-semibold"> • Lingkup: Nasional (Seluruh Cabang)</span>
                ) : (
                  <>
                    {currentUser.kd_cabang && ` • Cabang: ${currentUser.kd_cabang}`}
                    {currentUser.kd_posko && ` • Posko: ${currentUser.kd_posko}`}
                    {currentUser.kd_ao && ` • KD AO: ${currentUser.kd_ao}`}
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
              <span>PIPELINE PROSPEK SALES</span>
              <span className="text-[#8e96a8] font-normal text-lg">•</span>
              <span className="text-blue-400 font-bold text-lg">KAMM Manado</span>
            </h1>
            <p className="text-xs text-[#8e96a8] mt-1 max-w-2xl">
              Pengelolaan siklus prospek sales baru calon nasabah dari input data, survei lapangan, pengajuan berkas, persetujuan hingga konversi pencairan pinjaman (CAIR).
            </p>
          </div>

          {/* Action Buttons & View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {/* View Toggle */}
            <div className="flex items-center p-1 bg-[#10121a] border border-[#272d3e] rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-[#1e2330] text-white shadow-sm border border-[#2e3547]'
                    : 'text-[#8e96a8] hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-blue-400" />
                <span>Kanban Board</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#1e2330] text-white shadow-sm border border-[#2e3547]'
                    : 'text-[#8e96a8] hover:text-white'
                }`}
              >
                <Table className="h-3.5 w-3.5 text-indigo-400" />
                <span>Tabel Data</span>
              </button>
            </div>

            {/* Quick Entry Button */}
            {canCreateLead && (
              <button
                type="button"
                onClick={() => setIsQuickEntryOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Quick Entry Prospek</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="p-3.5 rounded-2xl bg-[#12151f] border border-[#232734] shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e96a8] block">Total Prospek</span>
          <div className="text-xl font-black text-white font-mono">{metrics.totalLeads}</div>
          <span className="text-[10px] text-blue-400">Pipeline Aktif</span>
        </div>

        {/* Prospek Baru */}
        <div className="p-3.5 rounded-2xl bg-[#12151f] border border-[#232734] shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">Prospek Baru</span>
          <div className="text-xl font-black text-blue-300 font-mono">{metrics.prospekBaru}</div>
          <span className="text-[10px] text-[#8e96a8]">Menunggu tindak lanjut</span>
        </div>

        {/* Survei & Berkas */}
        <div className="p-3.5 rounded-2xl bg-[#12151f] border border-[#232734] shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Survei &amp; Berkas</span>
          <div className="text-xl font-black text-amber-300 font-mono">
            {metrics.prosesSurvei + metrics.pengajuanBerkas}
          </div>
          <span className="text-[10px] text-[#8e96a8]">Verifikasi dokumen</span>
        </div>

        {/* Disetujui */}
        <div className="p-3.5 rounded-2xl bg-[#12151f] border border-[#232734] shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Disetujui</span>
          <div className="text-xl font-black text-indigo-300 font-mono">{metrics.disetujui}</div>
          <span className="text-[10px] text-indigo-400">Siap pencairan</span>
        </div>

        {/* Cair */}
        <div className="p-3.5 rounded-2xl bg-[#12151f] border border-emerald-900/60 shadow-sm space-y-1 bg-gradient-to-b from-emerald-950/20 to-transparent">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Realisasi CAIR</span>
          <div className="text-xl font-black text-emerald-400 font-mono">{metrics.cair}</div>
          <span className="text-[10px] text-emerald-300 font-semibold">{metrics.conversionRate.toFixed(1)}% Konversi</span>
        </div>

        {/* Tolak / Batal */}
        <div className="p-3.5 rounded-2xl bg-[#12151f] border border-[#232734] shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Tolak / Batal</span>
          <div className="text-xl font-black text-rose-400 font-mono">
            {metrics.ditolak + metrics.batal}
          </div>
          <span className="text-[10px] text-[#8e96a8]">Tidak memenuhi syarat</span>
        </div>
      </div>

      {/* Main View Area */}
      <div>
        {viewMode === 'board' ? (
          <PipelineBoard
            records={records}
            currentUser={currentUser}
            onSelectRecord={(rec) => setSelectedRecordForDetail(rec)}
            onOpenConvertCair={(rec) => setSelectedRecordForCair(rec)}
            onOpenQuickEntry={() => setIsQuickEntryOpen(true)}
          />
        ) : (
          <TableProspek
            records={records}
            currentUser={currentUser}
            allCabang={allCabang}
            allPosko={allPosko}
            onSelectRecord={(rec) => setSelectedRecordForDetail(rec)}
            onOpenConvertCair={(rec) => setSelectedRecordForCair(rec)}
            onOpenReassign={(rec) => setSelectedRecordForReassign(rec)}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </div>

      {/* MODALS */}
      {/* 1. Quick Entry Modal */}
      {isQuickEntryOpen && (
        <QuickEntryModal
          isOpen={isQuickEntryOpen}
          onClose={() => setIsQuickEntryOpen(false)}
          currentUser={currentUser}
          allCabang={allCabang}
          allPosko={allPosko}
          allUsers={allUsers}
          allMediators={allMediators}
          allExCustomers={allExCustomers}
          onSuccess={loadRecords}
        />
      )}

      {/* 2. Prospek Detail & History Modal */}
      {selectedRecordForDetail && (
        <ProspekDetailModal
          isOpen={!!selectedRecordForDetail}
          onClose={() => setSelectedRecordForDetail(null)}
          record={selectedRecordForDetail}
          currentUser={currentUser}
          allCabang={allCabang}
          allPosko={allPosko}
          onOpenConvertCair={(rec) => {
            setSelectedRecordForDetail(null);
            setSelectedRecordForCair(rec);
          }}
          onOpenReassign={(rec) => {
            setSelectedRecordForDetail(null);
            setSelectedRecordForReassign(rec);
          }}
          onOpenTolakBatal={(rec, st) => {
            setSelectedRecordForDetail(null);
            setTolakBatalState({
              isOpen: true,
              record: rec,
              targetStatus: st
            });
          }}
          onSuccess={loadRecords}
        />
      )}

      {/* 3. Convert CAIR Modal */}
      {selectedRecordForCair && (
        <ConvertCairModal
          isOpen={!!selectedRecordForCair}
          onClose={() => setSelectedRecordForCair(null)}
          record={selectedRecordForCair}
          currentUser={currentUser}
          onSuccess={loadRecords}
        />
      )}

      {/* 4. Reassign Modal */}
      {selectedRecordForReassign && (
        <ReassignModal
          isOpen={!!selectedRecordForReassign}
          onClose={() => setSelectedRecordForReassign(null)}
          record={selectedRecordForReassign}
          currentUser={currentUser}
          allUsers={allUsers}
          allCabang={allCabang}
          allPosko={allPosko}
          onSuccess={loadRecords}
        />
      )}

      {/* 5. Tolak / Batal Modal */}
      {tolakBatalState.isOpen && tolakBatalState.record && (
        <TolakBatalModal
          isOpen={tolakBatalState.isOpen}
          onClose={() => setTolakBatalState({ isOpen: false, record: null, targetStatus: 'DITOLAK' })}
          record={tolakBatalState.record}
          targetStatus={tolakBatalState.targetStatus}
          currentUser={currentUser}
          onSuccess={loadRecords}
        />
      )}
    </div>
  );
};
