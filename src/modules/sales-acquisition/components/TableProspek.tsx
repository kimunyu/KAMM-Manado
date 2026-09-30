import React, { useState, useMemo } from 'react';
import { SalesAcquisition, SalesAcquisitionStatus } from '../types';
import { User } from '../../../types';
import { DataTable, Column } from '../../../components/DataTable';
import { 
  Eye, 
  Phone, 
  MessageSquare, 
  ArrowRightLeft, 
  Filter, 
  Bike, 
  Car, 
  FileCheck2,
  Calendar,
  Layers
} from 'lucide-react';

interface TableProspekProps {
  leads: SalesAcquisition[];
  currentUser: User;
  onSelectLead: (lead: SalesAcquisition) => void;
  onOpenReassign: (lead: SalesAcquisition) => void;
}

export const TableProspek: React.FC<TableProspekProps> = ({
  leads,
  currentUser,
  onSelectLead,
  onOpenReassign
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedJaminan, setSelectedJaminan] = useState<string>('ALL');

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (selectedStatus !== 'ALL' && l.status !== selectedStatus) return false;
      if (selectedJaminan !== 'ALL' && l.jenis_jaminan !== selectedJaminan) return false;
      return true;
    });
  }, [leads, selectedStatus, selectedJaminan]);

  const canReassign = ['SUPER_ADMIN', 'KACAB', 'RM', 'KAOPS', 'KAPOS'].includes(currentUser.role);

  const columns: Column<SalesAcquisition>[] = [
    {
      key: 'nama_calon_konsumen',
      header: 'Calon Konsumen',
      sortable: true,
      render: (l) => (
        <div>
          <div className="font-semibold text-white">{l.nama_calon_konsumen}</div>
          <div className="text-[10px] text-[#8e96a8] font-mono">{l.id}</div>
        </div>
      )
    },
    {
      key: 'no_telepon',
      header: 'Kontak HP / WA',
      render: (l) => (
        <div className="flex items-center space-x-1.5">
          <span className="font-mono text-white">{l.no_telepon}</span>
          <a
            href={`https://wa.me/${l.clean_phone.replace(/^0/, '62')}`}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800"
            title="Kirim Pesan WhatsApp"
          >
            <MessageSquare className="h-3 w-3" />
          </a>
        </div>
      )
    },
    {
      key: 'jenis_jaminan',
      header: 'Jaminan',
      sortable: true,
      render: (l) => {
        const icons = {
          R2: <Bike className="h-3.5 w-3.5 text-blue-400" />,
          R4: <Car className="h-3.5 w-3.5 text-purple-400" />,
          SERTIFIKAT: <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
        }[l.jenis_jaminan];

        return (
          <div className="flex items-center space-x-1.5">
            {icons}
            <span className="font-bold text-white font-mono">{l.jenis_jaminan}</span>
          </div>
        );
      }
    },
    {
      key: 'sumber_lead',
      header: 'Sumber Lead',
      sortable: true,
      render: (l) => (
        <div>
          <span className="text-white font-medium">{l.sumber_lead}</span>
          {l.kd_med && (
            <div className="text-[10px] text-blue-400 font-mono">MED: {l.kd_med}</div>
          )}
          {l.ref_no_psb_lama && (
            <div className="text-[10px] text-amber-400 font-mono">PSB: {l.ref_no_psb_lama}</div>
          )}
        </div>
      )
    },
    {
      key: 'kd_ao',
      header: 'AO Ref',
      sortable: true,
      render: (l) => (
        <div>
          <span className="font-mono font-bold text-indigo-300">{l.kd_ao || '-'}</span>
          <div className="text-[10px] text-[#717b94] truncate max-w-[120px]">{l.assigned_user_nama || l.assigned_user_id}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (l) => {
        const badgeColors = {
          PROSPEK_BARU: 'bg-blue-950 text-blue-300 border-blue-800',
          PROSES_SURVEI: 'bg-amber-950 text-amber-300 border-amber-800',
          DISETUJUI: 'bg-indigo-950 text-indigo-300 border-indigo-800',
          CAIR: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          DITOLAK: 'bg-rose-950 text-rose-300 border-rose-800',
          BATAL: 'bg-zinc-800 text-zinc-300 border-zinc-700'
        }[l.status] || 'bg-zinc-800 text-zinc-300';

        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColors}`}>
            {l.status.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      header: 'Tanggal Input',
      sortable: true,
      render: (l) => <span className="font-mono text-[#8e96a8]">{l.created_at.split('T')[0]}</span>
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (l) => (
        <div className="flex items-center justify-end space-x-1.5">
          <button
            type="button"
            onClick={() => onSelectLead(l)}
            className="p-1.5 rounded-lg bg-[#181c28] hover:bg-[#202534] text-white border border-[#2c3345] transition-colors cursor-pointer"
            title="Lihat Detail Prospek"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {canReassign && !['CAIR', 'DITOLAK', 'BATAL'].includes(l.status) && (
            <button
              type="button"
              onClick={() => onOpenReassign(l)}
              className="p-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800 transition-colors cursor-pointer"
              title="Alihkan Petugas Survei (AO)"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[#12151f] border border-[#232734]">
        <div className="flex items-center space-x-1.5 text-xs text-[#8e96a8]">
          <Filter className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-semibold">Filter:</span>
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua Status Pipeline</option>
          <option value="PROSPEK_BARU">PROSPEK BARU</option>
          <option value="PROSES_SURVEI">PROSES SURVEI</option>
          <option value="DISETUJUI">DISETUJUI</option>
          <option value="CAIR">CAIR</option>
          <option value="DITOLAK">DITOLAK</option>
          <option value="BATAL">BATAL</option>
        </select>

        <select
          value={selectedJaminan}
          onChange={(e) => setSelectedJaminan(e.target.value)}
          className="bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua Jenis Jaminan</option>
          <option value="R2">R2 (Motor)</option>
          <option value="R4">R4 (Mobil)</option>
          <option value="SERTIFIKAT">Sertifikat Properti</option>
        </select>

        <div className="ml-auto text-xs text-[#8e96a8]">
          Ditemukan <strong className="text-white">{filteredLeads.length}</strong> data prospek
        </div>
      </div>

      <DataTable
        data={filteredLeads}
        columns={columns}
        keyExtractor={(l) => l.id}
        title="Tabel Database Prospek Sales"
        subtitle="Data calon debitur dan pipeline akuisisi sales KAMM Manado"
        searchPlaceholder="Cari nama, no. HP, atau ID prospek..."
      />
    </div>
  );
};
