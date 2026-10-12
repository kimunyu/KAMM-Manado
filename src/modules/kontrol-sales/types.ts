export type StatusSalesRecord = 'SUBMISS' | 'ACCEPT' | 'BELUM SELESAI';

export interface SalesControlRecord {
  id: string;                      // Document ID / NO_PSB
  tgl_cair: string;                // Format: DD/MM/YYYY (default WITA today)
  no_psb: string;                  // Unique Key, 8 digit
  nama_konsumen: string;           // Max 100 char
  no_wa: string;                   // Format: 08...
  tgl_jt: string;                  // Format: DD (01-31, hari saja; backward-compatible dengan format lama)
  status: StatusSalesRecord;       // 'SUBMISS' | 'ACCEPT' | 'BELUM SELESAI'
  keterangan: string;              // Longtext max 500 char. Saat ACCEPT default "SESUAI". Saat BELUM SELESAI diisi kekurangan
  cabang_id: string;               // Kode Cabang
  posko_id: string;                // Kode Posko
  kd_cabang?: string;              // Compatibility alias for Kode Cabang
  kd_posko?: string;               // Compatibility alias for Kode Posko
  created_by: string;              // UID & Nama User
  created_by_uid?: string;
  created_by_name?: string;
  created_at: any;                 // Firestore Timestamp or ISO string
  updated_at?: any;
  updated_by?: string;
  updated_by_uid?: string;
  validated_at?: any;              // Timestamp saat status ACCEPT divalidasi (kunci 1x24 jam)
  // Atribut dan Validasi Ubah JT
  is_ubah_jt?: boolean;            // True jika hari tgl_cair berbeda dengan tgl_jt
  validasi_ubah_jt_status?: 'SESUAI' | 'BELUM_SESUAI' | null;
  validasi_ubah_jt_at?: any;       // Timestamp validasi JT
  validasi_ubah_jt_by?: string | null; // Nama & Peran validator JT
  validasi_ubah_jt_catatan?: string | null;
}

export interface SalesFilterOptions {
  searchTerm: string;
  cabangId: string;
  poskoId: string;
  status: string;
  onlyHoldDana: boolean;
}

export interface RekapitulasiRow {
  cabang_id: string;
  nama_cabang: string;
  posko_id: string;
  nama_posko: string;
  total_submiss: number;
  total_accept: number;
  total_belum_selesai: number;
  total_hold_dana: number;
  total_konsumen: number;
}

export interface SalesKPISummary {
  totalKonsumen: number;
  totalAccept: number;
  totalSubmiss: number;
  totalBelumSelesai: number;
  totalHoldDana: number;
}
