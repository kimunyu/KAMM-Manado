export type UserRole = 
  | 'CMO' 
  | 'KAPOS' 
  | 'ADM' 
  | 'KAOPS' 
  | 'KACAB' 
  | 'RM' 
  | 'SUPER_ADMIN';

export type MediatorStatus = 'PENDING' | 'AKTIF' | 'INAKTIF';

export type HasilFU = 
  | 'WA/Tlpn Aktif, ada respon'
  | 'WA/Tlpn Aktif, tidak ada respon'
  | 'WA/Tlpn Tidak Aktif';

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
  password: string;
  must_change_password?: boolean;
  last_password_change?: string;
}

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
