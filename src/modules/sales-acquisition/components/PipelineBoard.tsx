import React, { useMemo } from 'react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { User } from '../../../types';
import { 
  Bike, 
  Car, 
  FileCheck2, 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  UserCheck, 
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

interface PipelineBoardProps {
  leads: SalesAcquisition[];
  currentUser: User;
  onSelectLead: (lead: SalesAcquisition) => void;
  onAdvanceStatus: (leadId: string, newStatus: SalesAcquisitionStatus) => void;
  onOpenConvertCair: (lead: SalesAcquisition) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  leads,
  currentUser,
  onSelectLead,
  onAdvanceStatus,
  onOpenConvertCair
}) => {
  const isCmo = currentUser.role === 'CMO';
  const isLeader = ['SUPER_ADMIN', 'KACAB', 'RM', 'KAOPS', 'KAPOS', 'ADM'].includes(currentUser.role);

  const columns: { status: SalesAcquisitionStatus; title: string; color: string; badge: string }[] = [
    {
      status: 'PROSPEK_BARU',
      title: 'Prospek Baru',
      color: 'border-blue-500/40 bg-blue-950/20',
      badge: 'bg-blue-950 text-blue-300 border-blue-800'
    },
    {
      status: 'PROSES_SURVEI',
      title: 'Proses Survei',
      color: 'border-amber-500/40 bg-amber-950/20',
      badge: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    {
      status: 'DISETUJUI',
      title: 'Disetujui',
      color: 'border-indigo-500/40 bg-indigo-950/20',
      badge: 'bg-indigo-950 text-indigo-300 border-indigo-800'
    },
    {
      status: 'CAIR',
      title: 'Cair / Realisasi',
      color: 'border-emerald-500/40 bg-emerald-950/20',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    }
  ];

  // Group leads safely
  const groupedLeads = useMemo(() => {
    const map: Record<string, SalesAcquisition[]> = {
      PROSPEK_BARU: [],
      PROSES_SURVEI: [],
      DISETUJUI: [],
      CAIR: []
    };

    leads.forEach(l => {
      if (map[l.status]) {
        map[l.status].push(l);
      }
    });

    // Safe sorting by updated_at or created_at
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at).getTime() || 0;
        const timeB = new Date(b.updated_at || b.created_at).getTime() || 0;
        return timeB - timeA;
      });
    });

    return map;
  }, [leads]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {columns.map(col => {
        const items = groupedLeads[col.status] || [];

        return (
          <div
            key={col.status}
            className={`rounded-2xl border ${col.color} flex flex-col max-h-[calc(100vh-140px)] shadow-lg overflow-hidden bg-[#10131d]`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-[#232734] bg-[#161a26]/90 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white tracking-tight">{col.title}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${col.badge}`}>
                  {items.length}
                </span>
              </div>
            </div>

            {/* Cards List */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#5c6479]">
                  Tidak ada prospek
                </div>
              ) : (
                items.map(item => {
                  const jaminanIcon = {
                    R2: <Bike className="h-3.5 w-3.5 text-blue-400" />,
                    R4: <Car className="h-3.5 w-3.5 text-purple-400" />,
                    SERTIFIKAT: <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
                  }[item.jenis_jaminan];

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectLead(item)}
                      className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] hover:border-blue-500/60 transition-all cursor-pointer shadow-sm space-y-2.5 group"
                    >
                      {/* Top Row: Jaminan & ID */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          {jaminanIcon}
                          <span className="font-mono font-bold text-[11px] text-white">
                            {item.jenis_jaminan}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#717b94]">
                          {item.created_at.split('T')[0]}
                        </span>
                      </div>

                      {/* Consumer Name */}
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                          {item.nama_calon_konsumen}
                        </h4>
                        <div className="text-[11px] text-[#8e96a8] font-mono mt-0.5 flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-[#5c6479]" />
                          <span>{item.no_telepon}</span>
                        </div>
                      </div>

                      {/* Lead source & AO */}
                      <div className="text-[10px] text-[#8e96a8] pt-1.5 border-t border-[#202534] flex items-center justify-between">
                        <span className="truncate max-w-[110px]">
                          AO: <strong className="text-indigo-300 font-mono">{item.kd_ao || '-'}</strong>
                        </span>
                        <span className="font-mono text-blue-400">
                          {item.sumber_lead}
                        </span>
                      </div>

                      {/* Pipeline Quick Transition Button */}
                      <div className="pt-1 flex items-center justify-end">
                        {col.status === 'PROSPEK_BARU' && (isLeader || isCmo) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAdvanceStatus(item.id, 'PROSES_SURVEI');
                            }}
                            className="w-full py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                          >
                            <span>Survei Sekarang</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}

                        {col.status === 'PROSES_SURVEI' && (isLeader || isCmo) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAdvanceStatus(item.id, 'DISETUJUI');
                            }}
                            className="w-full py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors"
                          >
                            <span>Setujui Prospek</span>
                            <CheckCircle2 className="h-3 w-3" />
                          </button>
                        )}

                        {col.status === 'DISETUJUI' && isLeader && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenConvertCair(item);
                            }}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1 transition-colors shadow-md"
                          >
                            <span>Cairkan Kredit</span>
                            <CheckCircle2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
