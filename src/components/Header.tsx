import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  Building2, 
  LogOut, 
  MapPin, 
  RefreshCw,
  KeyRound,
  Download,
  Upload
} from 'lucide-react';
import { DatabaseService, SystemFullBackup } from '../services/storage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface HeaderProps {
  onRefresh: () => void;
  onOpenChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, onOpenChangePassword }) => {
  const { currentUser, logout, refreshData, isSuperAdminSession } = useAuth();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null);

  const handleConfirmReset = () => {
    DatabaseService.resetToDefault();
    refreshData();
    onRefresh();
  };

  // Download Full System JSON Backup
  const handleDownloadBackup = () => {
    try {
      const backup = DatabaseService.getFullSystemBackup(currentUser?.nama || 'SUPER_ADMIN');
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      const filename = `MED_CONTROL_BACKUP_${dateStr}_${timeStr}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnapshotMsg('Backup database .JSON berhasil diunduh!');
      setTimeout(() => setSnapshotMsg(null), 4000);
    } catch (err: any) {
      alert(`Gagal membuat backup: ${err.message}`);
    }
  };

  // Restore Full System JSON Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as SystemFullBackup;

        if (window.confirm('Pulihkan seluruh database dari file .JSON ini? Semua akun, mediator, dan log FU akan disinkronkan.')) {
          const res = DatabaseService.restoreFullSystemBackup(parsed);
          if (res.success) {
            refreshData();
            onRefresh();
            setSnapshotMsg(res.message);
            setTimeout(() => setSnapshotMsg(null), 5000);
          } else {
            alert(res.message);
          }
        }
      } catch (err: any) {
        alert('Format file JSON backup tidak valid!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
      case 'RM':
        return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
      case 'KACAB':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
      case 'KAOPS':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
      case 'ADM':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
      case 'KAPOS':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
      case 'CMO':
        return 'bg-teal-950/60 text-teal-300 border-teal-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="bg-[#13151c] border-b border-[#232734] sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#f1f3f7] text-lg tracking-tight">Super App KAMM Manado</span>
              </div>
              <p className="text-xs text-[#8e96a8] hidden sm:block">Sistem Pengendalian & Monitoring</p>
            </div>
          </div>

          {/* Right info & profile */}
          <div className="flex items-center space-x-3">
            {/* Cabang info */}
            {currentUser?.kd_cabang && (
              <div className="hidden md:flex items-center text-xs text-[#c2c7d0] bg-[#1a1d27] px-3 py-1.5 rounded-lg border border-[#2e3446]">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                <span className="font-medium text-[#e0e4eb]">{currentUser.kd_cabang}</span>
                {currentUser.kd_posko && (
                  <span className="text-[#8e96a8] ml-1">/ {currentUser.kd_posko}</span>
                )}
              </div>
            )}

            {/* Current user badge & actions */}
            {currentUser ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-[#282d3d]">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-[#f1f3f7] flex items-center justify-end space-x-1">
                    <span>{currentUser.nama}</span>
                  </div>
                  <div className="flex items-center justify-end space-x-1 mt-0.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                    {currentUser.kd_ao && (
                      <span className="text-[11px] text-[#8e96a8]">({currentUser.kd_ao})</span>
                    )}
                  </div>
                </div>

                <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-blue-400/30">
                  {currentUser.nama.charAt(0)}
                </div>

                {/* Change Password Button */}
                {onOpenChangePassword && (
                  <button
                    id="btn-open-change-password"
                    onClick={onOpenChangePassword}
                    title="Ganti Password Akun"
                    className="p-2 text-[#8e96a8] hover:text-amber-400 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                )}

                {/* Logout Button */}
                <button
                  id="btn-logout"
                  onClick={logout}
                  title="Keluar / Logout"
                  className="p-2 text-[#8e96a8] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Bar (Backup + Restore + Reset Data) - ONLY for Super Admin */}
        {isSuperAdminSession && (
          <div className="py-2 border-t border-[#1f2330] flex flex-wrap items-center justify-end gap-2 text-xs">
            {/* Anti-Reset Backup / Restore buttons right next to Reset Data */}
            <div className="flex items-center space-x-2 min-w-max ml-auto">
              {snapshotMsg && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/60 animate-fade-in">
                  {snapshotMsg}
                </span>
              )}

              {/* 1. Download Backup JSON */}
              <button
                id="btn-download-json-backup-header"
                onClick={handleDownloadBackup}
                className="flex items-center space-x-1 px-3 py-1 rounded-md bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 hover:text-white border border-indigo-700/60 transition-colors cursor-pointer text-[11px] font-bold shadow-xs"
                title="Download seluruh database ke file .JSON (Anti-Reset)"
              >
                <Download className="h-3.5 w-3.5 text-indigo-300" />
                <span>Backup JSON (Anti-Reset)</span>
              </button>

              {/* 2. Restore Backup JSON */}
              <label
                id="label-restore-json-backup-header"
                className="flex items-center space-x-1 px-3 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 hover:text-white border border-emerald-800/60 transition-colors cursor-pointer text-[11px] font-bold shadow-xs"
                title="Pulihkan database dari file .JSON yang pernah di-download"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-300" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>

              {/* 3. Reset Data Button */}
              <button
                id="btn-reset-demo-data"
                onClick={() => setIsResetConfirmOpen(true)}
                className="text-[#8e96a8] hover:text-rose-300 flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#181a24] hover:bg-rose-950/40 border border-[#272d3e] hover:border-rose-900/50 transition-colors cursor-pointer text-[11px]"
                title="Reset data ke kondisi awal"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isResetConfirmOpen}
        title="Reset Seluruh Data"
        description="Apakah Anda yakin ingin mereset seluruh data aplikasi ke kondisi awal pabrik? Tindakan ini akan mengosongkan semua data mediator dan riwayat follow-up."
        confirmButtonText="Ya, Reset Data"
        onConfirm={handleConfirmReset}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </header>
  );
};
