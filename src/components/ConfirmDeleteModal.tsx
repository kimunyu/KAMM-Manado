import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName?: string;
  itemCode?: string;
  description?: string;
  confirmButtonText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  itemCode,
  description,
  confirmButtonText = 'Hapus Sekarang',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#13151c] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-900/50 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/80">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#f1f3f7]">{title}</h3>
              <p className="text-xs text-[#8e96a8] mt-0.5">Konfirmasi Penghapusan Permanen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item Info Preview */}
        {(itemName || itemCode) && (
          <div className="p-3 bg-[#0d0e12] rounded-xl border border-[#272d3e] flex items-center space-x-3">
            {itemCode && (
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/50">
                {itemCode}
              </span>
            )}
            {itemName && (
              <span className="text-xs font-semibold text-[#f1f3f7] truncate">
                {itemName}
              </span>
            )}
          </div>
        )}

        {/* Description Warning */}
        <p className="text-xs text-[#c2c7d0] leading-relaxed">
          {description || 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.'}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#232734]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/60 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{confirmButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
