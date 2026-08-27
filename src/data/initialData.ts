import { Cabang, Posko, User, MediatorKontrak, FULog } from '../types';

// Bersih tanpa data demo - siap untuk input data riil
export const INITIAL_CABANG: Cabang[] = [];

export const INITIAL_POSKO: Posko[] = [];

// Hanya menyisakan akun Super Administrator
export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'superadmin',
    password: '1234',
    nama: 'Super Administrator',
    role: 'SUPER_ADMIN',
    kd_ao: 'SA-01',
    status: 'AKTIF',
    email: 'admin@perusahaan.co.id',
    must_change_password: false
  }
];

export const INITIAL_MEDIATORS: MediatorKontrak[] = [];

export const INITIAL_FU_LOGS: FULog[] = [];
