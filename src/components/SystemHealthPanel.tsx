import React from 'react';
import { Activity, ShieldCheck, Database, Server, CheckCircle2 } from 'lucide-react';

export const SystemHealthPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#12151f] border border-[#232734] shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-[#232734]">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Status Kesehatan Sistem &amp; Konektivitas</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#161a26] border border-[#232734] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8e96a8]">Database Firestore</span>
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>Terhubung &amp; Sinkron</span>
            </div>
            <div className="text-[10px] text-[#717b94] font-mono">
              ai-studio-mediatorkontrakm
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161a26] border border-[#232734] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8e96a8]">Keamanan &amp; RBAC</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>9 Role Aktif</span>
            </div>
            <div className="text-[10px] text-[#717b94]">
              Enforced by Firestore Rules
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#161a26] border border-[#232734] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8e96a8]">Runtime Engine</span>
              <Server className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-white">
              Vite + React 19
            </div>
            <div className="text-[10px] text-emerald-400">
              Optimal (Zero Latency)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
