import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { SalesControlRecord } from '../types';
import { formatLaporanCabangWA, copyToClipboard } from '../utils/whatsappFormatter';
import { Posko } from '../../../types';

interface ModalCopyWaCabangProps {
  isOpen: boolean;
  onClose: () => void;
  kdCabang: string;
  namaCabang: string;
  records: SalesControlRecord[];
  allPosko: Posko[];
}

export const ModalCopyWaCabang: React.FC<ModalCopyWaCabangProps> = ({
  isOpen,
  onClose,
  kdCabang,
  namaCabang,
  records,
  allPosko,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const { text: formattedText, pendingCount } = formatLaporanCabangWA({
    kdCabang,
    namaCabang,
    records,
    allPosko,
  });

  const handleCopy = async () => {
    const success = await copyToClipboard(formattedText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const openWhatsAppWeb = () => {
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(formattedText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="modal-copy-wa-cabang"
        className="bg-[#141721] border border-[#272d3e] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232734] bg-[#181a24]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Format WA Rekap Cabang:</span>
                <span className="text-emerald-400">{namaCabang || kdCabang}</span>
                <span className="text-[10px] font-mono text-[#8e96a8]">({kdCabang})</span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Merangkum seluruh posko di bawah cabang ini • {pendingCount} Konsumen Belum Selesai / Hold
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#8e96a8] hover:text-white p-1 rounded-lg hover:bg-[#232734] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {pendingCount > 0 ? (
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Memfilter <strong>{pendingCount} nasabah</strong> (SUBMISS, BELUM SELESAI, atau HOLD DANA) tanpa Nomor WA.
                </span>
              </div>
              <span className="text-[11px] bg-amber-900/60 px-2 py-0.5 rounded font-bold">
                Auto-Filtered
              </span>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Seluruh pencairan di Cabang {namaCabang} telah berstatus ACCEPT (Nihil data tertahan).</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#8e96a8] flex items-center space-x-1.5">
                <Building2 className="h-3.5 w-3.5 text-purple-400" />
                <span>Teks Salinan WhatsApp (Siap Kirim ke Grup Koordinasi Cabang):</span>
              </span>
              <span className="text-[11px] text-[#8e96a8] font-mono">
                {formattedText.length} karakter
              </span>
            </div>
            <pre className="p-4 bg-[#0d0f15] border border-[#232734] rounded-xl text-xs text-[#d1d7e0] font-mono whitespace-pre-wrap overflow-x-auto max-h-72 leading-relaxed selection:bg-purple-900 selection:text-white">
              {formattedText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#232734] bg-[#181a24] flex items-center justify-between">
          <button
            type="button"
            onClick={openWhatsAppWeb}
            className="px-4 py-2.5 bg-[#232734] hover:bg-[#2d3244] text-[#c2c7d0] hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Buka WhatsApp Web</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#8e96a8] hover:text-white hover:bg-[#232734] transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center space-x-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 shadow-emerald-950/40 ring-2 ring-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Salin Teks WhatsApp Cabang</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
