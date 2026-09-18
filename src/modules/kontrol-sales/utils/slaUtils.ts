import { StatusSalesRecord } from '../types';
import { UserRole } from '../../../types';

/**
 * Returns current Date in WITA timezone (UTC+8) normalized to midnight (00:00:00)
 */
export function getWitaToday(): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.format(new Date()).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  } catch {
    // Fallback if Intl fails
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
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
 * Parses DD/MM/YYYY or YYYY-MM-DD string into a Date object normalized to midnight (00:00:00)
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

  // Format with dash: DD-MM-YYYY or YYYY-MM-DD
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      let y: number;
      let m: number;
      let d: number;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        // DD-MM-YYYY
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
      }
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const parsed = new Date(y, m, d, 0, 0, 0, 0);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }

  // Fallback to native parsing
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
  }

  return null;
}

/**
 * Menghitung selisih hari kerja (Senin - Jumat) antara 2 tanggal.
 * Hari Sabtu (6) dan Minggu (0) TIDAK dihitung.
 */
export function getWorkingDaysDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 0, 0, 0, 0);

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
 * Jika status masih pending (SUBMISS atau BELUM SELESAI) DAN selisih hari kerja sudah > 2 hari kerja,
 * tampilkan Badge Tambahan: HOLD DANA.
 */
export function checkHoldDanaSla(
  tglCairStr: string,
  status: StatusSalesRecord | string | undefined | null,
  refDate: Date = getWitaToday()
): { isHoldDana: boolean; workingDays: number } {
  const normalizedStatus = (status || '').trim().toUpperCase();
  if (normalizedStatus !== 'SUBMISS' && normalizedStatus !== 'BELUM SELESAI') {
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

/**
 * Mengekstrak hanya hari/tanggal (format 2 digit "DD", 01 s/d 31)
 * Mampu membaca format baru "DD" maupun format warisan "DD/MM/YYYY" atau "YYYY-MM-DD"
 */
export function extractDayDD(val: string | number | undefined | null): string {
  if (!val && val !== 0) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Format DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    const d = parseInt(parts[0], 10);
    if (!isNaN(d) && d >= 1 && d <= 31) {
      return String(d).padStart(2, '0');
    }
  }

  // Format ISO YYYY-MM-DD
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && d >= 1 && d <= 31) return String(d).padStart(2, '0');
    } else {
      // DD-MM-YYYY
      const d = parseInt(parts[0], 10);
      if (!isNaN(d) && d >= 1 && d <= 31) return String(d).padStart(2, '0');
    }
  }

  // Format angka murni atau string 2-digit DD
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 31) {
    return String(num).padStart(2, '0');
  }

  return str.padStart(2, '0');
}

/**
 * Menentukan apakah konsumen memiliki status/atribut "UBAH JT":
 * Membandingkan hari pada TGL CAIR dengan TGL JT.
 * Jika hari berbeda, maka konsumen berstatus UBAH JT.
 */
export function isUbahJt(tglCairStr: string | undefined | null, tglJtStr: string | undefined | null): boolean {
  if (!tglCairStr || !tglJtStr) return false;
  const cairDay = extractDayDD(tglCairStr);
  const jtDay = extractDayDD(tglJtStr);
  if (!cairDay || !jtDay) return false;
  return cairDay !== jtDay;
}

