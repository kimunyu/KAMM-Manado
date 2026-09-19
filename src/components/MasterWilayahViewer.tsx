import React, { useState } from 'react';
import { 
  Globe, 
  Database, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  Server,
  Layers,
  MapPin,
  Flame
} from 'lucide-react';
import { WilayahCascadeSelector } from './WilayahCascadeSelector';
import { SelectedWilayahState } from '../types';
import { wilayahService } from '../services/wilayahService';

export const MasterWilayahViewer: React.FC = () => {
  const [selectedWilayah, setSelectedWilayah] = useState<SelectedWilayahState>({
    provinsiId: '',
    kabupatenId: '',
    kecamatanId: '',
    desaId: '',
  });

  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const handleClearCache = () => {
    wilayahService.clearCache();
    setCacheNotice('Cache lokal master wilayah berhasil dibersihkan dari memori & localStorage.');
    setTimeout(() => setCacheNotice(null), 4000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Info Panel */}
      <div className="p-5 bg-gradient-to-r from-blue-950/40 via-[#13151c] to-indigo-950/40 border border-blue-900/40 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-bold text-[#f1f3f7]">
              Eksplorasi Master Wilayah Indonesia (4-Level Administrative)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
              PHASE 1D READ-ONLY
            </span>
          </div>
          <p className="text-xs text-[#8e96a8] leading-relaxed max-w-3xl">
            Layanan Master Wilayah ini membaca langsung data canonical dari Cloud Firestore (<code className="text-blue-300 font-mono">wilayah_provinsi</code>, <code className="text-blue-300 font-mono">wilayah_kabupaten</code>, <code className="text-blue-300 font-mono">wilayah_kecamatan</code>, <code className="text-blue-300 font-mono">wilayah_desa</code>) dengan lazy cascading query dan client-side caching 30 hari.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearCache}
          className="px-3.5 py-2 bg-[#181a24] hover:bg-[#222634] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#2e3446] rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shrink-0 transition-colors"
          title="Bersihkan cache lokal wilayah"
        >
          <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
          <span>Bersihkan Cache Lokal</span>
        </button>
      </div>

      {cacheNotice && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{cacheNotice}</span>
        </div>
      )}

      {/* Reusable Component Demonstration */}
      <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-5 shadow-md space-y-4">
        <div>
          <h3 className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
            <Layers className="h-4 w-4 text-blue-400" />
            <span>Komponen Reusable: WilayahCascadeSelector</span>
          </h3>
          <p className="text-xs text-[#6b7280]">
            Komponen ini mandiri dan siap disematkan ke modul Sales Acquisition (Phase 1E), Customer Profiling, atau Mediator Form tanpa coupling ke database sales.
          </p>
        </div>

        <WilayahCascadeSelector
          idPrefix="explorer-wilayah"
          label="Pilih Wilayah Domisili / Operasional"
          initialValues={selectedWilayah}
          onChange={(next) => setSelectedWilayah(next)}
          showSummary={true}
        />
      </div>

      {/* State Inspector Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#10131b] p-4 rounded-2xl border border-[#232734] space-y-3">
          <h4 className="text-xs font-bold text-[#c2c7d0] flex items-center space-x-1.5">
            <Database className="h-4 w-4 text-purple-400" />
            <span>State Inspector (Data Yang Terpilih)</span>
          </h4>
          <div className="bg-[#0a0c10] p-3 rounded-xl border border-[#1e2330] font-mono text-[11px] text-purple-200 space-y-1 overflow-x-auto">
            <div>provinsi_id: <span className="text-amber-300">{selectedWilayah.provinsiId ? `"${selectedWilayah.provinsiId}"` : 'null'}</span> {selectedWilayah.provinsiNama && <span className="text-[#6b7280]">({selectedWilayah.provinsiNama})</span>}</div>
            <div>kabupaten_id: <span className="text-amber-300">{selectedWilayah.kabupatenId ? `"${selectedWilayah.kabupatenId}"` : 'null'}</span> {selectedWilayah.kabupatenNama && <span className="text-[#6b7280]">({selectedWilayah.kabupatenNama})</span>}</div>
            <div>kecamatan_id: <span className="text-amber-300">{selectedWilayah.kecamatanId ? `"${selectedWilayah.kecamatanId}"` : 'null'}</span> {selectedWilayah.kecamatanNama && <span className="text-[#6b7280]">({selectedWilayah.kecamatanNama})</span>}</div>
            <div>desa_id: <span className="text-amber-300">{selectedWilayah.desaId ? `"${selectedWilayah.desaId}"` : 'null'}</span> {selectedWilayah.desaNama && <span className="text-[#6b7280]">({selectedWilayah.desaNama})</span>}</div>
          </div>
        </div>

        <div className="bg-[#10131b] p-4 rounded-2xl border border-[#232734] space-y-2.5 text-xs text-[#8e96a8]">
          <h4 className="font-bold text-[#c2c7d0] flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Jaminan Keamanan & Efisiensi (Phase 1D)</span>
          </h4>
          <ul className="space-y-1.5 text-[11px] list-disc list-inside text-[#a6adbb]">
            <li><strong className="text-[#f1f3f7]">Read-Only</strong>: Tidak ada fungsi mutation/write dari frontend.</li>
            <li><strong className="text-[#f1f3f7]">No Preload</strong>: Kabupaten, Kecamatan, dan Desa hanya dimuat on-demand saat parent dipilih.</li>
            <li><strong className="text-[#f1f3f7]">Race-Condition Proof</strong>: Menggunakan sequence guard pada hooks untuk mencegah stale response.</li>
            <li><strong className="text-[#f1f3f7]">Penyekatan Hirarki Bisnis</strong>: Master Wilayah berdiri murni administratif terpisah dari hierarki <code className="text-blue-300 font-mono">kd_cabang</code> / <code className="text-blue-300 font-mono">kd_posko</code>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
