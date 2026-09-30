import React, { useState } from 'react';
import { MediatorKontrak, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { DataTable, Column } from './DataTable';
import { CheckSquare, ShieldCheck, Check, X, AlertTriangle } from 'lucide-react';

interface ValidasiKdMedProps {
  mediators: MediatorKontrak[];
  currentUser?: User;
  onUpdateStatus?: (id: string, status: MediatorKontrak['status'], newKdMed?: string) => void;
  onValidationSuccess?: () => void;
  onNavigate?: (tab: string) => void;
  onEditMediator?: (med: MediatorKontrak) => void;
}

export const ValidasiKdMed: React.FC<ValidasiKdMedProps> = ({
  mediators,
  currentUser: propUser,
  onUpdateStatus,
  onValidationSuccess,
  onNavigate,
  onEditMediator
}) => {
  const { currentUser: authUser } = useAuth();
  const currentUser = propUser || authUser || ({ role: 'SUPER_ADMIN', id: '', nama: '' } as User);

  const [activeStage, setActiveStage] = useState<'review' | 'activation'>('review');
  const [targetMed, setTargetMed] = useState<MediatorKontrak | null>(null);
  const [inputKdMed, setInputKdMed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review List: BELUM_AKTIF
  const reviewList = mediators.filter(m => m.status === 'BELUM_AKTIF');
  // Activation List: PENDING
  const activationList = mediators.filter(m => m.status === 'PENDING');

  const currentList = activeStage === 'review' ? reviewList : activationList;

  const handleOpenActivation = (med: MediatorKontrak) => {
    setTargetMed(med);
    // Auto-generate suggestion: MED-00X
    const maxNumber = mediators
      .map(m => {
        const match = m.kd_med.match(/^MED-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .reduce((max, curr) => Math.max(max, curr), 0);

    const nextCode = `MED-${String(maxNumber + 1).padStart(3, '0')}`;
    setInputKdMed(nextCode);
  };

  const handleApproveReview = (med: MediatorKontrak) => {
    onUpdateStatus(med.firestore_id || med.kd_med || med.temp_id || '', 'PENDING');
  };

  const handleReject = (med: MediatorKontrak) => {
    onUpdateStatus(med.firestore_id || med.kd_med || med.temp_id || '', 'DITOLAK');
  };

  const handleConfirmActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMed || !inputKdMed.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onUpdateStatus(
        targetMed.firestore_id || targetMed.kd_med || targetMed.temp_id || '',
        'AKTIF',
        inputKdMed.trim().toUpperCase()
      );
      setIsSubmitting(false);
      setTargetMed(null);
    }, 300);
  };

  const columns: Column<MediatorKontrak>[] = [
    {
      key: 'kd_med',
      header: 'Kode Saat Ini',
      sortable: true,
      render: (m) => <span className="font-mono text-white font-bold">{m.kd_med}</span>
    },
    {
      key: 'nama_mediator',
      header: 'Nama Mediator',
      sortable: true,
      render: (m) => (
        <div>
          <div className="font-semibold text-white">{m.nama_mediator}</div>
          <div className="text-[11px] text-[#8e96a8] font-mono">{m.no_tlpn}</div>
        </div>
      )
    },
    {
      key: 'kd_posko',
      header: 'Posko',
      render: (m) => <span className="font-mono text-white">{m.kd_posko}</span>
    },
    {
      key: 'kd_ao',
      header: 'AO Pembina',
      render: (m) => <span className="font-mono text-[#8e96a8]">{m.kd_ao || '-'}</span>
    },
    {
      key: 'tanggal_bergabung',
      header: 'Tgl Daftar',
      sortable: true
    },
    {
      key: 'actions',
      header: 'Tindakan',
      className: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end space-x-2">
          {activeStage === 'review' ? (
            <>
              <button
                type="button"
                onClick={() => handleReject(m)}
                className="px-2.5 py-1 rounded-lg border border-rose-800 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
              >
                Tolak
              </button>
              <button
                type="button"
                onClick={() => handleApproveReview(m)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center space-x-1"
              >
                <Check className="h-3 w-3" />
                <span>Verifikasi Berkas</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenActivation(m)}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center space-x-1"
            >
              <ShieldCheck className="h-3 w-3" />
              <span>Tetapkan KD &amp; Aktifkan</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header Tabs */}
      <div className="flex items-center space-x-3 p-2 bg-[#12151f] border border-[#232734] rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveStage('review')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeStage === 'review'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
          }`}
        >
          <span>Tahap 1: Verifikasi Berkas Draf ({reviewList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStage('activation')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeStage === 'activation'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-[#8e96a8] hover:text-white hover:bg-[#161a26]'
          }`}
        >
          <span>Tahap 2: Input KD MED &amp; Aktivasi ({activationList.length})</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        data={currentList}
        columns={columns}
        keyExtractor={(med, idx) => med.firestore_id || med.temp_id || `${med.kd_med}_${idx}`}
        title={activeStage === 'review' ? 'Verifikasi Berkas Draf (Admin)' : 'Penetapan KD MED & Aktivasi (KAOPS)'}
        subtitle={
          activeStage === 'review'
            ? 'Periksa kelengkapan KTP dan nomor telepon sebelum diteruskan ke KAOPS'
            : 'Masukkan nomor kode KD MED resmi dan aktifkan mediator ke jaringan KAMM Manado'
        }
      />

      {/* Modal Aktivasi KD MED */}
      {targetMed && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white">Penetapan Kode KD MED Resmi</h3>
              </div>
              <button onClick={() => setTargetMed(null)} className="text-[#8e96a8] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmActivation} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-[#161a26] border border-[#232734] rounded-xl space-y-1">
                <div className="text-[11px] text-[#8e96a8]">Nama Mediator:</div>
                <div className="text-sm font-bold text-white">{targetMed.nama_mediator}</div>
                <div className="text-[11px] text-[#8e96a8]">Posko: <strong className="text-white">{targetMed.kd_posko}</strong> • Telp: <strong className="text-white font-mono">{targetMed.no_tlpn}</strong></div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-white">Masukkan Nomor KD MED Resmi <strong className="text-rose-400">*</strong></label>
                <input
                  type="text"
                  required
                  value={inputKdMed}
                  onChange={(e) => setInputKdMed(e.target.value.toUpperCase())}
                  placeholder="Contoh: MED-015"
                  className="w-full bg-[#181c28] border border-[#2c3345] rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-[#8e96a8]">
                  Kode ini akan menjadi identitas permanen mediator dalam pencatatan prospek dan fee.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTargetMed(null)}
                  className="px-4 py-2 rounded-xl border border-[#2c3345] text-[#8e96a8] hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? 'Mengaktifkan...' : 'Konfirmasi & Aktifkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
