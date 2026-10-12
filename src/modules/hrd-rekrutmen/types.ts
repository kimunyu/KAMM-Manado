export type WilayahPenempatan = 
  | 'RANOTANA' 
  | 'TUMINTING' 
  | 'BITUNG' 
  | 'TONDANO' 
  | 'LANGOWAN';

export interface WilayahMapping {
  wilayah: WilayahPenempatan;
  kd_cabang: string;
  nama_cabang: string;
  kd_posko: string;
  nama_posko: string;
}

export const WILAYAH_PENEMPATAN_MAPPING: Record<WilayahPenempatan, WilayahMapping> = {
  RANOTANA: {
    wilayah: 'RANOTANA',
    kd_cabang: 'MDO1',
    nama_cabang: 'Cabang Manado 1',
    kd_posko: 'MDO',
    nama_posko: 'Posko Manado'
  },
  TUMINTING: {
    wilayah: 'TUMINTING',
    kd_cabang: 'MDO1',
    nama_cabang: 'Cabang Manado 1',
    kd_posko: 'TMT',
    nama_posko: 'Posko Tuminting'
  },
  BITUNG: {
    wilayah: 'BITUNG',
    kd_cabang: 'MDO2',
    nama_cabang: 'Cabang Manado 2',
    kd_posko: 'BTG',
    nama_posko: 'Posko Bitung'
  },
  TONDANO: {
    wilayah: 'TONDANO',
    kd_cabang: 'MDO2',
    nama_cabang: 'Cabang Manado 2',
    kd_posko: 'TND',
    nama_posko: 'Posko Tondano'
  },
  LANGOWAN: {
    wilayah: 'LANGOWAN',
    kd_cabang: 'MDO2',
    nama_cabang: 'Cabang Manado 2',
    kd_posko: 'TND',
    nama_posko: 'Posko Tondano'
  }
};

export type MasterPosisiLowongan = 
  | 'Staff Admin'
  | 'CMO (Credit Marketing Officer)'
  | 'Kolektor/Jasa Penagihan'
  | 'Buser/Remedial collection'
  | 'Kepala Posko'
  | 'Kordinator Wilayah Collection';

export const MASTER_POSISI_LIST: MasterPosisiLowongan[] = [
  'Staff Admin',
  'CMO (Credit Marketing Officer)',
  'Kolektor/Jasa Penagihan',
  'Buser/Remedial collection',
  'Kepala Posko',
  'Kordinator Wilayah Collection'
];

export interface JobVacancy {
  id: string; // generated or `${wilayah}_${posisiSafe}`
  wilayah: WilayahPenempatan;
  posisi: MasterPosisiLowongan;
  kd_cabang: string;
  kd_posko: string;
  is_active: boolean;
  keterangan?: string;
  updated_at: string;
  updated_by_uid: string;
  updated_by_name: string;
}

export type StatusLamaran = 
  | 'BARU'
  | 'REVIEW_BERKAS'
  | 'INTERVIEW'
  | 'DITERIMA'
  | 'DITOLAK';

export type PendidikanTerakhir = 
  | 'SMA / SMK'
  | 'Diploma (D1 - D3)'
  | 'Sarjana (S1)'
  | 'Magister (S2)'
  | 'Lainnya';

export type StatusPengalamanKerja = 
  | 'Fresh Graduate'
  | 'Pernah Bekerja';

export interface JobApplicant {
  id: string;
  nomor_registrasi: string; // e.g. REG-202610-0012
  tgl_daftar: string; // ISO string
  
  // Penempatan & Posisi
  wilayah_penempatan: WilayahPenempatan;
  posisi_dilamar: MasterPosisiLowongan;
  kd_cabang: string;
  kd_posko: string;

  // Data Diri
  nama_lengkap: string;
  no_wa: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  tempat_lahir?: string;
  tgl_lahir: string; // YYYY-MM-DD
  usia: number;
  alamat_domisili: string;
  
  // Fasilitas / Kendaraan
  punya_motor: boolean;
  punya_mobil: boolean;
  punya_sim_c: boolean;
  punya_sim_a: boolean;

  // Pendidikan & Pengalaman
  pendidikan_terakhir: PendidikanTerakhir;
  nama_institusi?: string;
  jurusan?: string;
  status_pengalaman: StatusPengalamanKerja;
  perusahaan_terakhir?: string;
  posisi_terakhir?: string;
  lama_bekerja?: string;
  deskripsi_keahlian?: string;

  // Dokumen & Berkas
  pas_foto_base64: string; // compressed ~30-60KB
  cv_file_name: string;
  cv_file_size: number; // in bytes
  cv_mime_type: string; // application/pdf
  cv_has_chunks?: boolean;
  cv_base64?: string; // if small (<= 650KB)
  cv_total_chunks?: number;

  // Evaluasi Internal (HRD / Pimpinan)
  status: StatusLamaran;
  catatan_interview?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  updated_at?: string;
}

export interface CvChunk {
  chunk_index: number;
  total_chunks: number;
  data: string; // base64 substring
}
