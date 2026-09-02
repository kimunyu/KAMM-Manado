/**
 * Central Formatting Utilities for KAMM Manado Super App
 * Timezone: GMT+8 (WITA / Asia/Makassar)
 * Standard Date Format: dd/mm/yy or dd/mm/yy HH:mm
 * Standard Currency: Rp X.XXX.XXX
 */

/**
 * Format a Date or ISO string to GMT+8 (WITA) date format: dd/mm/yy
 * Example: "2026-09-02T14:30:00Z" -> "02/09/26"
 * With time: "02/09/26 22:30 WITA"
 */
export function formatDateWita(
  dateInput: string | Date | null | undefined, 
  includeTime: boolean = false
): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  // Use Intl.DateTimeFormat targeting GMT+8 (Asia/Makassar / Manado)
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    ...(includeTime ? {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    } : {})
  });

  const formatted = formatter.format(date);
  
  if (includeTime) {
    // id-ID format produces dd/mm/yy, HH.mm or dd/mm/yy HH.mm
    return formatted.replace(',', '').replace('.', ':') + ' WITA';
  }
  
  return formatted;
}

/**
 * Format timestamp with full date, hours, minutes and seconds in WITA
 * Format: dd/mm/yy HH:mm:ss WITA
 */
export function formatDateTimeWita(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(date).replace(',', '').replace(/\./g, ':') + ' WITA';
}

/**
 * Get current time in WITA formatted string
 */
export function getCurrentWitaString(): string {
  return formatDateTimeWita(new Date());
}

/**
 * Currency Formatter: Rp 1.500.000
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  if (isNaN(num)) return 'Rp 0';

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Number Formatter with thousand separators: 1.500
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID').format(val);
}

/**
 * Relative time in Indonesian (e.g., '5 menit lalu', '2 jam lalu', 'Kemarin', '3 hari lalu')
 */
export function formatRelativeTimeWita(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  if (diffSec < 172800) return 'Kemarin';
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} hari lalu`;

  return formatDateWita(date, false);
}
