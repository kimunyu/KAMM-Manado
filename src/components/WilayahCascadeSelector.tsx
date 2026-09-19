import React from 'react';
import { 
  MapPin, 
  Building, 
  Compass, 
  Home, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  RotateCcw 
} from 'lucide-react';
import { useWilayahCascade, UseWilayahCascadeOptions } from '../hooks/useWilayahCascade';
import { SelectedWilayahState } from '../types';

export interface WilayahCascadeSelectorProps {
  idPrefix?: string;
  label?: string;
  initialValues?: Partial<SelectedWilayahState>;
  onChange?: (state: SelectedWilayahState) => void;
  disabled?: boolean;
  required?: boolean;
  showSummary?: boolean;
}

export const WilayahCascadeSelector: React.FC<WilayahCascadeSelectorProps> = ({
  idPrefix = 'wilayah',
  label = 'Wilayah Administratif',
  initialValues,
  onChange,
  disabled = false,
  required = false,
  showSummary = true,
}) => {
  const {
    provinsiList,
    kabupatenList,
    kecamatanList,
    desaList,
    selectedState,
    loadingProvinsi,
    loadingKabupaten,
    loadingKecamatan,
    loadingDesa,
    error,
    setProvinsi,
    setKabupaten,
    setKecamatan,
    setDesa,
    resetAll,
  } = useWilayahCascade({
    initialValues,
    onChange,
  });

  const isProvinsiDisabled = disabled || loadingProvinsi;
  const isKabupatenDisabled = disabled || !selectedState.provinsiId || loadingKabupaten;
  const isKecamatanDisabled = disabled || !selectedState.kabupatenId || loadingKecamatan;
  const isDesaDisabled = disabled || !selectedState.kecamatanId || loadingDesa;

  const isComplete = Boolean(
    selectedState.provinsiId &&
    selectedState.kabupatenId &&
    selectedState.kecamatanId &&
    selectedState.desaId
  );

  return (
    <div className="space-y-3.5 bg-[#10131b] p-4 rounded-2xl border border-[#232734] shadow-sm">
      {/* Header with Title & Reset Button */}
      <div className="flex items-center justify-between pb-2 border-b border-[#232734]">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold text-[#f1f3f7] uppercase tracking-wider">
            {label} {required && <span className="text-rose-400">*</span>}
          </span>
        </div>
        {(selectedState.provinsiId || selectedState.kabupatenId) && !disabled && (
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] font-semibold text-[#8e96a8] hover:text-amber-300 flex items-center space-x-1 cursor-pointer transition-colors"
            title="Reset Pilihan Wilayah"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Error Alert if query fails */}
      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/70 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid 4-Level Cascading Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Provinsi */}
        <div>
          <label 
            htmlFor={`${idPrefix}-select-provinsi`}
            className="block text-xs font-semibold text-[#c2c7d0] mb-1 flex items-center justify-between"
          >
            <span>1. Provinsi</span>
            {loadingProvinsi && <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />}
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-select-provinsi`}
              value={selectedState.provinsiId}
              disabled={isProvinsiDisabled}
              onChange={(e) => setProvinsi(e.target.value)}
              className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${
                isProvinsiDisabled ? 'opacity-60 cursor-not-allowed bg-[#181a24]' : 'cursor-pointer'
              }`}
            >
              <option value="">
                {loadingProvinsi ? 'Memuat data provinsi...' : '-- Pilih Provinsi --'}
              </option>
              {provinsiList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Kabupaten / Kota */}
        <div>
          <label 
            htmlFor={`${idPrefix}-select-kabupaten`}
            className="block text-xs font-semibold text-[#c2c7d0] mb-1 flex items-center justify-between"
          >
            <span>2. Kabupaten / Kota</span>
            {loadingKabupaten && <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />}
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-select-kabupaten`}
              value={selectedState.kabupatenId}
              disabled={isKabupatenDisabled}
              onChange={(e) => setKabupaten(e.target.value)}
              className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${
                isKabupatenDisabled ? 'opacity-60 cursor-not-allowed bg-[#181a24]' : 'cursor-pointer'
              }`}
            >
              <option value="">
                {!selectedState.provinsiId
                  ? 'Pilih provinsi terlebih dahulu'
                  : loadingKabupaten
                  ? 'Memuat kabupaten/kota...'
                  : kabupatenList.length === 0
                  ? 'Tidak ada data kabupaten'
                  : '-- Pilih Kabupaten/Kota --'}
              </option>
              {kabupatenList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Kecamatan */}
        <div>
          <label 
            htmlFor={`${idPrefix}-select-kecamatan`}
            className="block text-xs font-semibold text-[#c2c7d0] mb-1 flex items-center justify-between"
          >
            <span>3. Kecamatan</span>
            {loadingKecamatan && <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />}
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-select-kecamatan`}
              value={selectedState.kecamatanId}
              disabled={isKecamatanDisabled}
              onChange={(e) => setKecamatan(e.target.value)}
              className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${
                isKecamatanDisabled ? 'opacity-60 cursor-not-allowed bg-[#181a24]' : 'cursor-pointer'
              }`}
            >
              <option value="">
                {!selectedState.kabupatenId
                  ? 'Pilih kabupaten terlebih dahulu'
                  : loadingKecamatan
                  ? 'Memuat kecamatan...'
                  : kecamatanList.length === 0
                  ? 'Tidak ada data kecamatan'
                  : '-- Pilih Kecamatan --'}
              </option>
              {kecamatanList.map((kc) => (
                <option key={kc.id} value={kc.id}>
                  {kc.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Desa / Kelurahan */}
        <div>
          <label 
            htmlFor={`${idPrefix}-select-desa`}
            className="block text-xs font-semibold text-[#c2c7d0] mb-1 flex items-center justify-between"
          >
            <span>4. Desa / Kelurahan</span>
            {loadingDesa && <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />}
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-select-desa`}
              value={selectedState.desaId}
              disabled={isDesaDisabled}
              onChange={(e) => setDesa(e.target.value)}
              className={`w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${
                isDesaDisabled ? 'opacity-60 cursor-not-allowed bg-[#181a24]' : 'cursor-pointer'
              }`}
            >
              <option value="">
                {!selectedState.kecamatanId
                  ? 'Pilih kecamatan terlebih dahulu'
                  : loadingDesa
                  ? 'Memuat desa/kelurahan...'
                  : desaList.length === 0
                  ? 'Tidak ada data desa/kelurahan'
                  : '-- Pilih Desa/Kelurahan --'}
              </option>
              {desaList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Optional Summary Badge */}
      {showSummary && (selectedState.provinsiNama || selectedState.kabupatenNama) && (
        <div className="pt-2 border-t border-[#232734] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-[#8e96a8]">
            <Home className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>
              Hirarki Terpilih:{' '}
              <strong className="text-[#f1f3f7]">
                {[
                  selectedState.provinsiNama,
                  selectedState.kabupatenNama,
                  selectedState.kecamatanNama,
                  selectedState.desaNama
                ].filter(Boolean).join(' › ') || '-'}
              </strong>
            </span>
          </div>

          <div>
            {isComplete ? (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Alamat Lengkap 4 Tingkat</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#6b7280]">
                Belum lengkap ({[selectedState.provinsiId, selectedState.kabupatenId, selectedState.kecamatanId, selectedState.desaId].filter(Boolean).length}/4 tingkat)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
