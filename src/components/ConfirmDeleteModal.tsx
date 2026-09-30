import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Hapus',
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#272d3e] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#232734] bg-[#161a26] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-[#8e96a8] hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 text-xs text-[#a3adc2] leading-relaxed">
          {message}
        </div>

        <div className="px-5 py-3 border-t border-[#232734] bg-[#161a26]/50 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 rounded-xl border border-[#2c3345] hover:bg-[#181c28] text-xs font-semibold text-[#8e96a8] hover:text-white transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            {isDeleting ? 'Menghapus...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
