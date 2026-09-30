import React from 'react';
import { MediatorKontrak } from '../types';
import { X, User, Phone, MapPin, Building2, CreditCard, Calendar, Hash, FileText } from 'lucide-react';

interface MediatorDetailModalProps {
  isOpen?: boolean;
  onClose: () => void;
  mediator: MediatorKontrak | null;
  onSelectForFU?: (kd_med: string) => void;
}

export const MediatorDetailModal: React.FC<MediatorDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  mediator,
  onSelectForFU
}) => {
  if (isOpen !== undefined && !isOpen) return null;
  if (!mediator) return null;


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Detail Mediator Kontrak</h3>
              <p className="text-[11px] text-[#8e96a8] font-mono">{mediator.kd_med}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8e96a8] hover:text-white hover:bg-[#202534] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Header Card */}
          <div className="p-4 rounded-xl bg-[#161a26] border border-[#232734] flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-white">{mediator.nama_mediator}</h4>
              <p className="text-[11px] text-[#8e96a8] mt-0.5">
                Tanggal Gabung: <strong>{mediator.tanggal_bergabung}</strong>
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              mediator.status === 'AKTIF' 
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                : mediator.status === 'PENDING'
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}>
              {mediator.status}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <Phone className="h-3 w-3 text-blue-400" />
                <span>Nomor HP / WA</span>
              </span>
              <div className="font-mono font-bold text-white">{mediator.no_tlpn}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <Hash className="h-3 w-3 text-blue-400" />
                <span>Nomor KTP</span>
              </span>
              <div className="font-mono text-white">{mediator.no_ktp || '-'}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <Building2 className="h-3 w-3 text-blue-400" />
                <span>Posko</span>
              </span>
              <div className="font-bold text-white font-mono">{mediator.kd_posko}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <User className="h-3 w-3 text-blue-400" />
                <span>AO Pembina</span>
              </span>
              <div className="font-bold text-white font-mono">{mediator.kd_ao || '-'}</div>
            </div>
          </div>

          {/* Alamat */}
          <div className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
            <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
              <MapPin className="h-3 w-3 text-blue-400" />
              <span>Alamat Domisili</span>
            </span>
            <p className="text-white leading-relaxed">{mediator.alamat || 'Belum diisi'}</p>
          </div>

          {/* Rekening Bank */}
          <div className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] space-y-2">
            <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
              <CreditCard className="h-3 w-3 text-blue-400" />
              <span>Informasi Rekening Bank</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#8e96a8]">Bank:</span> <strong className="text-white">{mediator.nama_bank || '-'}</strong>
              </div>
              <div>
                <span className="text-[#8e96a8]">No. Rek:</span> <strong className="text-white font-mono">{mediator.no_rekening || '-'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[#8e96a8]">Atas Nama:</span> <strong className="text-white">{mediator.atas_nama_rekening || '-'}</strong>
              </div>
            </div>
          </div>

          {/* Catatan */}
          {mediator.catatan && (
            <div className="p-3.5 rounded-xl bg-[#161a26] border border-[#232734] space-y-1">
              <span className="text-[10px] text-[#8e96a8] flex items-center space-x-1">
                <FileText className="h-3 w-3 text-blue-400" />
                <span>Catatan</span>
              </span>
              <p className="text-[#a3adc2]">{mediator.catatan}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#232734] bg-[#161a26]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#202534] hover:bg-[#282f42] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
