import React, { useState } from 'react';
import { WilayahService } from '../services/wilayahService';
import { MapPin, Search } from 'lucide-react';

export const MasterWilayahViewer: React.FC = () => {
  const [selectedProv, setSelectedProv] = useState('71');
  const [selectedKab, setSelectedKab] = useState('7171');
  const [selectedKec, setSelectedKec] = useState('7171010');

  const provList = WilayahService.getProvinsi();
  const kabList = WilayahService.getKabupaten(selectedProv);
  const kecList = WilayahService.getKecamatan(selectedKab);
  const desaList = WilayahService.getDesa(selectedKec);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#12151f] border border-[#232734] shadow-xl space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-[#232734]">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Master Data Wilayah Domisili</h2>
            <p className="text-xs text-[#8e96a8]">Referensi hierarki 4-tingkat wilayah administratif (Sulawesi Utara)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-white font-semibold">1. Provinsi</label>
            <select
              value={selectedProv}
              onChange={(e) => {
                setSelectedProv(e.target.value);
                const kabs = WilayahService.getKabupaten(e.target.value);
                setSelectedKab(kabs[0]?.id || '');
              }}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white"
            >
              {provList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-white font-semibold">2. Kabupaten / Kota</label>
            <select
              value={selectedKab}
              onChange={(e) => {
                setSelectedKab(e.target.value);
                const kecs = WilayahService.getKecamatan(e.target.value);
                setSelectedKec(kecs[0]?.id || '');
              }}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white"
            >
              {kabList.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-white font-semibold">3. Kecamatan</label>
            <select
              value={selectedKec}
              onChange={(e) => setSelectedKec(e.target.value)}
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white"
            >
              {kecList.map(kc => (
                <option key={kc.id} value={kc.id}>{kc.nama}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Desa List in the Selected Kecamatan */}
        <div className="mt-4 pt-4 border-t border-[#232734]">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-white">
              Daftar Kelurahan / Desa di Kecamatan Terpilih ({desaList.length} Desa/Kelurahan)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {desaList.map(d => (
              <div
                key={d.id}
                className="p-3 rounded-xl bg-[#161a26] border border-[#232734] text-xs flex items-center justify-between"
              >
                <span className="font-medium text-white">{d.nama}</span>
                <span className="font-mono text-[10px] text-[#717b94]">{d.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
