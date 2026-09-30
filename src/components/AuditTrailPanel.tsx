import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { StorageService } from '../services/storage';
import { DataTable, Column } from './DataTable';
import { History, ShieldAlert, Clock, User } from 'lucide-react';

export const AuditTrailPanel: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    setLogs(StorageService.getLogs());
  }, []);

  const columns: Column<ActivityLog>[] = [
    {
      key: 'timestamp',
      header: 'Waktu Aktivitas',
      sortable: true,
      render: (l) => <span className="font-mono text-white text-[11px]">{l.timestamp.replace('T', ' ').substring(0, 19)}</span>
    },
    {
      key: 'username',
      header: 'Pengguna',
      sortable: true,
      render: (l) => <span className="font-semibold text-blue-300">@{l.username}</span>
    },
    {
      key: 'module',
      header: 'Modul',
      sortable: true,
      render: (l) => <span className="px-2 py-0.5 rounded bg-[#161a26] border border-[#232734] font-medium text-white">{l.module}</span>
    },
    {
      key: 'action',
      header: 'Aksi',
      sortable: true,
      render: (l) => <span className="font-mono font-bold text-amber-300">{l.action}</span>
    },
    {
      key: 'details',
      header: 'Detail Aktivitas',
      render: (l) => <span className="text-[#a3adc2]">{l.details}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={logs}
        columns={columns}
        keyExtractor={(l) => l.id}
        title="Audit Trail Log Aktivitas"
        subtitle="Rekaman keamanan seluruh aktivitas transaksi dan perubahan data di KAMM Manado"
        searchPlaceholder="Cari pengguna, modul, atau aksi..."
      />
    </div>
  );
};
