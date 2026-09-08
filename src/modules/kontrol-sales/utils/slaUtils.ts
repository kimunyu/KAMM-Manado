import { StatusSalesRecord } from '../types';
import { UserRole } from '../../../types';

/**
 * Returns current Date in WITA timezone (UTC+8)
 */
export function getWitaToday(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (3600000 * 8));
}

/**
 * Format Date to DD/MM/YYYY
 */
export function formatToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses DD/MM/YYYY string into a Date object normalized to midnight (00:00:00)
 */
export function parseDDMMYYYY(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  
  // Format DD/MM/YYYY
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const parsed = new Date(y, m, d, 0, 0, 0, 0);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }

  // Fallback ISO YYYY-MM-DD
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const parsed = new Date(y, m, d, 0, 0, 0, 0);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }

  return null;
}

/**
 * Menghitung selisih hari kerja (Senin - Jumat) antara 2 tanggal.
 * Hari Sabtu (6) dan Minggu (0) TIDAK dihitung.
 */
export function getWorkingDaysDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (end <= start) {
    return 0;
  }

  let workingDays = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/**
 * Logika SLA & Status Tambahan HOLD DANA (Dynamic Calculation)
 * Jika status masih SUBMISS DAN selisih hari kerja sudah > 2 hari kerja,
 * tampilkan Badge Tambahan: HOLD DANA.
 */
export function checkHoldDanaSla(
  tglCairStr: string,
  status: StatusSalesRecord,
  refDate: Date = getWitaToday()
): { isHoldDana: boolean; workingDays: number } {
  if (status !== 'SUBMISS') {
    return { isHoldDana: false, workingDays: 0 };
  }

  const cairDate = parseDDMMYYYY(tglCairStr);
  if (!cairDate) {
    return { isHoldDana: false, workingDays: 0 };
  }

  const workingDays = getWorkingDaysDifference(cairDate, refDate);
  const isHoldDana = workingDays > 2;

  return { isHoldDana, workingDays };
}

/**
 * Pembatasan Rentang Tanggal Tampilan Data:
 * - ADM, KAOPS, ADM_DE, KACAB: Hanya diizinkan melihat data konsumen dengan TGL CAIR
 *   pada bulan berjalan + 10 hari pertama di bulan berikutnya.
 * - RM dan SUPER_ADMIN: Tidak ada pembatasan tanggal.
 */
export function isDateInAllowedWindow(
  tglCairStr: string,
  userRole?: UserRole | null,
  refDate: Date = getWitaToday()
): boolean {
  if (!userRole) return false;
  // Role Nasional (SUPER_ADMIN, RM, ADM_DE): Akses penuh tanpa batasan rentang tanggal
  if (userRole === 'SUPER_ADMIN' || userRole === 'RM' || userRole === 'ADM_DE') {
    return true;
  }

  const cairDate = parseDDMMYYYY(tglCairStr);
  if (!cairDate) return false;

  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0 - 11

  // Awal window: Hari pertama bulan berjalan 00:00:00
  const windowStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

  // Akhir window: Tanggal 10 bulan berikutnya 23:59:59
  const windowEnd = new Date(currentYear, currentMonth + 1, 10, 23, 59, 59, 999);

  return cairDate >= windowStart && cairDate <= windowEnd;
}

/**
 * Mendapatkan string rentang tanggal yang diperbolehkan untuk tampilan pengguna
 */
export function getAllowedWindowLabel(refDate: Date = getWitaToday()): string {
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentMonthName = monthNames[currentMonth];
  const nextMonthName = monthNames[(currentMonth + 1) % 12];
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  return `${currentMonthName} ${currentYear} s/d 10 ${nextMonthName} ${nextYear}`;
}

/**
 * Format nomor WhatsApp ke format internasional (62...)
 */
export function cleanWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

/**
 * Helper getter URL WhatsApp (https://wa.me/62...)
 */
export function getWhatsAppUrl(phone: string, text?: string): string {
  const clean = cleanWhatsAppNumber(phone);
  if (!clean) return '#';
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${clean}${query}`;
}

/**
 * Aturan Kunci Validasi ACCEPT (1x24 Jam):
 * Jika status validasi ACCEPT sudah melewati 1x24 jam (24 jam),
 * maka aksi validasi tidak dapat dilakukan kembali (terkunci).
 */
export function checkAcceptLockStatus(record: {
  status: StatusSalesRecord;
  validated_at?: any;
  updated_at?: any;
  created_at?: any;
}): {
  isLocked: boolean;
  hoursPassed: number;
  hoursRemaining: number;
  validationDate: Date | null;
  formattedValidationDate: string;
} {
  if (record.status !== 'ACCEPT') {
    return {
      isLocked: false,
      hoursPassed: 0,
      hoursRemaining: 24,
      validationDate: null,
      formattedValidationDate: '',
    };
  }

  // Prioritas timestamp: validated_at -> updated_at -> created_at
  const timeVal = record.validated_at || record.updated_at || record.created_at;
  if (!timeVal) {
    return {
      isLocked: false,
      hoursPassed: 0,
      hoursRemaining: 24,
      validationDate: null,
      formattedValidationDate: '',
    };
  }

  let dateObj: Date;
  if (typeof timeVal === 'object' && timeVal !== null && 'seconds' in timeVal) {
    dateObj = new Date(timeVal.seconds * 1000);
  } else if (typeof timeVal === 'string' || typeof timeVal === 'number') {
    dateObj = new Date(timeVal);
  } else {
    dateObj = new Date();
  }

  if (isNaN(dateObj.getTime())) {
    return {
      isLocked: false,
      hoursPassed: 0,
      hoursRemaining: 24,
      validationDate: null,
      formattedValidationDate: '',
    };
  }

  const now = Date.now();
  const diffMs = now - dateObj.getTime();
  const hoursPassed = diffMs / (1000 * 60 * 60);
  const isLocked = hoursPassed >= 24;
  const hoursRemaining = Math.max(0, 24 - hoursPassed);

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const mins = String(dateObj.getMinutes()).padStart(2, '0');
  const formattedValidationDate = `${day}/${month}/${year} ${hours}:${mins}`;

  return {
    isLocked,
    hoursPassed,
    hoursRemaining,
    validationDate: dateObj,
    formattedValidationDate,
  };
}
