import React, { useState } from 'react';
import { SalesRecord, UbahJtRecord } from '../types';
import { User, Posko } from '../../../types';
import { DataTable, Column } from '../../../components/DataTable';
import { 
  FileSpreadsheet, 
  DollarSign, 
  CalendarClock, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Award
} from 'lucide-react';

const INITIAL_SALES: SalesRecord[] = [
  {
    no_psb: 'PSB-2024-001',
    nama_konsumen: 'Vicky Lumentut',
    tgl_cair: '2024-09-15',
    tgl_jt: '2024-10-15',
    plafon: 25000000,
    tenor: 18,
    angsuran: 1850000,
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    kd_ao: 'AO-01',
    jenis_jaminan: 'R4'
  },
  {
    no_psb: 'PSB-2024-002',
    nama_konsumen: 'Priscilia Manoppo',
    tgl_cair: '2024-09-18',
    tgl_jt: '2024-10-18',
    plafon: 12000000,
    tenor: 12,
    angsuran: 1250000,
    kd_cabang: 'C16',
    kd_posko: 'QJ1',
    kd_ao: 'AO-02',
    jenis_jaminan: 'R2'
  }
];

interface KontrolSalesModuleProps {
  currentUser: User;
  poskoList?: Posko[];
  allCabang?: any[];
  allPosko?: any[];
  activeSubTab?: string;
  onSelectSubTab?: (tab: string) => void;
}

export const KontrolSalesModule: React.FC<KontrolSalesModuleProps> = ({
  currentUser,
  poskoList = [],
  allCabang = [],
  allPosko = [],
  activeSubTab: propSubTab,
  onSelectSubTab: propOnSelectSubTab
}) => {
  const [internalSubTab, setInternalSubTab] = useState<'rekap' | 'input' | 'table'>('rekap');
  const activeSubTab = propSubTab || internalSubTab;
  const onSelectSubTab = propOnSelectSubTab || ((t: any) => setInternalSubTab(t));

  const [salesData, setSalesData] = useState<SalesRecord[]>(INITIAL_SALES);

  // Form input pencairan
  const [noPsb, setNoPsb] = useState('');
  const [namaKonsumen, setNamaKonsumen] = useState('');
  const [plafon, setPlafon] = useState<number>(10000000);
  const [tenor, setTenor] = useState<number>(12);
  const [angsuran, setAngsuran] = useState<number>(1100000);
  const [kdPosko, setKdPosko] = useState(currentUser.kd_posko || 'QJ0');
  const [kdAo, setKdAo] = useState(currentUser.kd_ao || 'AO-01');
  const [successMsg, setSuccessMsg] = useState(false);

  const totalPlafon = salesData.reduce((acc, curr) => acc + (curr.plafon || 0), 0);

  const handleAddSales = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: SalesRecord = {
      no_psb: noPsb.trim().toUpperCase(),
      nama_konsumen: namaKonsumen.trim(),
      tgl_cair: new Date().toISOString().split('T')[0],
      tgl_jt: new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0],
      plafon: Number(plafon),
      tenor: Number(tenor),
      angsuran: Number(angsuran),
      kd_cabang: currentUser.kd_cabang || 'C16',
      kd_posko: kdPosko,
      kd_ao: kdAo,
      jenis_jaminan: 'R2'
    };

    setSalesData([newEntry, ...salesData]);
    setSuccessMsg(true);
    setNoPsb('');
    setNamaKonsumen('');
    setTimeout(() => setSuccessMsg(false), 2000);
  };

  const columns: Column<SalesRecord>[] = [
    {
      key: 'no_psb',
      header: 'No. PSB',
      sortable: true,
      render: (s) => <span className="font-mono text-white font-bold">{s.no_psb}</span>
    },
    {
      key: 'nama_konsumen',
      header: 'Nama Nasabah',
      sortable: true,
      render: (s) => <span className="font-semibold text-white">{s.nama_konsumen}</span>
    },
    {
      key: 'tgl_cair',
      header: 'Tgl Cair',
      sortable: true
    },
    {
      key: 'tgl_jt',
      header: 'Tgl JT',
      sortable: true,
      render: (s) => <span className="text-amber-400 font-mono">{s.tgl_jt}</span>
    },
    {
      key: 'plafon',
      header: 'Plafon (Rp)',
      sortable: true,
      render: (s) => <span className="font-mono font-bold text-emerald-400">Rp {s.plafon.toLocaleString('id-ID')}</span>
    },
    {
      key: 'angsuran',
      header: 'Angsuran (Rp)',
      render: (s) => <span className="font-mono text-[#a3adc2]">Rp {s.angsuran.toLocaleString('id-ID')}</span>
    },
    {
      key: 'kd_posko',
      header: 'Posko',
      render: (s) => <span className="font-mono text-white">{s.kd_posko}</span>
    },
    {
      key: 'kd_ao',
      header: 'AO',
      render: (s) => <span className="font-mono text-indigo-300">{s.kd_ao}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] space-y-2">
          <div className="flex justify-between items-center text-xs text-[#8e96a8]">
            <span>Total Kontrak Cair</span>
            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{salesData.length} Nasabah</div>
          <div className="text-[11px] text-[#717b94]">Bulan Berjalan</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] space-y-2">
          <div className="flex justify-between items-center text-xs text-[#8e96a8]">
            <span>Total Realisasi Plafon</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            Rp {(totalPlafon / 1000000).toFixed(1)} Juta
          </div>
          <div className="text-[11px] text-emerald-500/80">Rp {totalPlafon.toLocaleString('id-ID')}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#12151f] border border-[#232734] space-y-2">
          <div className="flex justify-between items-center text-xs text-[#8e96a8]">
            <span>Posko Aktif</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{poskoList.length} Posko</div>
          <div className="text-[11px] text-[#717b94]">Area Manado &amp; Sekitarnya</div>
        </div>
      </div>

      {/* Input Pencairan Section */}
      {activeSubTab === 'input-pencairan' && (
        <div className="p-6 rounded-2xl bg-[#12151f] border border-[#232734] space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-sm pb-2 border-b border-[#232734]">
            <PlusCircle className="h-4 w-4 text-blue-400" />
            <span>Form Input Pencairan Baru</span>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Data pencairan berhasil ditambahkan!</span>
            </div>
          )}

          <form onSubmit={handleAddSales} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-white font-semibold">Nomor PSB <strong className="text-rose-400">*</strong></label>
              <input
                type="text"
                required
                value={noPsb}
                onChange={(e) => setNoPsb(e.target.value.toUpperCase())}
                placeholder="Contoh: PSB-2024-003"
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white font-semibold">Nama Konsumen <strong className="text-rose-400">*</strong></label>
              <input
                type="text"
                required
                value={namaKonsumen}
                onChange={(e) => setNamaKonsumen(e.target.value)}
                placeholder="Contoh: Meidy Mandagi"
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white font-semibold">Plafon Realisasi (Rp)</label>
              <input
                type="number"
                required
                value={plafon}
                onChange={(e) => setPlafon(Number(e.target.value))}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white font-semibold">Angsuran per Bulan (Rp)</label>
              <input
                type="number"
                required
                value={angsuran}
                onChange={(e) => setAngsuran(Number(e.target.value))}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white font-semibold">Posko</label>
              <select
                value={kdPosko}
                onChange={(e) => setKdPosko(e.target.value)}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white"
              >
                {poskoList.map(p => (
                  <option key={p.kd_posko} value={p.kd_posko}>{p.kd_posko} - {p.nama_posko}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-white font-semibold">AO Pengelola</label>
              <input
                type="text"
                value={kdAo}
                onChange={(e) => setKdAo(e.target.value.toUpperCase())}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer"
              >
                Simpan Pencairan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Data Konsumen Cair */}
      <DataTable
        data={salesData}
        columns={columns}
        keyExtractor={(item) => item.no_psb}
        title="Data Konsumen Cair (Sales KAMM)"
        subtitle="Daftar realisasi pinjaman konsumen baru yang telah cair"
        searchPlaceholder="Cari nama, no. PSB, atau AO..."
      />
    </div>
  );
};
