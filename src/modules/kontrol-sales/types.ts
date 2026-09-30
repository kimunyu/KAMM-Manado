// Kontrol Sales Types

export type StatusSalesRecord = 'SUBMISS' | 'ACCEPT' | 'BELUM SELESAI';

export interface SalesRecord {
  no_psb: string;
  nama_konsumen: string;
  tgl_cair: string;
  tgl_jt: string;
  plafon: number;
  tenor: number;
  angsuran: number;
  kd_cabang: string;
  kd_posko: string;
  kd_ao: string;
  kd_med?: string;
  jenis_jaminan?: string;
  no_polisi?: string;
  status_validasi_de?: 'PENDING' | 'VALID' | 'INVALID';
  catatan?: string;
  created_at?: string;
}

export interface UbahJtRecord {
  id: string;
  no_psb: string;
  nama_konsumen: string;
  jt_lama: string;
  jt_baru: string;
  alasan: string;
  status: 'PENDING' | 'DISETUJUI' | 'DITOLAK';
  requested_by: string;
  approved_by?: string;
  created_at: string;
}

export interface SalesControlRecord {
  id?: string;
  no_psb: string;
  tgl_cair: string;
  tgl_jt: string;
  nama_konsumen: string;
  no_wa?: string;
  status: StatusSalesRecord;
  keterangan?: string;
  cabang_id: string;
  kd_cabang?: string;
  posko_id: string;
  kd_posko?: string;
  kd_ao?: string;
  kd_med?: string;
  jenis_jaminan?: string;
  no_polisi?: string;
  plafon?: number;
  tenor?: number;
  angsuran?: number;
  created_by?: string;
  created_by_uid?: string;
  created_by_name?: string;
  created_at?: string;
  created_at_timestamp?: any;
  updated_at?: string;
  updated_by?: string;
  updated_by_uid?: string;
  validated_at?: string;
  validated_by?: string;
  validated_by_name?: string;
  is_ubah_jt?: boolean;
  validasi_ubah_jt_status?: 'PENDING' | 'ACCEPT' | 'REJECT' | 'SESUAI' | 'BELUM_SESUAI' | null;
  validasi_ubah_jt_at?: string;
  validasi_ubah_jt_by?: string;
  validasi_ubah_jt_catatan?: string;
  catatan_validasi?: string;

}

export interface SalesKPISummary {
  totalKonsumen: number;
  totalAccept: number;
  totalSubmiss: number;
  totalBelumSelesai: number;
  totalHoldDana: number;
}

