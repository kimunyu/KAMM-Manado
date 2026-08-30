import { MediatorKontrak, MediatorStatus, StatusKreditLunas } from '../types';

export interface ParsedMediatorRow {
  kd_med: string;
  nama_mediator: string;
  no_tlpn: string;
  kd_cabang: string;
  kd_posko: string;
  kd_ao: string;
  status: MediatorStatus;
  tgl_akhir_fu?: string | null;
  catatan_admin?: string;
  isValid: boolean;
  validationError?: string;
}

export interface ParsedExCustomerRow {
  no_psb: string;
  kd_cab: string;
  kd_pos: string;
  nama_konsumen: string;
  no_telepon: string;
  tgl_bpkb_sdk: string;
  status_kredit_lunas: StatusKreditLunas;
  isValid: boolean;
  validationError?: string;
}

export function parseCSVToMediators(csvText: string): {
  rows: ParsedMediatorRow[];
  headers: string[];
  totalLines: number;
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], headers: [], totalLines: 0, errors: ['File kosong atau tidak memiliki data'] };
  }

  // Detect delimiter: comma, semicolon, tab
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';';
  } else if (headerLine.includes('\t')) {
    delimiter = '\t';
  }

  // Split line with quote awareness
  const splitLine = (line: string, delim: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const rawHeaders = splitLine(headerLine, delimiter);
  const normalizedHeaders = rawHeaders.map(h => 
    h.trim().toUpperCase().replace(/[\s_-]+/g, '')
  );

  // Map header indexes
  const getIndex = (possibleNames: string[]): number => {
    return normalizedHeaders.findIndex(h => possibleNames.includes(h));
  };

  const idxKdMed = getIndex(['KDMED', 'KODEMEDIATOR', 'KDMEDIATOR', 'IDMEDIATOR', 'KODE', 'NOKONTRAK']);
  const idxNama = getIndex(['NAMAMEDIATOR', 'NAMA', 'NAME', 'MEDIATOR', 'NAMAAGEN', 'AGEN']);
  const idxTlpn = getIndex(['NOTLPN', 'NOTELEPON', 'NOTELP', 'NOHP', 'TELEPON', 'PHONE', 'TELP', 'HP', 'WHATSAPP', 'WA']);
  const idxCabang = getIndex(['KDCABANG', 'CABANG', 'NAMACABANG', 'KODECABANG', 'BRANCH']);
  const idxPosko = getIndex(['KDPOSKO', 'POSKO', 'NAMAPOSKO', 'KODEPOSKO', 'SUBBRANCH', 'TITIKPOSKO']);
  const idxAo = getIndex(['KDAO', 'AO', 'KODEAO', 'CMO', 'KODECMO', 'KDCMO', 'PETUGAS']);
  const idxStatus = getIndex(['STATUS', 'STATUSMEDIATOR', 'STATE']);
  const idxTglFU = getIndex(['TGLAKHIRFU', 'TGLFU', 'TANGGALFU', 'LASTFU', 'TERAKHIRFU', 'TANGGALAKHIRFU']);
  const idxCatatan = getIndex(['CATATAN', 'CATATANADMIN', 'KETERANGAN', 'NOTES', 'REMARK']);

  const parsedRows: ParsedMediatorRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitLine(lines[i], delimiter);
    if (rawCols.length === 0 || rawCols.every(c => !c)) continue;

    const getVal = (idx: number, fallback = ''): string => {
      return idx >= 0 && rawCols[idx] !== undefined ? rawCols[idx].trim() : fallback;
    };

    let kd_med = getVal(idxKdMed, '');
    const nama_mediator = getVal(idxNama, '');
    const no_tlpn = getVal(idxTlpn, '');
    let kd_cabang = getVal(idxCabang, 'CAB-01').toUpperCase();
    let kd_posko = getVal(idxPosko, 'PSK-01').toUpperCase();
    let kd_ao = getVal(idxAo, 'AO-01').toUpperCase();
    let rawStatus = getVal(idxStatus, 'AKTIF').toUpperCase();
    const tgl_akhir_fu = getVal(idxTglFU, '') || null;
    const catatan_admin = getVal(idxCatatan, '');

    // Format validation
    let isValid = true;
    let validationError = '';

    if (!nama_mediator) {
      isValid = false;
      validationError = `Baris ${i + 1}: Nama mediator kosong`;
    } else if (!no_tlpn) {
      isValid = false;
      validationError = `Baris ${i + 1}: Nomor telepon kosong`;
    }

    // Determine status
    let status: MediatorStatus = 'AKTIF';
    if (rawStatus === 'PENDING' || rawStatus.includes('PEND')) {
      status = 'PENDING';
    } else if (rawStatus === 'INAKTIF' || rawStatus.includes('NON') || rawStatus === 'INACTIVE') {
      status = 'INAKTIF';
    }

    // Auto-generate or sanitize KD MED
    if (!kd_med) {
      if (status === 'PENDING') {
        kd_med = `PENDING-IMP-${String(i).padStart(3, '0')}`;
      } else {
        kd_med = `MED-${String(i).padStart(3, '0')}`;
      }
    } else {
      kd_med = kd_med.toUpperCase();
    }

    if (!kd_cabang) kd_cabang = 'CAB-01';
    if (!kd_posko) kd_posko = 'PSK-01';
    if (!kd_ao) kd_ao = 'AO-01';

    parsedRows.push({
      kd_med,
      nama_mediator,
      no_tlpn,
      kd_cabang,
      kd_posko,
      kd_ao,
      status,
      tgl_akhir_fu: tgl_akhir_fu ? sanitizeDate(tgl_akhir_fu) : null,
      catatan_admin,
      isValid,
      validationError
    });
  }

  return {
    rows: parsedRows,
    headers: rawHeaders,
    totalLines: lines.length - 1,
    errors
  };
}

function sanitizeDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'null') return null;
  // Try YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function generateCSVTemplate(): string {
  const headers = ['KD_MED', 'NAMA_MEDIATOR', 'NO_TELEPON', 'KD_CABANG', 'KD_POSKO', 'KD_AO', 'STATUS', 'TGL_AKHIR_FU', 'CATATAN'];
  const sampleRows = [
    ['MED-001', 'Budi Santoso', '081234567890', 'CAB-JKT', 'PSK-JKT-01', 'CMO-01', 'AKTIF', '2026-08-20', 'Mediator wilayah Jakarta'],
    ['MED-002', 'Hendra Gunawan', '081987654321', 'CAB-BDG', 'PSK-BDG-01', 'CMO-02', 'AKTIF', '', 'Kemitraan baru'],
    ['PENDING-001', 'Siti Rahmawati', '085712345678', 'CAB-JKT', 'PSK-JKT-02', 'CMO-01', 'PENDING', '', 'Menunggu validasi dokumen']
  ];

  return [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

export function parseCSVToExCustomers(csvText: string): {
  rows: ParsedExCustomerRow[];
  headers: string[];
  totalLines: number;
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], headers: [], totalLines: 0, errors: ['File kosong atau tidak memiliki data'] };
  }

  // Detect delimiter: comma, semicolon, tab
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';';
  } else if (headerLine.includes('\t')) {
    delimiter = '\t';
  }

  // Split line with quote awareness
  const splitLine = (line: string, delim: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const rawHeaders = splitLine(headerLine, delimiter);
  const normalizedHeaders = rawHeaders.map(h => 
    h.trim().toUpperCase().replace(/[\s_-]+/g, '')
  );

  const getIndex = (possibleNames: string[]): number => {
    return normalizedHeaders.findIndex(h => possibleNames.includes(h));
  };

  const idxNoPsb = getIndex(['NOPSB', 'PSB', 'NOKONTRAK', 'NOMORPSB', 'IDKONSUMEN', 'KODECUSTOMER']);
  const idxCab = getIndex(['KDCAB', 'KDCABANG', 'CABANG', 'NAMACABANG', 'KODECABANG']);
  const idxPos = getIndex(['KDPOS', 'KDPOSKO', 'POSKO', 'NAMAPOSKO', 'KODEPOSKO']);
  const idxNama = getIndex(['NAMAKONSUMEN', 'NAMA', 'NAME', 'CUSTOMER', 'NAMACUSTOMER', 'DEBITUR']);
  const idxTelp = getIndex(['NOTELEPON', 'NOTLPN', 'NOTELP', 'NOHP', 'TELEPON', 'PHONE', 'TELP', 'HP', 'WHATSAPP', 'WA']);
  const idxTglBpkb = getIndex(['TGLBPKBSDK', 'TGLBPKB', 'TANGGALBPKB', 'TGLSERAHBPKB', 'TGLAMBILBPKB', 'TANGGALSERAH']);
  const idxStatus = getIndex(['STATUSKREDITLUNAS', 'STATUSLUNAS', 'STATUSKREDIT', 'STATUS', 'KOLEKTIBILITAS', 'KATEGORI']);

  const parsedRows: ParsedExCustomerRow[] = [];
  const errors: string[] = [];

  const validStatuses: StatusKreditLunas[] = [
    'Lebih Awal',
    'Tepat Waktu',
    'Dalam Perhatian Khusus',
    'Kurang Lancar',
    'Diragukan',
    'AR2',
    'AR3',
    'AR4'
  ];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitLine(lines[i], delimiter);
    if (rawCols.length === 0 || rawCols.every(c => !c)) continue;

    const getVal = (idx: number, fallback = ''): string => {
      return idx >= 0 && rawCols[idx] !== undefined ? rawCols[idx].trim() : fallback;
    };

    let no_psb = getVal(idxNoPsb, '');
    let kd_cab = getVal(idxCab, 'C16').toUpperCase();
    let kd_pos = getVal(idxPos, 'QJ0').toUpperCase();
    const nama_konsumen = getVal(idxNama, '');
    const no_telepon = getVal(idxTelp, '');
    let tgl_bpkb_sdk = getVal(idxTglBpkb, new Date().toISOString().split('T')[0]);
    let rawStatus = getVal(idxStatus, 'Tepat Waktu');

    let isValid = true;
    let validationError = '';

    if (!no_psb) {
      isValid = false;
      validationError = `Baris ${i + 1}: No PSB kosong`;
    } else if (!nama_konsumen) {
      isValid = false;
      validationError = `Baris ${i + 1}: Nama konsumen kosong`;
    } else if (!no_telepon) {
      isValid = false;
      validationError = `Baris ${i + 1}: Nomor telepon kosong`;
    }

    no_psb = no_psb.toUpperCase().replace(/\s+/g, '');
    if (!kd_cab) kd_cab = 'C16';
    if (!kd_pos) kd_pos = 'QJ0';

    const cleanDate = sanitizeDate(tgl_bpkb_sdk);
    tgl_bpkb_sdk = cleanDate || new Date().toISOString().split('T')[0];

    // Normalize Status Kredit Lunas
    let status_kredit_lunas: StatusKreditLunas = 'Tepat Waktu';
    const statusUpper = rawStatus.toUpperCase();
    if (statusUpper.includes('AWAL') || statusUpper.includes('LEBIH')) {
      status_kredit_lunas = 'Lebih Awal';
    } else if (statusUpper.includes('TEPAT') || statusUpper.includes('LANCAR') && !statusUpper.includes('KURANG')) {
      status_kredit_lunas = 'Tepat Waktu';
    } else if (statusUpper.includes('DPK') || statusUpper.includes('PERHATIAN') || statusUpper.includes('KHUSUS')) {
      status_kredit_lunas = 'Dalam Perhatian Khusus';
    } else if (statusUpper.includes('KURANG')) {
      status_kredit_lunas = 'Kurang Lancar';
    } else if (statusUpper.includes('RAGU') || statusUpper.includes('DIRAGUKAN')) {
      status_kredit_lunas = 'Diragukan';
    } else if (statusUpper.includes('AR2')) {
      status_kredit_lunas = 'AR2';
    } else if (statusUpper.includes('AR3')) {
      status_kredit_lunas = 'AR3';
    } else if (statusUpper.includes('AR4')) {
      status_kredit_lunas = 'AR4';
    } else {
      const match = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase());
      if (match) status_kredit_lunas = match;
    }

    parsedRows.push({
      no_psb,
      kd_cab,
      kd_pos,
      nama_konsumen,
      no_telepon,
      tgl_bpkb_sdk,
      status_kredit_lunas,
      isValid,
      validationError
    });
  }

  return {
    rows: parsedRows,
    headers: rawHeaders,
    totalLines: lines.length - 1,
    errors
  };
}

export function generateBpkbCSVTemplate(): string {
  const headers = ['NO_PSB', 'KD_CAB', 'KD_POS', 'NAMA_KONSUMEN', 'NO_TELEPON', 'TGL_BPKB_SDK', 'STATUS_KREDIT_LUNAS'];
  const sampleRows = [
    ['PSB-16-9901', 'C16', 'QJ0', 'Ahmad Fauzi', '081234567890', '2026-08-25', 'Lebih Awal'],
    ['PSB-16-9902', 'C16', 'QJ0', 'Budi Santoso', '081987654321', '2026-08-26', 'Tepat Waktu'],
    ['PSB-16-9903', 'C16', 'QJ1', 'Siti Rahmawati', '085712345678', '2026-08-27', 'Dalam Perhatian Khusus'],
    ['PSB-16-9904', 'C16', 'QJ2', 'Dedi Setiawan', '082199887766', '2026-08-27', 'Kurang Lancar']
  ];

  return [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}
