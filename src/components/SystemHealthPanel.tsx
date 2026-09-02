import React, { useState, useEffect } from 'react';
import { SystemHealthStatus } from '../types';
import { checkSystemHealth } from '../services/healthCheckService';
import { formatDateTimeWita } from '../utils/formatters';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive, 
  Clock, 
  Users, 
  Flame, 
  PhoneCall, 
  Building2, 
  MapPin,
  Lock
} from 'lucide-react';

export const SystemHealthPanel: React.FC = () => {
  const [status, setStatus] = useState<SystemHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const res = await checkSystemHealth();
      setStatus(res);
      setLastCheckTime(new Date().toISOString());
    } catch (e) {
      console.error('Failed to run system health check:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
    // Re-check automatically every 60 seconds
    const interval = setInterval(runHealthCheck, 60000);
    return () => clearInterval(interval);
  }, []);

  const getLatencyBadge = (latency: number) => {
    if (latency < 0) {
      return { text: 'Terputus', bg: 'bg-rose-950/60 text-rose-300 border-rose-800/60' };
    }
    if (latency < 300) {
      return { text: `${latency} ms (Optimal)`, bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
    }
    if (latency < 1000) {
      return { text: `${latency} ms (Normal)`, bg: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
    }
    return { text: `${latency} ms (Lambat)`, bg: 'bg-rose-950/60 text-rose-300 border-rose-800/60' };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1f2330]">
          <div>
            <h2 className="text-lg font-bold text-[#f1f3f7] flex items-center space-x-2.5">
              <Server className="h-5 w-5 text-emerald-400" />
              <span>Status Monitoring & Health Check Firebase</span>
            </h2>
            <p className="text-xs text-[#8e96a8] mt-1">
              Pemantauan koneksi real-time, latensi respons database Firestore, dan integritas dokumen master data.
            </p>
          </div>

          <button
            onClick={runHealthCheck}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-xs font-semibold text-emerald-300 hover:text-white border border-emerald-800/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Memeriksa...' : 'Cek Status Sekarang'}</span>
          </button>
        </div>

        {/* Primary Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* 1. Firestore Cloud Status */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#232734]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8]">Database Firestore</span>
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              {status?.firestoreConnected ? (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-base font-bold text-emerald-400">Terhubung (Online)</span>
                </>
              ) : (
                <>
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-base font-bold text-rose-400">Terputus (Offline)</span>
                </>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#8e96a8]">
              <span>Database Target:</span>
              <span className="font-mono text-indigo-300">ai-studio-mediatorkontrakm...</span>
            </div>
          </div>

          {/* 2. Latency / Ping */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#232734]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8]">Kecepatan Respon (Ping)</span>
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              {status ? (
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${getLatencyBadge(status.latencyMs).bg}`}>
                  {getLatencyBadge(status.latencyMs).text}
                </span>
              ) : (
                <span className="text-xs text-[#8e96a8]">Mengukur...</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#8e96a8]">
              <span>Pemeriksaan Terakhir:</span>
              <span className="font-mono text-[#c2c7d0]">
                {lastCheckTime ? formatDateTimeWita(lastCheckTime) : '-'}
              </span>
            </div>
          </div>

          {/* 3. Client Network */}
          <div className="bg-[#181a24] p-4 rounded-xl border border-[#232734]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8e96a8]">Koneksi Browser Pengguna</span>
              {status?.isOnline ? <Wifi className="h-4 w-4 text-blue-400" /> : <WifiOff className="h-4 w-4 text-rose-400" />}
            </div>
            <div className="mt-2">
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${
                status?.isOnline 
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/60' 
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              }`}>
                {status?.isOnline ? 'Internet Aktif' : 'Internet Terputus'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#8e96a8]">
              <span>Mode Operasi:</span>
              <span className="text-emerald-400 font-semibold">Dual Storage (Cloud + Cache)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Statistics */}
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-[#f1f3f7] mb-3 flex items-center space-x-2">
          <HardDrive className="h-4 w-4 text-indigo-400" />
          <span>Jumlah Dokumen Aktif per Koleksi Firestore</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">users</span>
            </div>
            <div className="text-2xl font-black text-purple-400">
              {status?.collectionCounts.users ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Akun Pengguna</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">mediators</span>
            </div>
            <div className="text-2xl font-black text-blue-400">
              {status?.collectionCounts.mediators ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Data Mediator</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">fu_logs</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {status?.collectionCounts.fu_logs ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Log Follow-Up Mediator</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">ex_customers</span>
            </div>
            <div className="text-2xl font-black text-orange-400">
              {status?.collectionCounts.ex_customers ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Nasabah BPKB Lunas</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <Building2 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">cabang</span>
            </div>
            <div className="text-2xl font-black text-cyan-400">
              {status?.collectionCounts.cabang ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Master Cabang</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <MapPin className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">posko</span>
            </div>
            <div className="text-2xl font-black text-teal-400">
              {status?.collectionCounts.posko ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Master Posko</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <Activity className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">ex_customer_fu</span>
            </div>
            <div className="text-2xl font-black text-amber-400">
              {status?.collectionCounts.ex_customer_fu_logs ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Log FU Ex-Customer</span>
          </div>

          <div className="bg-[#181a24] p-3.5 rounded-xl border border-[#232734]">
            <div className="flex items-center space-x-2 text-[#8e96a8] mb-1">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-[#c2c7d0]">audit_logs</span>
            </div>
            <div className="text-2xl font-black text-indigo-400">
              {status?.collectionCounts.audit_logs ?? 0}
            </div>
            <span className="text-[10px] text-[#8e96a8]">Jejak Audit</span>
          </div>
        </div>
      </div>

      {/* Security Architecture Summary */}
      <div className="bg-[#13151c] border border-[#232734] rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-[#f1f3f7] mb-3 flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Status Keamanan & Kebijakan Firestore Rules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734] flex items-start space-x-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#f1f3f7]">Role-Based Access Control (RBAC):</span>
              <p className="text-[#8e96a8] mt-0.5">
                8 Role tervalidasi di sisi server Firestore Rules (SUPER_ADMIN, RM, KACAB, KAOPS, KAPOS, ADM, CMO, ADMIN_BPKB).
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#181a24] rounded-xl border border-[#232734] flex items-start space-x-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#f1f3f7]">Jaminan Privasi BPKB (48 Jam):</span>
              <p className="text-[#8e96a8] mt-0.5">
                Akses data nasabah oleh ADMIN_BPKB dibatasi maksimal 2x24 jam sejak pembuatan data untuk menjaga privasi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
