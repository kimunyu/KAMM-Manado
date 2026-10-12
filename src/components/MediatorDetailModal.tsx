import React from 'react';
import { MediatorKontrak, FULog } from '../types';
import { formatDateIndo, formatDateTimeIndo, categorizeFU, getFUCategoryBadge } from '../utils/dateUtils';
import { DatabaseService } from '../services/storage';
import { 
  Building2, 
  Phone, 
  Calendar, 
  User, 
  ShieldCheck, 
  PhoneCall, 
  X, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  FileText
} from 'lucide-react';

interface MediatorDetailModalProps {
  mediator: MediatorKontrak | null;
  onClose: () => void;
  onSelectForFU: (kd_med: string) => void;
}

export const MediatorDetailModal: React.FC<MediatorDetailModalProps> = ({
  mediator,
  onClose,
  onSelectForFU,
}) => {
  if (!mediator) return null;

  const logs: FULog[] = DatabaseService.getFULogsByMediator(mediator.kd_med);
  const fuCat = categorizeFU(mediator.tgl_akhir_fu);
  const fuBadge = getFUCategoryBadge(fuCat);

  const getCleanWaPhone = (phone?: string) => {
    if (!phone) return '';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13151c] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#232734] space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#232734]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-blue-950/70 text-blue-300 border border-blue-800/60">
                {mediator.kd_med}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                mediator.status === 'AKTIF'
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
              }`}>
                {mediator.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#f1f3f7] mt-1">
              {mediator.nama_mediator}
            </h2>
            <p className="text-xs text-[#8e96a8]">
              {mediator.kd_cabang} • {mediator.kd_posko}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dossier Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Kontak Card */}
          <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] space-y-2">
            <span className="font-bold text-[#8e96a8] uppercase tracking-wider text-[10px] block">
              Kontak & Komunikasi
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[#8e96a8]">No. Telepon / WA:</span>
              <span className="font-semibold text-[#f1f3f7]">{mediator.no_tlpn}</span>
            </div>
            {mediator.no_tlpn && (
              <a
                href={`https://wa.me/${getCleanWaPhone(mediator.no_tlpn)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors mt-1"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Chat via WhatsApp</span>
              </a>
            )}
          </div>

          {/* Follow-Up Status */}
          <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] space-y-2">
            <span className="font-bold text-[#8e96a8] uppercase tracking-wider text-[10px] block">
              Status Follow-Up (FU)
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[#8e96a8]">TGL Akhir FU:</span>
              <span className="font-bold text-[#f1f3f7]">{formatDateIndo(mediator.tgl_akhir_fu)}</span>
            </div>
            <div>
              <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${fuBadge.bg} ${fuBadge.textCol} ${fuBadge.border}`}>
                {fuBadge.text}
              </span>
            </div>
          </div>

          {/* Penugasan & AO */}
          <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] space-y-1.5">
            <span className="font-bold text-[#8e96a8] uppercase tracking-wider text-[10px] block">
              Penugasan Operasional
            </span>
            <div className="flex justify-between">
              <span className="text-[#8e96a8]">Cabang:</span>
              <span className="font-semibold text-[#c2c7d0]">{mediator.kd_cabang}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8e96a8]">Posko:</span>
              <span className="font-semibold text-[#c2c7d0]">{mediator.kd_posko}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8e96a8]">Kode AO:</span>
              <span className="font-semibold text-[#c2c7d0]">{mediator.kd_ao || '-'}</span>
            </div>
          </div>

          {/* Log Pendaftaran & Validasi */}
          <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] space-y-1.5">
            <span className="font-bold text-[#8e96a8] uppercase tracking-wider text-[10px] block">
              Riwayat Registrasi
            </span>
            <div className="flex justify-between">
              <span className="text-[#8e96a8]">Didaftarkan oleh:</span>
              <span className="font-medium text-[#c2c7d0]">{mediator.created_by_user || '-'} ({mediator.created_by_role || '-'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8e96a8]">Tgl Registrasi:</span>
              <span className="font-medium text-[#c2c7d0]">{formatDateTimeIndo(mediator.created_at)}</span>
            </div>
            {mediator.validated_by && (
              <div className="flex justify-between text-emerald-400">
                <span>Divalidasi oleh:</span>
                <span className="font-bold">{mediator.validated_by}</span>
              </div>
            )}
          </div>
        </div>

        {mediator.catatan_admin && (
          <div className="p-3.5 bg-[#0d0e12] rounded-xl border border-[#232734] text-xs">
            <span className="font-bold text-[#8e96a8] block mb-1">Catatan Dokumen / Admin:</span>
            <p className="text-[#c2c7d0] italic leading-relaxed">"{mediator.catatan_admin}"</p>
          </div>
        )}

        {/* Historical FU Logs Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#f1f3f7] uppercase tracking-wider flex items-center space-x-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-blue-400" />
              <span>Riwayat Follow-Up Mediator ({logs.length} Log)</span>
            </h4>
            <button
              onClick={() => {
                onClose();
                onSelectForFU(mediator.kd_med);
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>+ Input FU Baru</span>
            </button>
          </div>

          <div className="border border-[#232734] rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-[#0d0e12]">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8e96a8]">
                Belum ada rekaman log follow-up untuk mediator ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e1015] border-b border-[#232734] text-[10px] font-bold text-[#8e96a8] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal FU</th>
                    <th className="py-2.5 px-3">Hasil FU</th>
                    <th className="py-2.5 px-3">Catatan Komunikasi</th>
                    <th className="py-2.5 px-3">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2330]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#181b24]">
                      <td className="py-2.5 px-3 font-mono text-[#8e96a8] whitespace-nowrap">
                        {formatDateTimeIndo(log.tgl_fu)}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-950/70 text-blue-300 border border-blue-800/60 font-semibold">
                          {log.hasil_fu}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#c2c7d0] max-w-xs truncate" title={log.catatan_fu}>
                        "{log.catatan_fu}"
                      </td>
                      <td className="py-2.5 px-3 text-[#8e96a8] whitespace-nowrap">
                        {log.user_fu}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-[#232734] flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onSelectForFU(mediator.kd_med);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-md shadow-blue-950/40"
          >
            <PhoneCall className="h-4 w-4" />
            <span>Input Follow-Up Sekarang</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
