import React, { useState, useMemo, useEffect } from 'react';
import { MediatorKontrak, User, FollowUpLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { DataTable, Column } from './DataTable';
import { PhoneCall, Plus, Search, Calendar, MessageSquare, CheckCircle2, User as UserIcon } from 'lucide-react';

interface FollowUpModuleProps {
  mediators: MediatorKontrak[];
  currentUser?: User;
  preSelectedKdMed?: string;
  onFollowUpSuccess?: () => void;
}

export const FollowUpModule: React.FC<FollowUpModuleProps> = ({
  mediators,
  currentUser: propUser,
  preSelectedKdMed,
  onFollowUpSuccess
}) => {
  const { currentUser: authUser } = useAuth();
  const currentUser = propUser || authUser || ({ id: 'USR_UNKNOWN', nama: 'Pengguna', kd_ao: '' } as User);

  const [logs, setLogs] = useState<FollowUpLog[]>(StorageService.getFollowUps());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMed, setSelectedMed] = useState<MediatorKontrak | null>(null);

  // Form input
  const [hasilKontak, setHasilKontak] = useState('AKTIF_KIRIM_LEAD');
  const [komitmenLead, setKomitmenLead] = useState<number>(1);
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const matchedMediators = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return mediators.filter(m => 
      m.status === 'AKTIF' && (
        m.kd_med.toLowerCase().includes(q) ||
        m.nama_mediator.toLowerCase().includes(q) ||
        m.no_tlpn.includes(q)
      )
    ).slice(0, 10);
  }, [mediators, searchQuery]);

  const handleSelectMediator = (med: MediatorKontrak) => {
    setSelectedMed(med);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    setIsSubmitting(true);
    const newEntry = StorageService.addFollowUp({
      kd_med: selectedMed.kd_med,
      tanggal: new Date().toISOString().split('T')[0],
      user_id: currentUser.id,
      user_nama: currentUser.nama,
      hasil_kontak: hasilKontak,
      komitmen_lead: Number(komitmenLead),
      catatan: catatan.trim()
    });

    setLogs(StorageService.getFollowUps());
    setIsSubmitting(false);
    setSuccess(true);
    setCatatan('');
    setSelectedMed(null);

    setTimeout(() => setSuccess(false), 2500);
  };

  const columns: Column<FollowUpLog>[] = [
    {
      key: 'tanggal',
      header: 'Tanggal',
      sortable: true
    },
    {
      key: 'kd_med',
      header: 'KD MED',
      sortable: true,
      render: (log) => <span className="font-mono text-white font-bold">{log.kd_med}</span>
    },
    {
      key: 'user_nama',
      header: 'Petugas Follow Up',
      render: (log) => <span className="text-blue-300">{log.user_nama}</span>
    },
    {
      key: 'hasil_kontak',
      header: 'Hasil Interaksi',
      render: (log) => {
        const badgeColors: Record<string, string> = {
          AKTIF_KIRIM_LEAD: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          JANJI_KIRIM: 'bg-blue-950 text-blue-300 border-blue-800',
          TIDAK_AKTIF: 'bg-rose-950 text-rose-300 border-rose-800',
          BELUM_DIHUBUNGI: 'bg-zinc-800 text-zinc-300 border-zinc-700'
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColors[log.hasil_kontak] || 'bg-zinc-800 text-zinc-300'}`}>
            {log.hasil_kontak.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      key: 'komitmen_lead',
      header: 'Komitmen Lead',
      render: (log) => (
        <span className="font-bold text-white font-mono">
          {log.komitmen_lead} Aplikasi
        </span>
      )
    },
    {
      key: 'catatan',
      header: 'Catatan Lapangan',
      render: (log) => <span className="text-[#a3adc2] truncate max-w-[200px] inline-block">{log.catatan || '-'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Input Follow Up Box */}
      <div className="p-5 rounded-2xl bg-[#12151f] border border-[#232734] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Catat Aktivitas Follow Up Mediator</h3>
              <p className="text-[11px] text-[#8e96a8]">Laporkan hasil pembinaan dan komitmen prospek mediator</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Aktivitas follow-up berhasil disimpan!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Mediator Search & Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-white">Pilih Mediator <strong className="text-rose-400">*</strong></label>
            {selectedMed ? (
              <div className="p-3 bg-[#181c28] border border-blue-500/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-white">{selectedMed.kd_med}</span>
                    <span className="font-semibold text-blue-300">{selectedMed.nama_mediator}</span>
                  </div>
                  <div className="text-[11px] text-[#8e96a8] font-mono mt-0.5">
                    {selectedMed.no_tlpn} • Posko {selectedMed.kd_posko}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMed(null)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#222838] hover:bg-[#2c3345] text-white"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5c6479]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik KD MED atau Nama Mediator..."
                  className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl pl-9 pr-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />

                {searchQuery && matchedMediators.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-[#232734] rounded-xl divide-y divide-[#1f2330] bg-[#0d0e12] shadow-lg">
                    {matchedMediators.map((med, idx) => (
                      <button
                        key={med.firestore_id || med.temp_id || `${med.kd_med}_${idx}`}
                        type="button"
                        onClick={() => handleSelectMediator(med)}
                        className="w-full p-2.5 text-left text-xs hover:bg-[#181b24] transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="font-mono font-bold text-blue-400 mr-2">{med.kd_med}</span>
                          <span className="text-white">{med.nama_mediator}</span>
                        </div>
                        <span className="text-[11px] text-[#717b94] font-mono">{med.no_tlpn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-white">Hasil Interaksi</label>
              <select
                value={hasilKontak}
                onChange={(e) => setHasilKontak(e.target.value)}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="AKTIF_KIRIM_LEAD">AKTIF KIRIM LEAD</option>
                <option value="JANJI_KIRIM">JANJI KIRIM MINGGU INI</option>
                <option value="TIDAK_AKTIF">TIDAK AKTIF SEMENTARA</option>
                <option value="NOMOR_TIDAK_AKTIF">NOMOR TIDAK DAPAT DIHUBUNGI</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-white">Target Komitmen Prospek (Unit)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={komitmenLead}
                onChange={(e) => setKomitmenLead(Number(e.target.value))}
                className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-white">Catatan Pembinaan</label>
            <textarea
              rows={2}
              required
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Mediator sedang memprospek 2 calon nasabah motor di Malalayang."
              className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedMed}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Simpan Catatan Follow Up</span>
            </button>
          </div>
        </form>
      </div>

      {/* History Table */}
      <DataTable
        data={logs}
        columns={columns}
        keyExtractor={(log) => log.id}
        title="Riwayat Follow Up Mediator"
        subtitle="Log komunikasi dan pemeliharaan hubungan mitra mediator"
      />
    </div>
  );
};
