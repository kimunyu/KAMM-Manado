// Core Application Types - Super App KAMM Manado

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'KACAB' 
  | 'RM' 
  | 'KAOPS' 
  | 'KAPOS' 
  | 'ADM' 
  | 'ADM_BPKB' 
  | 'ADMIN_BPKB'
  | 'ADM_DE' 
  | 'CMO';

export type UserStatus = 'AKTIF' | 'NONAKTIF';

export interface User {
  id: string;
  username: string;
  password?: string;
  nama: string;
  role: UserRole;
  kd_ao?: string;
  kd_cabang?: string;
  kd_posko?: string;
  status: UserStatus;
  email?: string;
  firebase_uid?: string;
  must_change_password?: boolean;
  created_at?: string;
  last_login?: string;
  updated_at?: string;
}

export interface Cabang {
  kd_cabang: string;
  nama_cabang: string;
  alamat?: string;
  wilayah?: string;
}


export interface Posko {
  kd_posko: string;
  nama_posko: string;
  kd_cabang: string;
}

export type MediatorStatus = 'BELUM_AKTIF' | 'PENDING' | 'AKTIF' | 'DITOLAK' | 'NONAKTIF' | 'INAKTIF';

export interface MediatorKontrak {
  firestore_id?: string;
  id?: string;
  temp_id?: string;
  kd_med: string;
  nama_mediator: string;
  no_tlpn: string;
  kd_cabang?: string;
  kd_posko: string;
  kd_ao: string;
  status: MediatorStatus;
  tanggal_bergabung?: string;
  tgl_akhir_fu?: string | null;
  no_ktp?: string;
  alamat?: string;
  tempat_lahir?: string;
  tgl_lahir?: string;
  nama_bank?: string;
  no_rekening?: string;
  atas_nama_rekening?: string;
  catatan?: string;
  catatan_admin?: string;
  created_by?: string;
  created_by_user?: string;
  created_by_role?: string;
  reviewed_by?: string;
  activated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type StatusKreditLunas = 
  | 'Lebih Awal' 
  | 'Tepat Waktu' 
  | 'Dalam Perhatian Khusus' 
  | 'Kurang Lancar' 
  | 'Diragukan' 
  | 'Macet' 
  | 'AR2' 
  | 'AR3' 
  | 'AR4';

export type ExCustomerBpkbStatus = 'LUNAS' | 'PROSES_AMBIL' | 'SUDAH_DIAMBIL';
export type ExCustomerProspekStatus = 'BELUM_DIHUBUNGI' | 'TERHUBUNGI' | 'MINAT' | 'TIDAK_MINAT' | 'PROSES_PENCAIRAN' | 'CAIR';

export interface ExCustomer {
  no_psb: string;
  nama_konsumen: string;
  no_polisi: string;
  no_rangka?: string;
  no_mesin?: string;
  tahun?: string | number;
  merk?: string;
  type?: string;
  warna?: string;
  tgl_cair?: string;
  tgl_lunas?: string;
  tgl_bpkb_sdk?: string;
  status_bpkb: ExCustomerBpkbStatus;
  status_prospek: ExCustomerProspekStatus;
  status_kredit_lunas?: StatusKreditLunas | string;
  no_hp?: string;
  kd_cabang: string;
  kd_posko: string;
  kd_ao?: string;
  assigned_to_cmo_id?: string;
  assigned_cmo_nama?: string;
  assigned_at?: string;
  catatan_terakhir?: string;
  tgl_follow_up_terakhir?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExCustomerFollowUpLog {
  id: string;
  no_psb: string;
  tanggal: string;
  user_id: string;
  user_nama: string;
  kd_ao?: string;
  hasil_kontak: string;
  status_sebelumnya: ExCustomerProspekStatus;
  status_baru: ExCustomerProspekStatus;
  catatan: string;
  created_at: string;
}

export interface FollowUpLog {
  id: string;
  kd_med: string;
  tanggal: string;
  user_id: string;
  user_nama: string;
  hasil_kontak: string;
  komitmen_lead: number;
  catatan: string;
  created_at: string;
}

export type ExCustomerFULog = ExCustomerFollowUpLog;
export type FULog = FollowUpLog;

export type FUCategory = 'BELUM_FU' | 'SUDAH_FU' | 'LEBIH_15_HARI' | 'LEBIH_30_HARI';

export type AuditActionCategory = 
  | 'AUTH' 
  | 'MEDIATOR' 
  | 'EX_CUSTOMER' 
  | 'SALES_CONTROL' 
  | 'KONTROL_SALES' 
  | 'USER_MANAGEMENT' 
  | 'SYSTEM';


export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  actor_kd_ao?: string;
  category: AuditActionCategory;
  action: string;
  description: string;
  target_id?: string;
  metadata?: Record<string, any>;
}

export interface SystemHealthStatus {
  isOnline: boolean;
  firestoreConnected: boolean;
  latencyMs: number;
  lastChecked: string;
  collectionCounts: {
    users: number;
    mediators: number;
    fu_logs: number;
    ex_customers: number;
    ex_customer_fu_logs: number;
    cabang: number;
    posko: number;
    audit_logs: number;
  };
}

export interface SelectedWilayahState {
  provinsiId: string;
  kabupatenId: string;
  kecamatanId: string;
  desaId: string;
  provinsiNama?: string;
  kabupatenNama?: string;
  kecamatanNama?: string;
  desaNama?: string;
}

export interface WilayahProvinsi {
  id: string;
  nama: string;
}

export interface WilayahKabupaten {
  id: string;
  nama: string;
  provinsi_id?: string;
}

export interface WilayahKecamatan {
  id: string;
  nama: string;
  kabupaten_id?: string;
}

export interface WilayahDesa {
  id: string;
  nama: string;
  kecamatan_id?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user_id: string;
  username: string;
  action: string;
  module: string;
  details: string;
}

export interface WilayahItem {
  id: string;
  nama: string;
  parent_id?: string;
}
