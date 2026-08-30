import { Cabang, Posko, User, MediatorKontrak, FULog } from '../types';

export const SEED_USERS: User[] = [
  {
    id: "USR-001",
    nama: "Super Administrator",
    username: "superadmin",
    password: "1234",
    role: "SUPER_ADMIN",
    kd_ao: "SA-01",
    status: "AKTIF",
    email: "admin@perusahaan.co.id",
    must_change_password: false
  },
  {
    id: "USR-161899",
    nama: "COLDRY MALENDES",
    username: "mn.72",
    password: "1234",
    role: "CMO",
    kd_ao: "MN.72",
    kd_cabang: "C16",
    kd_posko: "QJ1",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-205361",
    nama: "SATRIO YOS AER",
    username: "mn.74",
    password: "1234",
    role: "CMO",
    kd_ao: "MN.74",
    kd_cabang: "C16",
    kd_posko: "QJ1",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-300884",
    nama: "SHERIN OKTAVIA BOWA",
    username: "admqj0",
    password: "1234",
    role: "ADM",
    kd_ao: "ADMQJ0",
    kd_cabang: "C16",
    kd_posko: "QJ0",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-335647",
    nama: "PRIMA PAENDONG",
    username: "kptm02",
    password: "1234",
    role: "KAPOS",
    kd_ao: "KPTM02",
    kd_cabang: "C16",
    kd_posko: "QJ0",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-366418",
    nama: "HUIGENS LOSUNG",
    username: "kpmn12",
    password: "1234",
    role: "KAPOS",
    kd_ao: "KPMN12",
    kd_cabang: "C16",
    kd_posko: "QJ1",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-418086",
    nama: "MICHAEL RAMPENGAN",
    username: "rm.16",
    password: "1234",
    role: "RM",
    kd_ao: "RM.16",
    status: "AKTIF",
    must_change_password: false
  },
  {
    id: "USR-625675",
    nama: "FEBBISANIA FRANSISKA LALAWI",
    username: "admmnpa1",
    password: "1234",
    role: "ADM",
    kd_ao: "ADMMNPA1",
    kd_cabang: "C16",
    kd_posko: "QJ1",
    status: "AKTIF",
    must_change_password: false
  },
  {
    id: "USR-714033",
    nama: "SYARIF NAHA",
    username: "tm.10",
    password: "1234",
    role: "CMO",
    kd_ao: "TM.10",
    kd_cabang: "C16",
    kd_posko: "QJ0",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-732423",
    nama: "HEIDY TOMPUNU",
    username: "tm.21",
    password: "1234",
    role: "CMO",
    kd_ao: "TM.21",
    kd_cabang: "C16",
    kd_posko: "QJ0",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-743081",
    nama: "ANDI SUTISNA",
    username: "tm.26",
    password: "1234",
    role: "CMO",
    kd_ao: "TM.26",
    kd_cabang: "C16",
    kd_posko: "QJ0",
    status: "AKTIF",
    must_change_password: true
  },
  {
    id: "USR-882190",
    nama: "VALENTINO BPKB ADMIN",
    username: "adminbpkb.c16",
    password: "1234",
    role: "ADMIN_BPKB",
    kd_ao: "BPKB-C16",
    status: "AKTIF",
    email: "bpkb.manado@perusahaan.co.id",
    must_change_password: false
  }
];

export const SEED_CABANG: Cabang[] = [
  {
    kd_cabang: "C16",
    nama_cabang: "MANADO 1",
    wilayah: "Wilayah 1"
  }
];

export const SEED_POSKO: Posko[] = [
  {
    kd_posko: "QJ0",
    nama_posko: "TUMINTING",
    kd_cabang: "C16"
  },
  {
    kd_posko: "QJ1",
    nama_posko: "MANADO",
    kd_cabang: "C16"
  }
];
