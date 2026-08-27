import { FUCategory } from '../types';

export function getDaysDifference(dateString: string | null | undefined, referenceDate = new Date('2026-08-25T23:59:59')): number | null {
  if (!dateString) return null;
  const targetDate = new Date(dateString);
  if (isNaN(targetDate.getTime())) return null;
  
  // Calculate difference in whole days
  const diffTime = referenceDate.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function categorizeFU(tgl_akhir_fu: string | null | undefined, referenceDate = new Date('2026-08-25T23:59:59')): FUCategory {
  if (!tgl_akhir_fu) {
    return 'BELUM_FU';
  }

  const days = getDaysDifference(tgl_akhir_fu, referenceDate);
  if (days === null) {
    return 'BELUM_FU';
  }

  if (days > 30) {
    return 'LEBIH_30_HARI';
  }
  if (days > 15) {
    return 'LEBIH_15_HARI';
  }
  return 'SUDAH_FU';
}

export function getFUCategoryLabel(cat: FUCategory): string {
  switch (cat) {
    case 'BELUM_FU':
      return 'Belum di FU';
    case 'LEBIH_30_HARI':
      return 'FU > 30 Hari';
    case 'LEBIH_15_HARI':
      return 'FU > 15 Hari';
    case 'SUDAH_FU':
      return 'Sudah di FU (≤15 Hari)';
  }
}

export function getFUCategoryBadge(cat: FUCategory): { text: string; bg: string; textCol: string; border: string } {
  switch (cat) {
    case 'BELUM_FU':
      return {
        text: 'Belum di FU',
        bg: 'bg-rose-950/50',
        textCol: 'text-rose-300',
        border: 'border-rose-800/60'
      };
    case 'LEBIH_30_HARI':
      return {
        text: '> 30 Hari Lalu',
        bg: 'bg-amber-950/50',
        textCol: 'text-amber-300',
        border: 'border-amber-800/60'
      };
    case 'LEBIH_15_HARI':
      return {
        text: '> 15 Hari Lalu',
        bg: 'bg-blue-950/50',
        textCol: 'text-blue-300',
        border: 'border-blue-800/60'
      };
    case 'SUDAH_FU':
      return {
        text: 'Sudah di FU (Aktif)',
        bg: 'bg-emerald-950/50',
        textCol: 'text-emerald-300',
        border: 'border-emerald-800/60'
      };
  }
}

export function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatDateTimeIndo(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '-';
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return dateTimeStr;
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
