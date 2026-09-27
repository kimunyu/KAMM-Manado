import React from 'react';
import { 
  Plus, 
  Phone, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  ArrowRight,
  ExternalLink,
  Share2
} from 'lucide-react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { User } from '../../../types';

interface PipelineBoardProps {
  records: SalesAcquisition[];
  currentUser: User;
  onSelectRecord: (record: SalesAcquisition) => void;
  onOpenConvertCair: (record: SalesAcquisition) => void;
  onOpenQuickEntry: () => void;
}

interface ColumnConfig {
  status: SalesAcquisitionStatus;
  label: string;
  badgeColor: string;
  borderColor: string;
  headerBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'PROSPEK_BARU',
    label: 'Prospek Baru',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    borderColor: 'border-blue-900/50',
    headerBg: 'bg-blue-950/30'
  },
  {
    status: 'PROSES_SURVEI',
    label: 'Proses Survei',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    borderColor: 'border-amber-900/50',
    headerBg: 'bg-amber-950/30'
  },
  {
    status: 'PENGAJUAN_BERKAS',
    label: 'Pengajuan Berkas',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    borderColor: 'border-purple-900/50',
    headerBg: 'bg-purple-950/30'
  },
  {
    status: 'DISETUJUI',
    label: 'Disetujui',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    borderColor: 'border-indigo-900/50',
    headerBg: 'bg-indigo-950/30'
  },
  {
    status: 'CAIR',
    label: 'Pencairan (CAIR)',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    borderColor: 'border-emerald-900/50',
    headerBg: 'bg-emerald-950/30'
  },
  {
    status: 'DITOLAK',
    label: 'Ditolak / Batal',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
    borderColor: 'border-rose-900/50',
    headerBg: 'bg-rose-950/30'
  }
];

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  records,
  currentUser,
  onSelectRecord,
  onOpenConvertCair,
  onOpenQuickEntry
}) => {
  const isKaposOrAbove = currentUser.role === 'KAPOS' || currentUser.role === 'ADM' || currentUser.role === 'KAOPS' || currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="overflow-x-auto pb-4 pt-1">
      <div className="flex gap-4 min-w-[1280px]">
        {COLUMNS.map((col) => {
          const colRecords = records.filter(r => {
            if (col.status === 'DITOLAK') {
              return r.status === 'DITOLAK' || r.status === 'BATAL';
            }
            return r.status === col.status;
          });

          return (
            <div
              key={col.status}
              className={`flex-1 min-w-[240px] max-w-[320px] rounded-2xl bg-[#10131d] border ${col.borderColor} flex flex-col shadow-lg overflow-hidden`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b border-[#232734] ${col.headerBg} flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white tracking-tight">
                    {col.label}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${col.badgeColor}`}>
                    {colRecords.length}
                  </span>
                </div>
                {col.status === 'PROSPEK_BARU' && (
                  <button
                    type="button"
                    onClick={onOpenQuickEntry}
                    className="p-1 rounded-lg text-blue-400 hover:text-white hover:bg-blue-600/20 transition-colors"
                    title="Tambah Prospek Cepat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Column Cards Container */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[640px]">
                {colRecords.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#5c6479]">
                    Tidak ada prospek
                  </div>
                ) : (
                  colRecords.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectRecord(item)}
                      className="p-3.5 rounded-xl bg-[#161a26] hover:bg-[#1b2030] border border-[#232734] hover:border-[#38425d] transition-all cursor-pointer shadow-sm group space-y-2.5 relative"
                    >
                      {/* Top Row: Name & Lead Source */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors leading-snug line-clamp-1">
                          {item.nama_calon_konsumen}
                        </h4>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#202538] text-blue-300 border border-[#2c344d] shrink-0 font-medium">
                          {item.sumber_lead}
                        </span>
                      </div>

                      {/* Phone & WA */}
                      <div className="flex items-center justify-between text-[11px] text-[#8e96a8]">
                        <span className="font-mono text-emerald-400 font-semibold flex items-center space-x-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{item.no_telepon_clean}</span>
                        </span>
                        <a
                          href={`https://wa.me/62${item.no_telepon_clean.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-blue-400 hover:underline flex items-center space-x-0.5"
                        >
                          <span>WA</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>

                      {/* Reference Indicators */}
                      {item.kd_med && (
                        <div className="text-[10px] text-blue-300 font-mono bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
                          KD MED: {item.kd_med}
                        </div>
                      )}
                      {item.ref_no_psb_lama && (
                        <div className="text-[10px] text-amber-300 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/50">
                          PSB Lama: {item.ref_no_psb_lama}
                        </div>
                      )}
                      {item.no_psb && (
                        <div className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          PSB KAMM: {item.no_psb}
                        </div>
                      )}

                      {/* Bottom Row: AO & Location */}
                      <div className="pt-2 border-t border-[#232734] flex items-center justify-between text-[10px] text-[#8e96a8]">
                        <span className="flex items-center space-x-1 text-purple-300">
                          <UserIcon className="h-3 w-3 shrink-0" />
                          <span>AO: {item.kd_ao || '-'}</span>
                        </span>
                        <span className="text-[#677085]">
                          Posko {item.kd_posko}
                        </span>
                      </div>

                      {/* Direct CAIR Action button if DISETUJUI */}
                      {item.status === 'DISETUJUI' && isKaposOrAbove && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConvertCair(item);
                          }}
                          className="w-full mt-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white shadow-sm flex items-center justify-center space-x-1 transition-all"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Cairkan Sekarang</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
