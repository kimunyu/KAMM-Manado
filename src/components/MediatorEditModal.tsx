import React, { useState } from 'react';
import { MediatorKontrak, MediatorStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { Edit3, CheckCircle2, AlertCircle, X, Save, Building2 } from 'lucide-react';

interface MediatorEditModalProps {
  mediator: MediatorKontrak | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const MediatorEditModal: React.FC<MediatorEditModalProps> = ({ mediator, onClose, onSuccess }) => {
  const { allCabang, allPosko, currentUser } = useAuth();

  if (!mediator) return null;

  const [namaMediator, setNamaMediator] = useState(mediator.nama_mediator);
  const [noTlpn, setNoTlpn] = useState(mediator.no_tlpn);
  const [kdAo, setKdAo] = useState(mediator.kd_ao || '');
  const [kdCabang, setKdCabang] = useState(mediator.kd_cabang);
  const [kdPosko, setKdPosko] = useState(mediator.kd_posko || '');
  const [status, setStatus] = useState<MediatorStatus>(mediator.status);
  const [catatanAdmin, setCatatanAdmin] = useState(mediator.catatan_admin || '');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availablePosko = allPosko.filter(p => !kdCabang || p.kd_cabang.toUpperCase() === kdCabang.toUpperCase());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaMediator.trim()) {
      setFeedback({ type: 'error', message: 'Nama mediator wajib diisi!' });
      return;
    }
    if (namaMediator.trim().length > 100) {
      setFeedback({ type: 'error', message: 'Nama mediator melebihi 100 karakter!' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = DatabaseService.updateMediator({
      kd_med: mediator.kd_med,
      nama_mediator: namaMediator.trim(),
      no_tlpn: noTlpn.trim(),
      kd_ao: kdAo.trim(),
      kd_cabang: kdCabang,
      kd_posko: kdPosko,
      status: status,
      catatan_admin: catatanAdmin.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13151c] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-950/70 text-amber-300 border border-amber-800/60">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#f1f3f7]">
                Koreksi / Edit Data Mediator
              </h3>
              <p className="text-xs text-[#8e96a8] font-mono">Kode: {mediator.kd_med}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
                : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-[#c2c7d0]">Nama Mediator (Max 100) <span className="text-rose-400">*</span></label>
              <span className="text-[11px] text-[#6b7280] font-mono">{namaMediator.length}/100</span>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              value={namaMediator}
              onChange={(e) => setNamaMediator(e.target.value)}
              className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#c2c7d0] mb-1">No. Telepon / WA <span className="text-rose-400">*</span></label>
              <input
                type="text"
                required
                value={noTlpn}
                onChange={(e) => setNoTlpn(e.target.value)}
                className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-bold text-[#c2c7d0] mb-1">Kode AO</label>
              <input
                type="text"
                value={kdAo}
                onChange={(e) => setKdAo(e.target.value)}
                className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#c2c7d0] mb-1">Cabang Penugasan</label>
              <select
                value={kdCabang}
                onChange={(e) => {
                  const newCab = e.target.value;
                  setKdCabang(newCab);
                  const pos = allPosko.filter(p => p.kd_cabang.toUpperCase() === newCab.toUpperCase());
                  if (pos.length > 0) {
                    setKdPosko(pos[0].kd_posko);
                  } else {
                    setKdPosko('');
                  }
                }}
                className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {allCabang.map((c) => (
                  <option key={c.kd_cabang} value={c.kd_cabang}>{c.kd_cabang} - {c.nama_cabang}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#c2c7d0] mb-1">Posko Operasional</label>
              <select
                value={kdPosko}
                onChange={(e) => setKdPosko(e.target.value)}
                className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">-- Kantor Cabang Utama / Posko Bebas --</option>
                {availablePosko.map((p) => (
                  <option key={p.kd_posko} value={p.kd_posko}>{p.kd_posko} - {p.nama_posko}</option>
                ))}
                {kdPosko && !availablePosko.some(p => p.kd_posko.toUpperCase() === kdPosko.toUpperCase()) && (
                  <option value={kdPosko}>{kdPosko} (Tersimpan)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#c2c7d0] mb-1">Status Mediator</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MediatorStatus)}
              className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl font-bold"
            >
              <option value="AKTIF">AKTIF (KD MED Resmi)</option>
              <option value="PENDING">PENDING (Diajukan)</option>
              <option value="INAKTIF">INAKTIF (Nonaktif)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#c2c7d0] mb-1">Catatan Koreksi Data</label>
            <textarea
              rows={2}
              value={catatanAdmin}
              onChange={(e) => setCatatanAdmin(e.target.value)}
              className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-save-edit-mediator"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-md shadow-amber-950/40 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
