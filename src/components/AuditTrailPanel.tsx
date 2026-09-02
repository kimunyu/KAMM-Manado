import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog, AuditActionCategory, UserRole } from '../types';
import { AuditService } from '../services/auditService';
import { formatDateWita, formatDateTimeWita, formatRelativeTimeWita } from '../utils/formatters';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  User, 
  Activity, 
  Database, 
  Key, 
  Users, 
  Flame, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Tag
} from 'lucide-react';

export const AuditTrailPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsub = AuditService.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsub();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLogs(AuditService.getLogs());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.description && log.description.toLowerCase().includes(q)) ||
        (log.target_id && log.target_id.toLowerCase().includes(q)) ||
        (log.actor_kd_ao && log.actor_kd_ao.toLowerCase().includes(q));

      const matchCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
      const matchRole = roleFilter === 'ALL' || log.actor_role === roleFilter;

      return matchSearch && matchCategory && matchRole;
    });
  }, [logs, searchQuery, categoryFilter, roleFilter]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada log untuk diekspor.');
      return;
    }

    const headers = ['Waktu (WITA)', 'Actor', 'Role', 'Kode AO', 'Kategori', 'Aksi', 'Deskripsi', 'Target ID'];
    const rows = filteredLogs.map((l) => [
      formatDateTimeWita(l.timestamp),
      `"${l.actor_name.replace(/"/g, '""')}"`,
      l.actor_role,
      l.actor_kd_ao || '-',
      l.category,
      l.action,
      `"${l.description.replace(/"/g, '""')}"`,
      l.target_id || '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AUDIT_TRAIL_KAMM_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadge = (cat: AuditActionCategory) => {
    switch (cat) {
      case 'USER_MANAGEMENT':
        return { label: 'User & Akun', bg: 'bg-purple-950/60 text-purple-300 border-purple-800/60', icon: Users };
      case 'AUTH':
        return { label: 'Autentikasi', bg: 'bg-amber-950/60 text-amber-300 border-amber-800/60', icon: Key };
      case 'MEDIATOR':
        return { label: 'Mediator', bg: 'bg-blue-950/60 text-blue-300 border-blue-800/60', icon: ShieldCheck };
      case 'FOLLOW_UP':
        return { label: 'Follow Up', bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60', icon: Activity };
      case 'EX_CUSTOMER':
        return { label: 'Ex-Customer', bg: 'bg-orange-950/60 text-orange-300 border-orange-800/60', icon: Flame };
      case 'MASTER_DATA':
        return { label: 'Master Data', bg: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60', icon: Database };
      case 'SYSTEM':
      default:
        return { label: 'Sistem', bg: 'bg-slate-800 text-slate-300 border-slate-700', icon: FileText };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metric Cards */}
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1f2330]">
          <div>
            <h2 className="text-lg font-bold text-[#f1f3f7] flex items-center space-x-2.5">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <span>Audit Trail & Activity Log Sistem</span>
            </h2>
            <p className="text-xs text-[#8e96a8] mt-1">
              Pencatatan real-time seluruh aktivitas penting pengguna, perubahan hak akses, peninjauan berkas, hingga mutasi data.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#1c202d] hover:bg-[#252b3d] text-xs font-semibold text-[#c2c7d0] hover:text-white border border-[#282e42] transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 text-xs font-semibold text-indigo-200 hover:text-white border border-indigo-700/60 transition-colors cursor-pointer"
              title="Ekspor data audit trail ke CSV"
            >
              <Download className="h-3.5 w-3.5 text-indigo-300" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-[#181a24] p-3 rounded-xl border border-[#232734]">
            <span className="text-[11px] font-medium text-[#8e96a8]">Total Entri Log</span>
            <div className="text-xl font-bold text-[#f1f3f7] mt-0.5">{logs.length}</div>
          </div>
          <div className="bg-[#181a24] p-3 rounded-xl border border-[#232734]">
            <span className="text-[11px] font-medium text-[#8e96a8]">Perubahan User</span>
            <div className="text-xl font-bold text-purple-400 mt-0.5">
              {logs.filter(l => l.category === 'USER_MANAGEMENT').length}
            </div>
          </div>
          <div className="bg-[#181a24] p-3 rounded-xl border border-[#232734]">
            <span className="text-[11px] font-medium text-[#8e96a8]">Aksi Mediator & FU</span>
            <div className="text-xl font-bold text-blue-400 mt-0.5">
              {logs.filter(l => l.category === 'MEDIATOR' || l.category === 'FOLLOW_UP').length}
            </div>
          </div>
          <div className="bg-[#181a24] p-3 rounded-xl border border-[#232734]">
            <span className="text-[11px] font-medium text-[#8e96a8]">Aksi Ex-Customer</span>
            <div className="text-xl font-bold text-orange-400 mt-0.5">
              {logs.filter(l => l.category === 'EX_CUSTOMER').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input
            type="text"
            placeholder="Cari aktor, aksi, target ID, deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#181a24] border border-[#282e42] rounded-xl text-xs text-[#f1f3f7] placeholder-[#6b7280] focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-[#181a24] border border-[#282e42] rounded-xl px-2.5 py-1.5 shrink-0">
            <Tag className="h-3.5 w-3.5 text-[#8e96a8]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-[#c2c7d0] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="bg-[#181a24]">Semua Kategori</option>
              <option value="USER_MANAGEMENT" className="bg-[#181a24]">User & Akun</option>
              <option value="AUTH" className="bg-[#181a24]">Autentikasi</option>
              <option value="MEDIATOR" className="bg-[#181a24]">Mediator</option>
              <option value="FOLLOW_UP" className="bg-[#181a24]">Follow Up</option>
              <option value="EX_CUSTOMER" className="bg-[#181a24]">Ex-Customer</option>
              <option value="MASTER_DATA" className="bg-[#181a24]">Master Data</option>
              <option value="SYSTEM" className="bg-[#181a24]">Sistem</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-1 bg-[#181a24] border border-[#282e42] rounded-xl px-2.5 py-1.5 shrink-0">
            <User className="h-3.5 w-3.5 text-[#8e96a8]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs text-[#c2c7d0] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="bg-[#181a24]">Semua Role</option>
              <option value="SUPER_ADMIN" className="bg-[#181a24]">SUPER_ADMIN</option>
              <option value="RM" className="bg-[#181a24]">RM</option>
              <option value="KACAB" className="bg-[#181a24]">KACAB</option>
              <option value="KAOPS" className="bg-[#181a24]">KAOPS</option>
              <option value="KAPOS" className="bg-[#181a24]">KAPOS</option>
              <option value="ADM" className="bg-[#181a24]">ADM</option>
              <option value="CMO" className="bg-[#181a24]">CMO</option>
              <option value="ADMIN_BPKB" className="bg-[#181a24]">ADMIN_BPKB</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl overflow-hidden shadow-lg">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#8e96a8]">
            <Activity className="h-8 w-8 mx-auto text-[#4b5563] mb-2" />
            <p className="text-sm font-medium">Tidak ada riwayat aktivitas yang sesuai filter.</p>
            <p className="text-xs text-[#6b7280] mt-1">Setiap aksi pengguna akan otomatis tercatat di sini secara real-time.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1f2330]">
            {filteredLogs.map((log) => {
              const catBadge = getCategoryBadge(log.category);
              const Icon = catBadge.icon;
              const isExpanded = expandedLogId === log.id;

              return (
                <div 
                  key={log.id} 
                  className="p-4 hover:bg-[#181a24]/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className="p-2 rounded-xl bg-[#1c202d] border border-[#2a3044] text-[#c2c7d0] shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catBadge.bg}`}>
                            {catBadge.label}
                          </span>
                          <span className="text-xs font-bold text-[#f1f3f7]">
                            {log.action}
                          </span>
                          {log.target_id && (
                            <span className="text-[11px] font-mono bg-[#1f2433] text-indigo-300 px-1.5 py-0.5 rounded border border-[#2e374f]">
                              {log.target_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#c2c7d0] leading-relaxed">
                          {log.description}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#8e96a8] mt-2">
                          <span className="font-medium text-[#e0e4eb] flex items-center gap-1">
                            <User className="h-3 w-3 text-indigo-400" />
                            {log.actor_name}
                            <span className="text-[#8e96a8] font-normal">({log.actor_role}{log.actor_kd_ao ? ` - ${log.actor_kd_ao}` : ''})</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#6b7280]" />
                            {formatDateTimeWita(log.timestamp)}
                            <span className="text-[#6b7280] hidden sm:inline">({formatRelativeTimeWita(log.timestamp)})</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expand Details button if metadata exists */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1.5 text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2433] rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Lihat metadata teknis"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded Metadata */}
                  {isExpanded && log.metadata && (
                    <div className="mt-3 ml-11 p-3 bg-[#0f1117] border border-[#232734] rounded-xl text-xs font-mono text-[#a6adbb] overflow-x-auto animate-fade-in">
                      <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1 font-bold">Metadata / Detail Payload:</div>
                      <pre className="text-[11px] text-emerald-400">{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
