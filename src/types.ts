export type UserRole = 
  | 'CMO' 
  | 'KAPOS' 
  | 'ADM' 
  | 'ADMIN_BPKB'
  | 'KAOPS' 
  | 'KACAB' 
  | 'RM' 
  | 'SUPER_ADMIN';

export type StatusKreditLunas = 
  | 'Lebih Awal'
  | 'Tepat Waktu'
  | 'Dalam Perhatian Khusus'
  | 'Kurang Lancar'
  | 'Diragukan'
  | 'AR2'
  | 'AR3'
  | 'AR4';

export type HasilFU = 
  | 'WA/Tlpn Aktif, ada respon'
  | 'WA/Tlpn Aktif, tidak ada respon'
  | 'WA/Tlpn Tidak Aktif';

export type HasilFUExCustomer = HasilFU;

export interface ExCustomer {
  no_psb: string;              // Unique/Primary Key
  kd_cab: string;              // Kode Cabang
  kd_pos: string;              // Kode Posko
  nama_konsumen: string;
  no_telepon: string;
  tgl_bpkb_sdk: string;        // Tanggal BPKB diserahkan/diambil (YYYY-MM-DD)
  status_kredit_lunas: StatusKreditLunas;
  
  // Keamanan & Pencatatan Input (Admin BPKB)
  created_at: string;          // ISO Timestamp saat diinput
  created_by_uid: string;      // ID User Penginput
  created_by_name: string;
  updated_at?: string;         // ISO Timestamp saat diedit
  updated_by_name?: string;

  // Drip Feeding Engine & Penugasan CMO
  assigned_to_cmo_id?: string; // ID CMO jika ditugaskan oleh KAPOS
  assigned_to_cmo_name?: string;
  assigned_at?: string;        // Timestamp penugasan CMO (reset 24 jam)
  
  // Follow Up Terakhir
  last_fu_date?: string | null;// ISO DateTime
  last_fu_status?: HasilFUExCustomer | null;
  last_fu_by_user?: string | null;
  last_fu_by_role?: UserRole | null;
  last_fu_notes?: string | null; // Maks 100 Karakter
  fu_count: number;
}

export interface ExCustomerFULog {
  id: string;
  no_psb: string;
  nama_konsumen: string;
  kd_cab: string;
  kd_pos: string;
  tgl_fu: string;             // ISO DateTime
  hasil_fu: HasilFUExCustomer;
  catatan_fu: string;         // Max 100 chars
  user_fu: string;            // Nama Pengguna
  user_id: string;
  user_role: UserRole;
  kd_ao?: string;
}

export interface ExCustomerMetrics {
  totalExCustomer: number;
  totalDripToday: number;
  totalSudahFuHariIni: number;
  totalBelumFuHariIni: number;
  totalAssignedCmo: number;
  responseRates: {
    respon: number;
    tidakRespon: number;
    tidakAktif: number;
  };
}

export interface Cabang {
  kd_cabang: string;
  nama_cabang: string;
  wilayah: string;
}

export interface Posko {
  kd_posko: string;
  nama_posko: string;
  kd_cabang: string;
}

export interface User {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  kd_ao?: string;
  kd_posko?: string;
  kd_cabang?: string;
  status: 'AKTIF' | 'NONAKTIF';
  email?: string;
  /**
   * @deprecated LEGACY FIELD: Kept solely for schema backwards compatibility.
   * NEVER used for credential validation or authentication runtime.
   * Authentication is enforced exclusively by Firebase Authentication.
   */
  password?: string;
  must_change_password?: boolean;
  last_password_change?: string;
  firebase_uid?: string;
  foto_profil?: string; // Lightweight base64 image (< 30KB)
}

export type AuditActionCategory = 
  | 'USER_MANAGEMENT'      // Create/Edit/Delete User, Reset Password
  | 'AUTH'                 // Login, Logout, Change Password
  | 'MEDIATOR'             // Register, Review Berkas, Input KD MED, Edit, Delete
  | 'FOLLOW_UP'            // Input FU Mediator
  | 'EX_CUSTOMER'          // Input BPKB, Penugasan CMO, FU Ex-Customer, Import/Export
  | 'MASTER_DATA'          // Cabang, Posko
  | 'SYSTEM';              // Backup, Restore, Health Check

export interface AuditLog {
  id: string;
  timestamp: string;       // ISO DateTime string
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  actor_kd_ao?: string;
  category: AuditActionCategory;
  action: string;          // Action identifier (e.g. 'TAMBAH_USER', 'VALIDASI_KD_MED')
  description: string;     // Indonesian human-readable detail
  target_id?: string;      // ID of the modified entity
  metadata?: Record<string, any>;
}

export interface CollectionHealthStat {
  name: string;
  count: number;
  lastUpdated?: string;
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

export type MediatorStatus = 
  | 'BELUM_AKTIF' // Baru didaftarkan (Menunggu Peninjauan Admin)
  | 'PENDING'     // Telah ditinjau Admin (Menunggu Input KD MED oleh KAPOS / Super Admin)
  | 'AKTIF'       // Telah diinput KD MED resmi (Aktif Beroperasi)
  | 'INAKTIF'     // Nonaktif / Vakum
  | 'DITOLAK';    // Ditolak saat peninjauan/validasi

export interface MediatorKontrak {
  kd_med: string; // Manually inputted by KAOPS or SUPER_ADMIN, temporary pending code if PENDING
  temp_id?: string; // Internal unique ID
  nama_mediator: string; // Max 100 chars
  no_tlpn: string;
  status: MediatorStatus; // 'PENDING' -> 'AKTIF'
  kd_ao: string; // Registered by AO/User
  kd_posko: string;
  kd_cabang: string;
  tgl_akhir_fu: string | null; // ISO Date YYYY-MM-DD
  created_at: string; // ISO DateTime
  created_by_user?: string;
  created_by_role?: UserRole;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  validated_at?: string | null;
  validated_by?: string | null;
  catatan_admin?: string;
}

export interface FULog {
  id: string;
  kd_med: string;
  nama_mediator: string;
  tgl_fu: string; // ISO DateTime
  hasil_fu: HasilFU;
  catatan_fu: string; // Max 100 chars
  user_fu: string; // Nama user
  kd_ao: string;
  kd_posko: string;
  kd_cabang: string;
}

export type FUCategory = 
  | 'BELUM_FU'       // Belum di FU (Never followed up)
  | 'LEBIH_30_HARI'  // FU terakhir lebih dari 30 hari (> 30 days)
  | 'LEBIH_15_HARI'  // FU terakhir lebih dari 15 hari (> 15 days and <= 30 days)
  | 'SUDAH_FU';      // Sudah di FU (<= 15 days)

export interface DashboardMetrics {
  totalMediator: number;
  totalAktif: number;
  totalPending: number;
  totalInaktif: number;
  fuCategories: {
    belumFu: number;
    lebih30Hari: number;
    lebih15Hari: number;
    sudahFu: number;
  };
}
