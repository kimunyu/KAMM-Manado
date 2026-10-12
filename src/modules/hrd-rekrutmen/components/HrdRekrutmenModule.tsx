import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  UserPlus, 
  Share2, 
  FileCheck, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { User } from '../../../types';
import { HrdErrorBoundary } from './HrdErrorBoundary';
import { ApplicantListTable } from './ApplicantListTable';
import { JobVacanciesManager } from './JobVacanciesManager';
import { RekrutmenService } from '../services/rekrutmenService';

interface Props {
  currentUser: User;
}

type SubTab = 'pelamar' | 'lowongan';

export const HrdRekrutmenModule: React.FC<Props> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('pelamar');
  const [newCount, setNewCount] = useState<number>(0);

  // Monitor count of new applicants for notification badge
  useEffect(() => {
    const unsub = RekrutmenService.subscribeApplicants(currentUser, (list) => {
      const baru = list.filter(a => a.status === 'BARU').length;
      setNewCount(baru);
    });
    return () => unsub();
  }, [currentUser]);

  return (
    <HrdErrorBoundary>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e121d] border border-[#1d2235] p-5 sm:p-6 rounded-2xl shadow-lg">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Manajemen Rekrutmen & Karir KAMM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Rekrutmen & Pelamar Kerja
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pengelolaan lowongan dinamis per wilayah cabang serta monitoring berkas calon pelamar eksternal.
            </p>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 bg-[#141828] p-1.5 rounded-xl border border-[#22283f] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('pelamar')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'pelamar'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#1c2238]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Data Pelamar</span>
              {newCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                  {newCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('lowongan')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'lowongan'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#1c2238]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Pengaturan Lowongan</span>
            </button>
          </div>
        </div>

        {/* Content by SubTab */}
        {activeSubTab === 'pelamar' ? (
          <ApplicantListTable currentUser={currentUser} />
        ) : (
          <JobVacanciesManager currentUser={currentUser} />
        )}
      </div>
    </HrdErrorBoundary>
  );
};
