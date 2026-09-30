import React, { useState, useEffect } from 'react';
import { SelectedWilayahState } from '../types';
import { WilayahService } from '../services/wilayahService';
import { MapPin } from 'lucide-react';

interface WilayahCascadeSelectorProps {
  label?: string;
  initialValues: SelectedWilayahState;
  onChange: (val: SelectedWilayahState) => void;
  required?: boolean;
  showSummary?: boolean;
  disabled?: boolean;
}

export const WilayahCascadeSelector: React.FC<WilayahCascadeSelectorProps> = ({
  label = 'Pilih Wilayah Domisili Konsumen',
  initialValues,
  onChange,
  required = false,
  showSummary = true,
  disabled = false
}) => {
  const [provinsiId, setProvinsiId] = useState(initialValues.provinsiId || '71');
  const [kabupatenId, setKabupatenId] = useState(initialValues.kabupatenId || '');
  const [kecamatanId, setKecamatanId] = useState(initialValues.kecamatanId || '');
  const [desaId, setDesaId] = useState(initialValues.desaId || '');

  useEffect(() => {
    setProvinsiId(initialValues.provinsiId || '71');
    setKabupatenId(initialValues.kabupatenId || '');
    setKecamatanId(initialValues.kecamatanId || '');
    setDesaId(initialValues.desaId || '');
  }, [initialValues]);

  const provinsiList = WilayahService.getProvinsi();
  const kabupatenList = WilayahService.getKabupaten(provinsiId);
  const kecamatanList = WilayahService.getKecamatan(kabupatenId);
  const desaList = WilayahService.getDesa(kecamatanId);

  const handleProvinsiChange = (val: string) => {
    setProvinsiId(val);
    setKabupatenId('');
    setKecamatanId('');
    setDesaId('');
    onChange({
      provinsiId: val,
      kabupatenId: '',
      kecamatanId: '',
      desaId: ''
    });
  };

  const handleKabupatenChange = (val: string) => {
    setKabupatenId(val);
    setKecamatanId('');
    setDesaId('');
    onChange({
      provinsiId,
      kabupatenId: val,
      kecamatanId: '',
      desaId: ''
    });
  };

  const handleKecamatanChange = (val: string) => {
    setKecamatanId(val);
    setDesaId('');
    onChange({
      provinsiId,
      kabupatenId,
      kecamatanId: val,
      desaId: ''
    });
  };

  const handleDesaChange = (val: string) => {
    setDesaId(val);
    onChange({
      provinsiId,
      kabupatenId,
      kecamatanId,
      desaId: val
    });
  };

  const summary = WilayahService.getFormattedName(provinsiId, kabupatenId, kecamatanId, desaId);

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-xs font-bold text-[#e0e4eb] flex items-center justify-between">
          <span>{label} {required && <strong className="text-rose-400">*</strong>}</span>
          <span className="text-[10px] text-[#8e96a8]">4 Tingkat Wilayah</span>
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Provinsi */}
        <div className="space-y-1">
          <label className="text-[11px] text-[#8e96a8] font-medium">1. Provinsi</label>
          <select
            value={provinsiId}
            disabled={disabled}
            onChange={(e) => handleProvinsiChange(e.target.value)}
            className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- Pilih Provinsi --</option>
            {provinsiList.map(p => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
        </div>

        {/* Kabupaten / Kota */}
        <div className="space-y-1">
          <label className="text-[11px] text-[#8e96a8] font-medium">2. Kabupaten / Kota</label>
          <select
            value={kabupatenId}
            disabled={disabled || !provinsiId}
            onChange={(e) => handleKabupatenChange(e.target.value)}
            className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- Pilih Kab/Kota --</option>
            {kabupatenList.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        {/* Kecamatan */}
        <div className="space-y-1">
          <label className="text-[11px] text-[#8e96a8] font-medium">3. Kecamatan</label>
          <select
            value={kecamatanId}
            disabled={disabled || !kabupatenId}
            onChange={(e) => handleKecamatanChange(e.target.value)}
            className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- Pilih Kecamatan --</option>
            {kecamatanList.map(kc => (
              <option key={kc.id} value={kc.id}>{kc.nama}</option>
            ))}
          </select>
        </div>

        {/* Kelurahan / Desa */}
        <div className="space-y-1">
          <label className="text-[11px] text-[#8e96a8] font-medium">4. Kelurahan / Desa</label>
          <select
            value={desaId}
            disabled={disabled || !kecamatanId}
            onChange={(e) => handleDesaChange(e.target.value)}
            className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- Pilih Kelurahan/Desa --</option>
            {desaList.map(d => (
              <option key={d.id} value={d.id}>{d.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {showSummary && summary && (
        <div className="p-2.5 rounded-xl bg-[#12151f] border border-[#232734] text-[11px] text-emerald-400 flex items-center space-x-1.5 font-medium">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Wilayah Terpilih: <strong>{summary}</strong></span>
        </div>
      )}
    </div>
  );
};
