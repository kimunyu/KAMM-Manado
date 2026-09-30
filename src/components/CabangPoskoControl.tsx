import React, { useState } from 'react';
import { Cabang, Posko } from '../types';
import { Building2, MapPin, Plus } from 'lucide-react';

interface CabangPoskoControlProps {
  cabangList: Cabang[];
  poskoList: Posko[];
}

export const CabangPoskoControl: React.FC<CabangPoskoControlProps> = ({
  cabangList,
  poskoList
}) => {
  return (
    <div className="space-y-6">
      {/* Cabang */}
      <div className="p-6 rounded-2xl bg-[#12151f] border border-[#232734] shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-[#232734]">
          <Building2 className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white">Daftar Kantor Cabang KAMM</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cabangList.map(c => (
            <div key={c.kd_cabang} className="p-4 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{c.nama_cabang}</span>
                <span className="font-mono text-xs font-bold text-blue-400">{c.kd_cabang}</span>
              </div>
              <p className="text-[11px] text-[#8e96a8]">{c.alamat || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Posko */}
      <div className="p-6 rounded-2xl bg-[#12151f] border border-[#232734] shadow-xl space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-[#232734]">
          <MapPin className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Daftar Posko Operasional</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {poskoList.map(p => (
            <div key={p.kd_posko} className="p-4 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">{p.nama_posko}</span>
                <span className="font-mono text-xs font-bold text-indigo-300">{p.kd_posko}</span>
              </div>
              <div className="text-[10px] text-[#717b94] font-mono">Cabang: {p.kd_cabang}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
