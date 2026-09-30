import { User, Cabang, Posko, MediatorKontrak, ExCustomer } from '../types';
import { SalesAcquisition } from '../modules/sales-acquisition/types';

export const INITIAL_CABANG: Cabang[] = [
  { kd_cabang: 'C16', nama_cabang: 'Manado', alamat: 'Jl. Sam Ratulangi No. 120, Manado' },
  { kd_cabang: 'C17', nama_cabang: 'Tomohon', alamat: 'Jl. Raya Tomohon No. 45, Tomohon' },
  { kd_cabang: 'C18', nama_cabang: 'Bitung', alamat: 'Jl. Yos Sudarso No. 88, Bitung' }
];

export const INITIAL_POSKO: Posko[] = [
  { kd_posko: 'QJ0', nama_posko: 'Posko Manado Sentral', kd_cabang: 'C16' },
  { kd_posko: 'QJ1', nama_posko: 'Posko Tuminting', kd_cabang: 'C16' },
  { kd_posko: 'QJ2', nama_posko: 'Posko Malalayang', kd_cabang: 'C16' },
  { kd_posko: 'QJ3', nama_posko: 'Posko Mapanget', kd_cabang: 'C16' },
  { kd_posko: 'QK1', nama_posko: 'Posko Tomohon Utara', kd_cabang: 'C17' },
  { kd_posko: 'QK2', nama_posko: 'Posko Tomohon Selatan', kd_cabang: 'C17' },
  { kd_posko: 'QL1', nama_posko: 'Posko Bitung Barat', kd_cabang: 'C18' },
  { kd_posko: 'QL2', nama_posko: 'Posko Bitung Timur', kd_cabang: 'C18' }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'USR_SA',
    username: 'admin',
    password: 'password123',
    nama: 'Super Administrator',
    role: 'SUPER_ADMIN',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_KACAB',
    username: 'kacab',
    password: 'password123',
    nama: 'Royke Pangemanan (KACAB)',
    role: 'KACAB',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_RM',
    username: 'rm',
    password: 'password123',
    nama: 'Johan Walangitan (RM)',
    role: 'RM',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_KAOPS',
    username: 'kaops',
    password: 'password123',
    nama: 'Deisy Runtu (KAOPS)',
    role: 'KAOPS',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_KAPOS_MANADO',
    username: 'kapos',
    password: 'password123',
    nama: 'Meidy Mandagi (KAPOS)',
    role: 'KAPOS',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_ADM',
    username: 'adm',
    password: 'password123',
    nama: 'Vivi Sondakh (ADM POSKO)',
    role: 'ADM',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_ADM_BPKB',
    username: 'admbpkb',
    password: 'password123',
    nama: 'Clara Mamahit (ADM BPKB)',
    role: 'ADM_BPKB',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_ADM_DE',
    username: 'admde',
    password: 'password123',
    nama: 'Franky Lontoh (ADM DE)',
    role: 'ADM_DE',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_CMO_01',
    username: 'cmo',
    password: 'password123',
    nama: 'Stenly Sompotan (CMO)',
    role: 'CMO',
    kd_ao: 'AO-01',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    status: 'AKTIF'
  },
  {
    id: 'USR_CMO_02',
    username: 'cmo2',
    password: 'password123',
    nama: 'Mario Polii (CMO)',
    role: 'CMO',
    kd_ao: 'AO-02',
    kd_cabang: 'C16',
    kd_posko: 'QJ1',
    status: 'AKTIF'
  }
];

export const INITIAL_MEDIATORS: MediatorKontrak[] = [
  {
    firestore_id: 'MED_001',
    kd_med: 'MED-001',
    nama_mediator: 'Hermanus Wowor',
    no_tlpn: '081234567890',
    kd_posko: 'QJ0',
    kd_ao: 'AO-01',
    status: 'AKTIF',
    tanggal_bergabung: '2024-01-15',
    no_ktp: '7171011234560001',
    alamat: 'Jl. Sam Ratulangi No. 12, Manado',
    tempat_lahir: 'Manado',
    tgl_lahir: '1985-05-12',
    nama_bank: 'BCA',
    no_rekening: '0261234567',
    atas_nama_rekening: 'Hermanus Wowor'
  },
  {
    firestore_id: 'MED_002',
    kd_med: 'MED-002',
    nama_mediator: 'Grace Paat',
    no_tlpn: '081398765432',
    kd_posko: 'QJ1',
    kd_ao: 'AO-02',
    status: 'AKTIF',
    tanggal_bergabung: '2024-02-10',
    no_ktp: '7171025544330002',
    alamat: 'Kel. Tuminting Lingk. 2, Manado',
    tempat_lahir: 'Tomohon',
    tgl_lahir: '1990-08-20',
    nama_bank: 'BRI',
    no_rekening: '512301004567501',
    atas_nama_rekening: 'Grace Paat'
  },
  {
    firestore_id: 'MED_003',
    kd_med: 'MED-003',
    nama_mediator: 'Jacky Lumoindong',
    no_tlpn: '085244112233',
    kd_posko: 'QJ0',
    kd_ao: 'AO-01',
    status: 'AKTIF',
    tanggal_bergabung: '2024-03-01',
    no_ktp: '7171031102990003',
    alamat: 'Malalayang Satu Barat, Manado',
    nama_bank: 'Mandiri',
    no_rekening: '1500012345678',
    atas_nama_rekening: 'Jacky Lumoindong'
  },
  {
    firestore_id: 'MED_004',
    kd_med: 'DRAFT-001',
    temp_id: 'TMP-001',
    nama_mediator: 'Noldy Senduk',
    no_tlpn: '082155667788',
    kd_posko: 'QJ2',
    kd_ao: 'AO-01',
    status: 'BELUM_AKTIF',
    tanggal_bergabung: '2024-09-01',
    no_ktp: '7171041908880004',
    alamat: 'Bahu, Manado'
  },
  {
    firestore_id: 'MED_005',
    kd_med: 'DRAFT-002',
    temp_id: 'TMP-002',
    nama_mediator: 'Revly Rompis',
    no_tlpn: '081299887766',
    kd_posko: 'QJ0',
    kd_ao: 'AO-02',
    status: 'PENDING',
    tanggal_bergabung: '2024-09-10',
    no_ktp: '7171052107870005',
    alamat: 'Tikala Ares, Manado'
  }
];

export const INITIAL_EX_CUSTOMERS: ExCustomer[] = [
  {
    no_psb: 'PSB-2022-001',
    nama_konsumen: 'Novita Lumempouw',
    no_polisi: 'DB 1234 AB',
    tahun: '2020',
    merk: 'HONDA',
    type: 'SCOOPY',
    warna: 'MERAH HITAM',
    tgl_cair: '2022-01-10',
    tgl_lunas: '2024-01-10',
    status_bpkb: 'LUNAS',
    status_prospek: 'BELUM_DIHUBUNGI',
    no_hp: '081244001122',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    kd_ao: 'AO-01',
    assigned_to_cmo_id: 'USR_CMO_01',
    assigned_cmo_nama: 'Stenly Sompotan (CMO)'
  },
  {
    no_psb: 'PSB-2022-002',
    nama_konsumen: 'Ferry Kalalo',
    no_polisi: 'DB 5678 CD',
    tahun: '2019',
    merk: 'YAMAHA',
    type: 'NMAX 155',
    warna: 'HITAM MATTE',
    tgl_cair: '2022-02-15',
    tgl_lunas: '2024-02-15',
    status_bpkb: 'LUNAS',
    status_prospek: 'MINAT',
    no_hp: '085233119988',
    kd_cabang: 'C16',
    kd_posko: 'QJ1',
    kd_ao: 'AO-02',
    assigned_to_cmo_id: 'USR_CMO_02',
    assigned_cmo_nama: 'Mario Polii (CMO)',
    catatan_terakhir: 'Konsumen berminat pengajuan ulang 15 juta untuk modal usaha sembako.'
  },
  {
    no_psb: 'PSB-2022-003',
    nama_konsumen: 'Jantje Mongdong',
    no_polisi: 'DB 8910 EF',
    tahun: '2018',
    merk: 'TOYOTA',
    type: 'AVANZA G 1.3',
    warna: 'PUTIH',
    tgl_cair: '2021-08-20',
    tgl_lunas: '2023-08-20',
    status_bpkb: 'SUDAH_DIAMBIL',
    status_prospek: 'TERHUBUNGI',
    no_hp: '081377889900',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    kd_ao: 'AO-01',
    assigned_to_cmo_id: 'USR_CMO_01',
    assigned_cmo_nama: 'Stenly Sompotan (CMO)',
    catatan_terakhir: 'Sedang mempertimbangkan pinjaman sertifikat atau mobil.'
  }
];

export const INITIAL_LEADS: SalesAcquisition[] = [
  {
    id: 'ACQ_1001',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    created_by_user_id: 'USR_CMO_01',
    created_by_user_nama: 'Stenly Sompotan (CMO)',
    nama_calon_konsumen: 'Robby Tumewu',
    no_telepon: '081245678901',
    clean_phone: '081245678901',
    sumber_lead: 'CANVASSING',
    jenis_jaminan: 'R2',
    status: 'PROSPEK_BARU',
    assigned_user_id: 'USR_CMO_01',
    assigned_user_nama: 'Stenly Sompotan',
    kd_ao: 'AO-01',
    kd_cabang: 'C16',
    kd_posko: 'QJ0',
    wilayah_provinsi_id: '71',
    wilayah_provinsi_nama: 'Sulawesi Utara',
    wilayah_kabupaten_id: '7171',
    wilayah_kabupaten_nama: 'Kota Manado',
    wilayah_kecamatan_id: '7171010',
    wilayah_kecamatan_nama: 'Wenang',
    wilayah_desa_id: '7171010001',
    wilayah_desa_nama: 'Bumi Beringin',
    alamat_detail: '',
    plafon_pengajuan: 10000000
  },
  {
    id: 'ACQ_1002',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    created_by_user_id: 'USR_CMO_02',
    created_by_user_nama: 'Mario Polii (CMO)',
    nama_calon_konsumen: 'Dewi Maramis',
    no_telepon: '081399881122',
    clean_phone: '081399881122',
    sumber_lead: 'MEDIATOR',
    kd_med: 'MED-001',
    jenis_jaminan: 'R4',
    status: 'PROSES_SURVEI',
    assigned_user_id: 'USR_CMO_02',
    assigned_user_nama: 'Mario Polii',
    kd_ao: 'AO-02',
    kd_cabang: 'C16',
    kd_posko: 'QJ1',
    wilayah_provinsi_id: '71',
    wilayah_provinsi_nama: 'Sulawesi Utara',
    wilayah_kabupaten_id: '7171',
    wilayah_kabupaten_nama: 'Kota Manado',
    wilayah_kecamatan_id: '7171020',
    wilayah_kecamatan_nama: 'Tuminting',
    wilayah_desa_id: '7171020002',
    wilayah_desa_nama: 'Tumumpa Satu',
    alamat_detail: '',
    plafon_pengajuan: 45000000,
    catatan_survei: 'Unit Toyota Avanza 2017 siap disurvei di rumah konsumen.'
  }
];
