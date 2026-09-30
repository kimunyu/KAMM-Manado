import React, { useState, useMemo } from 'react';
import { MediatorKontrak, Posko, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { DataTable, Column } from './DataTable';
import { MediatorDetailModal } from './MediatorDetailModal';
import { MediatorEditModal } from './MediatorEditModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

import { 
  Users, 
  Phone, 
  Eye, 
  Edit2, 
  Trash2, 
  MessageSquare, 
  Filter, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  FileEdit,
  ExternalLink
} from 'lucide-react';

interface DaftarMediatorProps {
  mediators: MediatorKontrak[];
  poskoList?: Posko[];
  currentUser?: User;
  onUpdateMediator?: (updated: MediatorKontrak) => void;
  onDeleteMediator?: (id: string) => void;
  onSelectMediatorForFU?: (kd_med: string) => void;
  onViewDetail?: (med: MediatorKontrak) => void;
  onEditMediator?: (med: MediatorKontrak) => void;
  onNavigate?: (tab: string) => void;
}


export const DaftarMediator: React.FC<DaftarMediatorProps> = ({
  mediators,
  poskoList = [],
  currentUser: propUser,
  onUpdateMediator,
  onDeleteMediator,
  onSelectMediatorForFU,
  onViewDetail,
  onEditMediator,
  onNavigate
}) => {
  const { currentUser: authUser } = useAuth();
  const currentUser = propUser || authUser || ({ role: 'CMO', id: '', nama: '' } as User);

  const [selectedPosko, setSelectedPosko] = useState<string>('ALL');

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [detailMediator, setDetailMediator] = useState<MediatorKontrak | null>(null);
  const [editMediator, setEditMediator] = useState<MediatorKontrak | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediatorKontrak | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canEdit = ['SUPER_ADMIN', 'KACAB', 'KAOPS', 'ADM'].includes(currentUser.role);
  const canDelete = ['SUPER_ADMIN', 'KACAB'].includes(currentUser.role);

  const filteredMediators = useMemo(() => {
    return mediators.filter(m => {
      if (selectedPosko !== 'ALL' && m.kd_posko !== selectedPosko) return false;
      if (selectedStatus !== 'ALL' && m.status !== selectedStatus) return false;
      return true;
    });
  }, [mediators, selectedPosko, selectedStatus]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const columns: Column<MediatorKontrak>[] = [
    {
      key: 'kd_med',
      header: 'KD MED',
      sortable: true,
      render: (m) => (
        <div className="flex items-center space-x-1.5 font-mono">
          <span className="font-bold text-white">{m.kd_med}</span>
          <button
            onClick={() => handleCopy(m.kd_med, `kd_${m.kd_med}`)}
            className="text-[#5c6479] hover:text-blue-400 p-0.5"
            title="Salin Kode"
          >
            {copiedId === `kd_${m.kd_med}` ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      )
    },
    {
      key: 'nama_mediator',
      header: 'Nama Mediator',
      sortable: true,
      render: (m) => (
        <div>
          <div className="font-semibold text-white">{m.nama_mediator}</div>
          <div className="text-[11px] text-[#8e96a8] truncate max-w-[180px]">{m.alamat || '-'}</div>
        </div>
      )
    },
    {
      key: 'no_tlpn',
      header: 'No. Telepon / WA',
      render: (m) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-white">{m.no_tlpn}</span>
          <a
            href={`https://wa.me/${m.no_tlpn.replace(/^0/, '62')}`}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800"
            title="Kirim Pesan WhatsApp"
          >
            <MessageSquare className="h-3 w-3" />
          </a>
        </div>
      )
    },
    {
      key: 'kd_posko',
      header: 'Posko',
      sortable: true,
      render: (m) => (
        <span className="font-mono px-2 py-0.5 rounded bg-[#161b28] border border-[#232a3c] text-white">
          {m.kd_posko}
        </span>
      )
    },
    {
      key: 'kd_ao',
      header: 'AO Pembina',
      sortable: true,
      render: (m) => <span className="font-mono text-[#a3adc2]">{m.kd_ao || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (m) => {
        const badgeColors = {
          AKTIF: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          PENDING: 'bg-amber-950/80 text-amber-300 border-amber-800',
          BELUM_AKTIF: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
          DITOLAK: 'bg-rose-950/80 text-rose-300 border-rose-800',
          NONAKTIF: 'bg-zinc-900 text-zinc-400 border-zinc-700'
        }[m.status] || 'bg-zinc-800 text-zinc-300 border-zinc-700';

        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColors}`}>
            {m.status}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end space-x-1">
          <button
            type="button"
            onClick={() => setDetailMediator(m)}
            className="p-1.5 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#1f2535] transition-colors cursor-pointer"
            title="Lihat Detail"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => setEditMediator(m)}
              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 transition-colors cursor-pointer"
              title="Edit Data"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => setDeleteTarget(m)}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Hapus Data"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[#12151f] border border-[#232734]">
        <div className="flex items-center space-x-1.5 text-xs text-[#8e96a8]">
          <Filter className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-semibold">Filter:</span>
        </div>

        {/* Filter Posko */}
        <select
          value={selectedPosko}
          onChange={(e) => setSelectedPosko(e.target.value)}
          className="bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua Posko</option>
          {poskoList.map(p => (
            <option key={p.kd_posko} value={p.kd_posko}>Posko {p.kd_posko} ({p.nama_posko})</option>
          ))}
        </select>

        {/* Filter Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="AKTIF">AKTIF</option>
          <option value="PENDING">PENDING</option>
          <option value="BELUM_AKTIF">BELUM_AKTIF</option>
          <option value="DITOLAK">DITOLAK</option>
          <option value="NONAKTIF">NONAKTIF</option>
        </select>

        <div className="ml-auto text-xs text-[#8e96a8]">
          Ditemukan <strong className="text-white">{filteredMediators.length}</strong> mediator
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredMediators}
        columns={columns}
        keyExtractor={(med, idx) => med.firestore_id || med.temp_id || `${med.kd_med}_${idx}`}
        title="Daftar Master Data Mediator"
        subtitle="Data mediator kontrak KAMM Manado dan jaringan mitra lapangan"
        searchPlaceholder="Cari nama, KD MED, atau nomor telepon..."
      />

      {/* Modals */}
      <MediatorDetailModal
        isOpen={Boolean(detailMediator)}
        onClose={() => setDetailMediator(null)}
        mediator={detailMediator}
      />

      <MediatorEditModal
        isOpen={Boolean(editMediator)}
        onClose={() => setEditMediator(null)}
        mediator={editMediator}
        poskoList={poskoList}
        onSave={onUpdateMediator}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteMediator(deleteTarget.firestore_id || deleteTarget.kd_med);
            setDeleteTarget(null);
          }
        }}
        title="Konfirmasi Hapus Mediator"
        message={`Apakah Anda yakin ingin menghapus mediator "${deleteTarget?.nama_mediator}" (${deleteTarget?.kd_med})? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
};
