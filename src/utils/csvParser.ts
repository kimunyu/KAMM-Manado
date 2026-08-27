import { MediatorKontrak, MediatorStatus } from '../types';

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
