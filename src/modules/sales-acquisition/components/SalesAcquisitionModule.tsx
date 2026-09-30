import React, { useState } from 'react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { User, Cabang, Posko, MediatorKontrak, ExCustomer } from '../../../types';
import { SalesAcquisitionService } from '../services/salesAcquisitionService';
import { PipelineBoard } from './PipelineBoard';
import { TableProspek } from './TableProspek';
import { QuickEntryModal } from './QuickEntryModal';
import { ProspekDetailModal } from './ProspekDetailModal';
import { ReassignModal } from './ReassignModal';
import { ConvertCairModal } from './ConvertCairModal';
import { TolakBatalModal } from './TolakBatalModal';
import { Kanban, TableProperties, Plus } from 'lucide-react';

interface SalesAcquisitionModuleProps {
  leads: SalesAcquisition[];
  currentUser: User;
  allCabang: Cabang[];
  allPosko: Posko[];
  allUsers: User[];
  allMediators: MediatorKontrak[];
  allExCustomers: ExCustomer[];
  onRefresh: () => void;
  activeSubTab: string;
  onSelectSubTab: (tab: string) => void;
  isQuickEntryOpen: boolean;
  onCloseQuickEntry: () => void;
}

export const SalesAcquisitionModule: React.FC<SalesAcquisitionModuleProps> = ({
  leads,
  currentUser,
  allCabang,
  allPosko,
  allUsers,
  allMediators,
  allExCustomers,
  onRefresh,
  activeSubTab,
  onSelectSubTab,
  isQuickEntryOpen,
  onCloseQuickEntry
}) => {
  const [selectedLead, setSelectedLead] = useState<SalesAcquisition | null>(null);
  const [reassignTarget, setReassignTarget] = useState<SalesAcquisition | null>(null);
  const [convertCairTarget, setConvertCairTarget] = useState<SalesAcquisition | null>(null);
  const [tolakBatalTarget, setTolakBatalTarget] = useState<{ record: SalesAcquisition; type: 'DITOLAK' | 'BATAL' } | null>(null);

  const handleAdvanceStatus = async (leadId: string, newStatus: SalesAcquisitionStatus) => {
    await SalesAcquisitionService.updateLeadStatus(leadId, newStatus, currentUser);
    onRefresh();
  };

  const handleUpdateStatus = async (newStatus: SalesAcquisitionStatus, notes?: string): Promise<boolean> => {
    if (!selectedLead) return false;
    const res = await SalesAcquisitionService.updateLeadStatus(selectedLead.id, newStatus, currentUser, notes);
    if (res.success) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      onRefresh();
      return true;
    }
    return false;
  };

  const handleReassign = async (targetUserId: string, targetUserNama: string, newKdAo: string, notes?: string): Promise<boolean> => {
    if (!reassignTarget) return false;
    const res = await SalesAcquisitionService.reassignLead(
      reassignTarget.id,
      targetUserId,
      targetUserNama,
      newKdAo,
      currentUser,
      notes
    );
    if (res.success) {
      onRefresh();
      return true;
    }
    return false;
  };

  const handleConvertCair = async (noPsbBaru: string, plafonCair: number, tglCair: string, notes?: string): Promise<boolean> => {
    if (!convertCairTarget) return false;
    const res = await SalesAcquisitionService.updateLeadStatus(
      convertCairTarget.id,
      'CAIR',
      currentUser,
      notes,
      {
        no_psb_baru: noPsbBaru,
        plafon_disetujui: plafonCair,
        tgl_cair: tglCair
      }
    );
    if (res.success) {
      onRefresh();
      return true;
    }
    return false;
  };

  const handleTolakBatal = async (reason: string): Promise<boolean> => {
    if (!tolakBatalTarget) return false;
    const { record, type } = tolakBatalTarget;
    const res = await SalesAcquisitionService.updateLeadStatus(
      record.id,
      type,
      currentUser,
      reason,
      type === 'DITOLAK' ? { rejection_reason: reason } : { cancellation_reason: reason }
    );
    if (res.success) {
      onRefresh();
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-4">
      {/* Top Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#12151f] border border-[#232734]">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Modul Prospek Sales</h2>
          <p className="text-xs text-[#8e96a8]">Pipeline akuisisi calon konsumen &amp; monitoring percepatan survei</p>
        </div>

        <div className="flex items-center space-x-2 bg-[#161a26] p-1 rounded-xl border border-[#232734]">
          <button
            type="button"
            onClick={() => onSelectSubTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'pipeline'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#8e96a8] hover:text-white'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Kanban Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectSubTab('tabel-prospek')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'tabel-prospek'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#8e96a8] hover:text-white'
            }`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            <span>Tabel Prospek</span>
          </button>
        </div>
      </div>

      {/* Main View */}
      {activeSubTab === 'pipeline' ? (
        <PipelineBoard
          leads={leads}
          currentUser={currentUser}
          onSelectLead={setSelectedLead}
          onAdvanceStatus={handleAdvanceStatus}
          onOpenConvertCair={setConvertCairTarget}
        />
      ) : (
        <TableProspek
          leads={leads}
          currentUser={currentUser}
          onSelectLead={setSelectedLead}
          onOpenReassign={setReassignTarget}
        />
      )}

      {/* Quick Entry Modal */}
      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={onCloseQuickEntry}
        currentUser={currentUser}
        allCabang={allCabang}
        allPosko={allPosko}
        allUsers={allUsers}
        allMediators={allMediators}
        allExCustomers={allExCustomers}
        onSuccess={onRefresh}
      />

      {/* Detail Modal */}
      <ProspekDetailModal
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        record={selectedLead}
        currentUser={currentUser}
        onUpdateStatus={handleUpdateStatus}
        onOpenReassign={() => {
          if (selectedLead) {
            setReassignTarget(selectedLead);
            setSelectedLead(null);
          }
        }}
        onOpenConvertCair={() => {
          if (selectedLead) {
            setConvertCairTarget(selectedLead);
            setSelectedLead(null);
          }
        }}
        onOpenTolakBatal={(type) => {
          if (selectedLead) {
            setTolakBatalTarget({ record: selectedLead, type });
            setSelectedLead(null);
          }
        }}
        onRecordUpdated={() => {
          onRefresh();
          if (selectedLead) {
            const updated = SalesAcquisitionService.getLeads().find(l => l.id === selectedLead.id);
            if (updated) setSelectedLead(updated);
          }
        }}
      />

      {/* Reassign Modal */}
      {reassignTarget && (
        <ReassignModal
          isOpen={Boolean(reassignTarget)}
          onClose={() => setReassignTarget(null)}
          record={reassignTarget}
          allUsers={allUsers}
          currentUser={currentUser}
          onReassign={handleReassign}
        />
      )}

      {/* Convert Cair Modal */}
      {convertCairTarget && (
        <ConvertCairModal
          isOpen={Boolean(convertCairTarget)}
          onClose={() => setConvertCairTarget(null)}
          record={convertCairTarget}
          currentUser={currentUser}
          onConvertCair={handleConvertCair}
        />
      )}

      {/* Tolak Batal Modal */}
      {tolakBatalTarget && (
        <TolakBatalModal
          isOpen={Boolean(tolakBatalTarget)}
          onClose={() => setTolakBatalTarget(null)}
          record={tolakBatalTarget.record}
          actionType={tolakBatalTarget.type}
          onSubmit={handleTolakBatal}
        />
      )}
    </div>
  );
};
