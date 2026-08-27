import { Cabang, Posko, User, UserRole, MediatorKontrak, FULog, MediatorStatus, HasilFU } from '../types';
import { INITIAL_CABANG, INITIAL_POSKO, INITIAL_USERS, INITIAL_MEDIATORS, INITIAL_FU_LOGS } from '../data/initialData';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';

const STORAGE_KEYS = {
  CABANG: 'med_control_cabang_v2',
  POSKO: 'med_control_posko_v2',
  USERS: 'med_control_users_v2',
  MEDIATORS: 'med_control_mediators_v2',
  FU_LOGS: 'med_control_fu_logs_v2',
  CURRENT_USER: 'med_control_auth_user_v2',
};

export interface SystemFullBackup {
  meta: {
    appName: string;
    version: string;
    timestamp: string;
    exportedBy: string;
    environment: string;
  };
  data: {
    users: User[];
    cabang: Cabang[];
    posko: Posko[];
    mediators: MediatorKontrak[];
    fu_logs: FULog[];
  };
}

// Initializer helper
export function getInitialOrStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

// Subscribers for cross-device & real-time updates
type StorageListener = () => void;
const listeners: Set<StorageListener> = new Set();

function notifyAllListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('Error notifying storage listener:', err);
    }
  });
}

// Sanitize key for Firestore doc ID (replace / and other special characters)
function sanitizeDocId(id: string): string {
  return encodeURIComponent(id).replace(/\./g, '%2E');
}

// Clean undefined fields for Firestore (Firestore throws error on undefined values)
export function cleanForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(cleanForFirestore);

  const cleanObj: any = {};
  for (const [key, value] of Object.entries(data as any)) {
    if (value !== undefined) {
      cleanObj[key] = cleanForFirestore(value);
    }
  }
  return cleanObj;
}

// Setup real-time listeners to Firestore for cloud sync
let isInitialized = false;

export function initializeFirebaseSync() {
  if (isInitialized || !db) return;
  isInitialized = true;

  try {
    // 1. Sync Users
    const usersCol = collection(db, 'users');
    onSnapshot(usersCol, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial users into Firestore
        const batch = writeBatch(db!);
        INITIAL_USERS.forEach((u) => {
          batch.set(doc(db!, 'users', sanitizeDocId(u.id)), cleanForFirestore(u));
        });
        await batch.commit().catch(e => console.warn('User seed error:', e));
      } else {
        const cloudUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          cloudUsers.push(docSnap.data() as User);
        });
        if (cloudUsers.length > 0) {
          saveToStorage(STORAGE_KEYS.USERS, cloudUsers);
          notifyAllListeners();
        }
      }
    }, (err) => console.warn('Firestore users sync warning:', err));

    // 2. Sync Cabang
    const cabangCol = collection(db, 'cabang');
    onSnapshot(cabangCol, async (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db!);
        INITIAL_CABANG.forEach((c) => {
          batch.set(doc(db!, 'cabang', sanitizeDocId(c.kd_cabang)), cleanForFirestore(c));
        });
        await batch.commit().catch(e => console.warn('Cabang seed error:', e));
      } else {
        const cloudCabang: Cabang[] = [];
        snapshot.forEach((docSnap) => {
          cloudCabang.push(docSnap.data() as Cabang);
        });
        if (cloudCabang.length > 0) {
          saveToStorage(STORAGE_KEYS.CABANG, cloudCabang);
          notifyAllListeners();
        }
      }
    }, (err) => console.warn('Firestore cabang sync warning:', err));

    // 3. Sync Posko
    const poskoCol = collection(db, 'posko');
    onSnapshot(poskoCol, async (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db!);
        INITIAL_POSKO.forEach((p) => {
          batch.set(doc(db!, 'posko', sanitizeDocId(p.kd_posko)), cleanForFirestore(p));
        });
        await batch.commit().catch(e => console.warn('Posko seed error:', e));
      } else {
        const cloudPosko: Posko[] = [];
        snapshot.forEach((docSnap) => {
          cloudPosko.push(docSnap.data() as Posko);
        });
        if (cloudPosko.length > 0) {
          saveToStorage(STORAGE_KEYS.POSKO, cloudPosko);
          notifyAllListeners();
        }
      }
    }, (err) => console.warn('Firestore posko sync warning:', err));

    // 4. Sync Mediators
    const mediatorsCol = collection(db, 'mediators');
    onSnapshot(mediatorsCol, async (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db!);
        INITIAL_MEDIATORS.forEach((m) => {
          const docId = m.kd_med || m.temp_id || `MED-${Date.now()}`;
          batch.set(doc(db!, 'mediators', sanitizeDocId(docId)), cleanForFirestore(m));
        });
        await batch.commit().catch(e => console.warn('Mediator seed error:', e));
      } else {
        const cloudMediators: MediatorKontrak[] = [];
        snapshot.forEach((docSnap) => {
          cloudMediators.push(docSnap.data() as MediatorKontrak);
        });
        if (cloudMediators.length > 0) {
          saveToStorage(STORAGE_KEYS.MEDIATORS, cloudMediators);
          notifyAllListeners();
        }
      }
    }, (err) => console.warn('Firestore mediators sync warning:', err));

    // 5. Sync FU Logs
    const fuLogsCol = collection(db, 'fu_logs');
    onSnapshot(fuLogsCol, async (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db!);
        INITIAL_FU_LOGS.forEach((f) => {
          batch.set(doc(db!, 'fu_logs', sanitizeDocId(f.id)), cleanForFirestore(f));
        });
        await batch.commit().catch(e => console.warn('FU logs seed error:', e));
      } else {
        const cloudLogs: FULog[] = [];
        snapshot.forEach((docSnap) => {
          cloudLogs.push(docSnap.data() as FULog);
        });
        if (cloudLogs.length > 0) {
          saveToStorage(STORAGE_KEYS.FU_LOGS, cloudLogs);
          notifyAllListeners();
        }
      }
    }, (err) => console.warn('Firestore FU logs sync warning:', err));

  } catch (e) {
    console.warn('Firebase sync listener setup failed:', e);
  }
}

// Master Data APIs
export const DatabaseService = {
  subscribe(listener: StorageListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Cabang & Posko Management
  getCabangList(): Cabang[] {
    return getInitialOrStored<Cabang[]>(STORAGE_KEYS.CABANG, INITIAL_CABANG);
  },

  saveCabang(cabang: Cabang, isEdit: boolean = false, oldKdCabang?: string): { success: boolean; message: string } {
    const list = this.getCabangList();
    const cleanKd = cabang.kd_cabang.trim().toUpperCase();
    const cleanNama = cabang.nama_cabang.trim();
    const cleanWilayah = cabang.wilayah ? cabang.wilayah.trim() : 'Wilayah 1';

    if (!cleanKd || !cleanNama) {
      return { success: false, message: 'Kode Cabang dan Nama Cabang wajib diisi!' };
    }

    const duplicateIndex = list.findIndex(c => c.kd_cabang.toUpperCase() === cleanKd);
    if (!isEdit && duplicateIndex >= 0) {
      return { success: false, message: `Kode Cabang "${cleanKd}" sudah ada!` };
    }

    const newRecord: Cabang = { kd_cabang: cleanKd, nama_cabang: cleanNama, wilayah: cleanWilayah };

    if (isEdit && oldKdCabang) {
      const editIndex = list.findIndex(c => c.kd_cabang.toUpperCase() === oldKdCabang.toUpperCase());
      if (editIndex >= 0) {
        if (cleanKd !== oldKdCabang.toUpperCase() && duplicateIndex >= 0) {
          return { success: false, message: `Kode Cabang baru "${cleanKd}" sudah digunakan cabang lain!` };
        }
        list[editIndex] = newRecord;

        // If code changed, delete old doc from firestore
        if (db && cleanKd !== oldKdCabang.toUpperCase()) {
          deleteDoc(doc(db, 'cabang', sanitizeDocId(oldKdCabang))).catch(() => {});
        }

        // Also update referenced posko and users if code changed
        if (cleanKd !== oldKdCabang.toUpperCase()) {
          const poskos = this.getPoskoList();
          poskos.forEach(p => {
            if (p.kd_cabang.toUpperCase() === oldKdCabang.toUpperCase()) {
              p.kd_cabang = cleanKd;
              if (db) setDoc(doc(db, 'posko', sanitizeDocId(p.kd_posko)), cleanForFirestore(p)).catch(() => {});
            }
          });
          saveToStorage(STORAGE_KEYS.POSKO, poskos);

          const users = this.getUsers();
          users.forEach(u => {
            if (u.kd_cabang && u.kd_cabang.toUpperCase() === oldKdCabang.toUpperCase()) {
              u.kd_cabang = cleanKd;
              if (db) setDoc(doc(db, 'users', sanitizeDocId(u.id)), cleanForFirestore(u)).catch(() => {});
            }
          });
          saveToStorage(STORAGE_KEYS.USERS, users);

          const meds = this.getMediators();
          meds.forEach(m => {
            if (m.kd_cabang && m.kd_cabang.toUpperCase() === oldKdCabang.toUpperCase()) {
              m.kd_cabang = cleanKd;
              const docId = m.kd_med || m.temp_id;
              if (db && docId) setDoc(doc(db, 'mediators', sanitizeDocId(docId)), cleanForFirestore(m)).catch(() => {});
            }
          });
          saveToStorage(STORAGE_KEYS.MEDIATORS, meds);
        }
      } else {
        list.push(newRecord);
      }
    } else {
      list.push(newRecord);
    }

    saveToStorage(STORAGE_KEYS.CABANG, list);
    if (db) {
      setDoc(doc(db, 'cabang', sanitizeDocId(cleanKd)), cleanForFirestore(newRecord)).catch(e => console.warn('Firestore write cabang error:', e));
    }
    notifyAllListeners();
    return { success: true, message: `Cabang ${cleanKd} (${cleanNama}) berhasil disimpan!` };
  },

  deleteCabang(kd_cabang: string): boolean {
    const cleanKd = kd_cabang.toUpperCase();
    const cabangList = this.getCabangList().filter(c => c.kd_cabang.toUpperCase() !== cleanKd);
    saveToStorage(STORAGE_KEYS.CABANG, cabangList);

    // Also cascade remove posko under this branch
    const poskoList = this.getPoskoList().filter(p => p.kd_cabang.toUpperCase() !== cleanKd);
    saveToStorage(STORAGE_KEYS.POSKO, poskoList);

    if (db) {
      deleteDoc(doc(db, 'cabang', sanitizeDocId(cleanKd))).catch(() => {});
    }
    notifyAllListeners();
    return true;
  },

  getPoskoList(): Posko[] {
    return getInitialOrStored<Posko[]>(STORAGE_KEYS.POSKO, INITIAL_POSKO);
  },

  savePosko(posko: Posko, isEdit: boolean = false, oldKdPosko?: string): { success: boolean; message: string } {
    const list = this.getPoskoList();
    const cleanKd = posko.kd_posko.trim().toUpperCase();
    const cleanNama = posko.nama_posko.trim();
    const cleanCabang = posko.kd_cabang.trim().toUpperCase();

    if (!cleanKd || !cleanNama || !cleanCabang) {
      return { success: false, message: 'Kode Posko, Nama Posko, dan Cabang Induk wajib diisi!' };
    }

    const duplicateIndex = list.findIndex(p => p.kd_posko.toUpperCase() === cleanKd);
    if (!isEdit && duplicateIndex >= 0) {
      return { success: false, message: `Kode Posko "${cleanKd}" sudah ada!` };
    }

    const newRecord: Posko = { kd_posko: cleanKd, nama_posko: cleanNama, kd_cabang: cleanCabang };

    if (isEdit && oldKdPosko) {
      const editIndex = list.findIndex(p => p.kd_posko.toUpperCase() === oldKdPosko.toUpperCase());
      if (editIndex >= 0) {
        if (cleanKd !== oldKdPosko.toUpperCase() && duplicateIndex >= 0) {
          return { success: false, message: `Kode Posko baru "${cleanKd}" sudah digunakan posko lain!` };
        }
        list[editIndex] = newRecord;

        if (db && cleanKd !== oldKdPosko.toUpperCase()) {
          deleteDoc(doc(db, 'posko', sanitizeDocId(oldKdPosko))).catch(() => {});
        }

        // Also update referenced mediators and users
        if (cleanKd !== oldKdPosko.toUpperCase()) {
          const users = this.getUsers();
          users.forEach(u => {
            if (u.kd_posko && u.kd_posko.toUpperCase() === oldKdPosko.toUpperCase()) {
              u.kd_posko = cleanKd;
              if (db) setDoc(doc(db, 'users', sanitizeDocId(u.id)), cleanForFirestore(u)).catch(() => {});
            }
          });
          saveToStorage(STORAGE_KEYS.USERS, users);

          const meds = this.getMediators();
          meds.forEach(m => {
            if (m.kd_posko && m.kd_posko.toUpperCase() === oldKdPosko.toUpperCase()) {
              m.kd_posko = cleanKd;
              const docId = m.kd_med || m.temp_id;
              if (db && docId) setDoc(doc(db, 'mediators', sanitizeDocId(docId)), cleanForFirestore(m)).catch(() => {});
            }
          });
          saveToStorage(STORAGE_KEYS.MEDIATORS, meds);
        }
      } else {
        list.push(newRecord);
      }
    } else {
      list.push(newRecord);
    }

    saveToStorage(STORAGE_KEYS.POSKO, list);
    if (db) {
      setDoc(doc(db, 'posko', sanitizeDocId(cleanKd)), cleanForFirestore(newRecord)).catch(e => console.warn('Firestore write posko error:', e));
    }
    notifyAllListeners();
    return { success: true, message: `Posko ${cleanKd} (${cleanNama}) berhasil disimpan!` };
  },

  deletePosko(kd_posko: string): boolean {
    const cleanKd = kd_posko.toUpperCase();
    const poskoList = this.getPoskoList().filter(p => p.kd_posko.toUpperCase() !== cleanKd);
    saveToStorage(STORAGE_KEYS.POSKO, poskoList);

    if (db) {
      deleteDoc(doc(db, 'posko', sanitizeDocId(cleanKd))).catch(() => {});
    }
    notifyAllListeners();
    return true;
  },

  getPoskoByCabang(kd_cabang: string): Posko[] {
    const cleanKd = kd_cabang.toUpperCase();
    return this.getPoskoList().filter(p => p.kd_cabang.toUpperCase() === cleanKd);
  },

  // User Management
  getUsers(): User[] {
    return getInitialOrStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  saveUser(user: User, isEdit: boolean = false): { success: boolean; message: string } {
    const users = this.getUsers();
    if (!user.username.trim() || !user.nama.trim()) {
      return { success: false, message: 'Username dan Nama wajib diisi!' };
    }

    const cleanUsername = user.username.trim().toLowerCase();
    const existingIndex = users.findIndex(u => u.username.toLowerCase() === cleanUsername);

    if (!isEdit && existingIndex >= 0) {
      return { success: false, message: 'Username sudah digunakan!' };
    }

    let savedUser: User;

    if (isEdit) {
      const editIndex = users.findIndex(u => u.id === user.id);
      if (editIndex >= 0) {
        if (existingIndex >= 0 && existingIndex !== editIndex) {
          return { success: false, message: 'Username sudah digunakan oleh akun lain!' };
        }
        savedUser = {
          ...users[editIndex],
          ...user,
          username: cleanUsername,
          password: user.password || users[editIndex].password || '1234',
        };
        users[editIndex] = savedUser;
      } else {
        savedUser = { ...user, username: cleanUsername };
        users.push(savedUser);
      }
    } else {
      savedUser = {
        ...user,
        id: `USR-${Date.now().toString().slice(-6)}`,
        username: cleanUsername,
        password: user.password || '1234',
        must_change_password: true,
        status: user.status || 'AKTIF'
      };
      users.push(savedUser);
    }

    saveToStorage(STORAGE_KEYS.USERS, users);
    if (db) {
      setDoc(doc(db, 'users', sanitizeDocId(savedUser.id)), cleanForFirestore(savedUser)).catch(e => console.warn('Firestore write user error:', e));
    }
    notifyAllListeners();
    return { success: true, message: `Akun "${user.nama}" (@${cleanUsername}) berhasil disimpan ke sistem cloud!` };
  },

  resetUserPassword(userId: string): { success: boolean; message: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, message: 'Pengguna tidak ditemukan!' };
    }

    users[userIndex].password = '1234';
    users[userIndex].must_change_password = false;
    users[userIndex].last_password_change = new Date().toISOString();

    const updatedUser = users[userIndex];
    saveToStorage(STORAGE_KEYS.USERS, users);
    if (db) {
      setDoc(doc(db, 'users', sanitizeDocId(updatedUser.id)), cleanForFirestore(updatedUser)).catch(() => {});
    }
    notifyAllListeners();
    return { 
      success: true, 
      message: `Password akun ${updatedUser.nama} berhasil direset ke "1234".` 
    };
  },

  changeUserPassword(userId: string, newPassword: string): { success: boolean; message: string } {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, message: 'Pengguna tidak ditemukan!' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password harus memiliki panjang minimal 6 karakter!' };
    }

    if (newPassword === '1234') {
      return { success: false, message: 'Password baru tidak boleh sama dengan password default (1234)!' };
    }

    users[userIndex].password = newPassword;
    users[userIndex].must_change_password = false;
    users[userIndex].last_password_change = new Date().toISOString();

    const updatedUser = users[userIndex];
    saveToStorage(STORAGE_KEYS.USERS, users);
    if (db) {
      setDoc(doc(db, 'users', sanitizeDocId(updatedUser.id)), cleanForFirestore(updatedUser)).catch(() => {});
    }
    notifyAllListeners();
    return { success: true, message: 'Password berhasil diperbarui!' };
  },

  deleteUser(userId: string): boolean {
    const users = this.getUsers().filter(u => u.id !== userId);
    saveToStorage(STORAGE_KEYS.USERS, users);
    if (db) {
      deleteDoc(doc(db, 'users', sanitizeDocId(userId))).catch(() => {});
    }
    notifyAllListeners();
    return true;
  },

  // Mediator Management
  getMediators(): MediatorKontrak[] {
    return getInitialOrStored<MediatorKontrak[]>(STORAGE_KEYS.MEDIATORS, INITIAL_MEDIATORS);
  },

  submitMediator(params: {
    nama_mediator: string;
    no_tlpn: string;
    kd_ao: string;
    kd_posko: string;
    kd_cabang: string;
    catatan_admin?: string;
    created_by_user: string;
    created_by_role: string;
  }): { success: boolean; message: string; data?: MediatorKontrak } {
    const mediators = this.getMediators();

    if (params.nama_mediator.trim().length > 100) {
      return { success: false, message: 'Nama mediator melebihi batas maksimal 100 karakter!' };
    }

    if (!params.nama_mediator.trim()) {
      return { success: false, message: 'Nama mediator wajib diisi!' };
    }

    if (!params.no_tlpn.trim()) {
      return { success: false, message: 'Nomor telepon wajib diisi!' };
    }

    const pendingCount = mediators.filter(m => m.status === 'PENDING').length + 1;
    const tempCode = `PENDING-${String(pendingCount).padStart(3, '0')}`;
    const tempId = `TMP-${Date.now().toString().slice(-6)}`;

    const newMediator: MediatorKontrak = {
      kd_med: tempCode,
      temp_id: tempId,
      nama_mediator: params.nama_mediator.trim(),
      no_tlpn: params.no_tlpn.trim(),
      status: 'PENDING',
      kd_ao: params.kd_ao || 'AO-01',
      kd_posko: params.kd_posko || '',
      kd_cabang: params.kd_cabang || 'CAB-01',
      tgl_akhir_fu: null,
      created_at: new Date().toISOString(),
      created_by_user: params.created_by_user,
      created_by_role: (params.created_by_role as UserRole) || 'CMO',
      catatan_admin: params.catatan_admin || '',
    };

    mediators.push(newMediator);
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    if (db) {
      setDoc(doc(db, 'mediators', sanitizeDocId(newMediator.kd_med)), cleanForFirestore(newMediator)).catch(e => console.warn('Firestore write mediator error:', e));
    }
    notifyAllListeners();

    return { 
      success: true, 
      message: `Mediator "${params.nama_mediator}" berhasil diajukan dengan status PENDING (${tempCode}). Menunggu input KD MED oleh KAOPS/SUPER_ADMIN.`,
      data: newMediator
    };
  },

  registerMediator(params: {
    nama_mediator: string;
    no_tlpn: string;
    kd_ao?: string;
    kd_posko: string;
    kd_cabang: string;
    created_by_user?: string;
    created_by_role?: any;
    catatan_admin?: string;
  }): { success: boolean; message: string; data?: MediatorKontrak } {
    return this.submitMediator({
      nama_mediator: params.nama_mediator,
      no_tlpn: params.no_tlpn,
      kd_ao: params.kd_ao || 'AO-01',
      kd_posko: params.kd_posko,
      kd_cabang: params.kd_cabang,
      created_by_user: params.created_by_user || 'Petugas Registrasi',
      created_by_role: params.created_by_role || 'CMO',
      catatan_admin: params.catatan_admin
    });
  },

  validateAndActivateKdMed(params: {
    targetTempOrCode: string;
    new_kd_med: string;
    validated_by: string;
  }): { success: boolean; message: string } {
    const mediators = this.getMediators();
    const cleanKdMed = params.new_kd_med.trim().toUpperCase();

    if (!cleanKdMed) {
      return { success: false, message: 'Kode Mediator (KD MED) tidak boleh kosong!' };
    }

    const duplicate = mediators.find(
      m => m.kd_med.toUpperCase() === cleanKdMed && (m.temp_id !== params.targetTempOrCode && m.kd_med !== params.targetTempOrCode)
    );
    if (duplicate) {
      return { success: false, message: `Kode Mediator "${cleanKdMed}" sudah terdaftar untuk mediator "${duplicate.nama_mediator}"!` };
    }

    const index = mediators.findIndex(
      m => m.kd_med === params.targetTempOrCode || m.temp_id === params.targetTempOrCode
    );

    if (index === -1) {
      return { success: false, message: 'Data mediator pending tidak ditemukan!' };
    }

    const oldCode = mediators[index].kd_med;
    mediators[index].kd_med = cleanKdMed;
    mediators[index].status = 'AKTIF';
    mediators[index].validated_at = new Date().toISOString();
    mediators[index].validated_by = params.validated_by;

    const updatedMed = mediators[index];

    // Update any existing FU logs if referenced
    const logs = this.getFULogs();
    let logsUpdated = false;
    logs.forEach(log => {
      if (log.kd_med === oldCode) {
        log.kd_med = cleanKdMed;
        logsUpdated = true;
        if (db) setDoc(doc(db, 'fu_logs', sanitizeDocId(log.id)), cleanForFirestore(log)).catch(() => {});
      }
    });
    if (logsUpdated) {
      saveToStorage(STORAGE_KEYS.FU_LOGS, logs);
    }

    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    if (db) {
      if (oldCode !== cleanKdMed) {
        deleteDoc(doc(db, 'mediators', sanitizeDocId(oldCode))).catch(() => {});
      }
      setDoc(doc(db, 'mediators', sanitizeDocId(cleanKdMed)), cleanForFirestore(updatedMed)).catch(() => {});
    }
    notifyAllListeners();

    return {
      success: true,
      message: `Kode Mediator ${cleanKdMed} berhasil ditetapkan. Status mediator otomatis berubah menjadi AKTIF.`
    };
  },

  updateMediator(params: {
    kd_med: string;
    nama_mediator?: string;
    no_tlpn?: string;
    kd_ao?: string;
    kd_posko?: string;
    kd_cabang?: string;
    status?: MediatorStatus;
    catatan_admin?: string;
  }): { success: boolean; message: string } {
    const mediators = this.getMediators();
    const index = mediators.findIndex(m => m.kd_med === params.kd_med || m.temp_id === params.kd_med);

    if (index === -1) {
      return { success: false, message: 'Data mediator tidak ditemukan!' };
    }

    if (params.nama_mediator && params.nama_mediator.trim().length > 100) {
      return { success: false, message: 'Nama mediator maksimal 100 karakter!' };
    }

    mediators[index] = {
      ...mediators[index],
      nama_mediator: params.nama_mediator ? params.nama_mediator.trim() : mediators[index].nama_mediator,
      no_tlpn: params.no_tlpn ? params.no_tlpn.trim() : mediators[index].no_tlpn,
      kd_ao: params.kd_ao || mediators[index].kd_ao,
      kd_posko: params.kd_posko !== undefined ? params.kd_posko : mediators[index].kd_posko,
      kd_cabang: params.kd_cabang || mediators[index].kd_cabang,
      status: params.status || mediators[index].status,
      catatan_admin: params.catatan_admin !== undefined ? params.catatan_admin : mediators[index].catatan_admin
    };

    const updatedMed = mediators[index];
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    if (db) {
      const docId = updatedMed.kd_med || updatedMed.temp_id;
      if (docId) setDoc(doc(db, 'mediators', sanitizeDocId(docId)), cleanForFirestore(updatedMed)).catch(() => {});
    }
    notifyAllListeners();
    return { success: true, message: 'Perubahan data mediator berhasil disimpan.' };
  },

  deleteMediator(kd_med: string): boolean {
    const mediators = this.getMediators();
    const target = mediators.find(m => m.kd_med === kd_med || m.temp_id === kd_med);
    const filtered = mediators.filter(m => m.kd_med !== kd_med && m.temp_id !== kd_med);
    saveToStorage(STORAGE_KEYS.MEDIATORS, filtered);

    if (db && target) {
      const docId = target.kd_med || target.temp_id;
      if (docId) deleteDoc(doc(db, 'mediators', sanitizeDocId(docId))).catch(() => {});
    }
    notifyAllListeners();
    return true;
  },

  importMediators(
    importedItems: {
      kd_med: string;
      nama_mediator: string;
      no_tlpn: string;
      kd_cabang: string;
      kd_posko: string;
      kd_ao: string;
      status: MediatorStatus;
      tgl_akhir_fu?: string | null;
      catatan_admin?: string;
    }[],
    options: {
      mode: 'append' | 'replace';
      autoCreateCabangPosko?: boolean;
      importedBy: string;
    }
  ): { success: boolean; count: number; updatedCount: number; message: string } {
    let currentMediators = options.mode === 'replace' ? [] : this.getMediators();
    const cabangList = this.getCabangList();
    const poskoList = this.getPoskoList();

    let addedCount = 0;
    let updatedCount = 0;

    const newCabangs = new Map<string, string>();
    const newPoskos = new Map<string, { nama: string; cabang: string }>();

    for (const item of importedItems) {
      if (!item.nama_mediator || !item.no_tlpn) continue;

      const cleanKdMed = (item.kd_med || `MED-${Date.now().toString().slice(-4)}`).toUpperCase();
      const cleanCabang = (item.kd_cabang || 'CAB-01').toUpperCase();
      const cleanPosko = (item.kd_posko || 'PSK-01').toUpperCase();
      const cleanAo = (item.kd_ao || 'AO-01').toUpperCase();

      if (options.autoCreateCabangPosko) {
        if (!cabangList.some(c => c.kd_cabang.toUpperCase() === cleanCabang) && !newCabangs.has(cleanCabang)) {
          newCabangs.set(cleanCabang, `Cabang ${cleanCabang}`);
        }
        if (!poskoList.some(p => p.kd_posko.toUpperCase() === cleanPosko) && !newPoskos.has(cleanPosko)) {
          newPoskos.set(cleanPosko, { nama: `Posko ${cleanPosko}`, cabang: cleanCabang });
        }
      }

      const existingIndex = currentMediators.findIndex(m => m.kd_med.toUpperCase() === cleanKdMed);

      const record: MediatorKontrak = {
        kd_med: cleanKdMed,
        temp_id: `TMP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        nama_mediator: item.nama_mediator.trim(),
        no_tlpn: item.no_tlpn.trim(),
        kd_cabang: cleanCabang,
        kd_posko: cleanPosko,
        kd_ao: cleanAo,
        status: item.status || 'AKTIF',
        tgl_akhir_fu: item.tgl_akhir_fu || null,
        created_at: new Date().toISOString(),
        created_by_user: options.importedBy,
        created_by_role: 'SUPER_ADMIN',
        catatan_admin: item.catatan_admin || 'Imported via CSV Data Import'
      };

      if (existingIndex >= 0) {
        currentMediators[existingIndex] = record;
        updatedCount++;
      } else {
        currentMediators.push(record);
        addedCount++;
      }

      if (db) {
        setDoc(doc(db, 'mediators', sanitizeDocId(cleanKdMed)), cleanForFirestore(record)).catch(() => {});
      }
    }

    if (options.autoCreateCabangPosko) {
      newCabangs.forEach((nama, kd) => {
        const c: Cabang = { kd_cabang: kd, nama_cabang: nama, wilayah: 'Wilayah Operasional' };
        cabangList.push(c);
        if (db) setDoc(doc(db, 'cabang', sanitizeDocId(kd)), cleanForFirestore(c)).catch(() => {});
      });
      if (newCabangs.size > 0) {
        saveToStorage(STORAGE_KEYS.CABANG, cabangList);
      }

      newPoskos.forEach((data, kd) => {
        const p: Posko = { kd_posko: kd, nama_posko: data.nama, kd_cabang: data.cabang };
        poskoList.push(p);
        if (db) setDoc(doc(db, 'posko', sanitizeDocId(kd)), cleanForFirestore(p)).catch(() => {});
      });
      if (newPoskos.size > 0) {
        saveToStorage(STORAGE_KEYS.POSKO, poskoList);
      }
    }

    saveToStorage(STORAGE_KEYS.MEDIATORS, currentMediators);
    notifyAllListeners();

    return {
      success: true,
      count: addedCount,
      updatedCount,
      message: `Berhasil mengimpor ${addedCount} data mediator baru${updatedCount > 0 ? ` dan memperbarui ${updatedCount} data yang sudah ada` : ''}.`
    };
  },

  // Follow-Up Logs
  getFULogs(): FULog[] {
    return getInitialOrStored<FULog[]>(STORAGE_KEYS.FU_LOGS, INITIAL_FU_LOGS);
  },

  getLast5FULogs(): FULog[] {
    const logs = this.getFULogs();
    return [...logs]
      .sort((a, b) => new Date(b.tgl_fu).getTime() - new Date(a.tgl_fu).getTime())
      .slice(0, 5);
  },

  getFULogsByMediator(kd_med: string): FULog[] {
    const logs = this.getFULogs();
    return logs
      .filter(l => l.kd_med === kd_med)
      .sort((a, b) => new Date(b.tgl_fu).getTime() - new Date(a.tgl_fu).getTime());
  },

  submitFollowUp(params: {
    kd_med: string;
    hasil_fu: HasilFU;
    catatan_fu: string;
    user_fu: string;
    kd_ao: string;
    kd_posko: string;
    kd_cabang: string;
  }): { success: boolean; message: string; log?: FULog } {
    if (params.catatan_fu.length > 100) {
      return { success: false, message: 'Catatan FU melebihi batas maksimal 100 karakter!' };
    }

    const mediators = this.getMediators();
    const medIndex = mediators.findIndex(m => m.kd_med === params.kd_med || m.temp_id === params.kd_med);

    if (medIndex === -1) {
      return { success: false, message: 'Mediator tidak ditemukan!' };
    }

    const mediator = mediators[medIndex];
    const todayIsoDate = new Date().toISOString().split('T')[0];
    const nowIsoDateTime = new Date().toISOString();

    const newLog: FULog = {
      id: `FU-${Date.now().toString().slice(-6)}`,
      kd_med: mediator.kd_med,
      nama_mediator: mediator.nama_mediator,
      tgl_fu: nowIsoDateTime,
      hasil_fu: params.hasil_fu,
      catatan_fu: params.catatan_fu.trim(),
      user_fu: params.user_fu,
      kd_ao: params.kd_ao || mediator.kd_ao,
      kd_posko: params.kd_posko || mediator.kd_posko,
      kd_cabang: params.kd_cabang || mediator.kd_cabang,
    };

    const logs = this.getFULogs();
    logs.unshift(newLog);
    saveToStorage(STORAGE_KEYS.FU_LOGS, logs);

    mediators[medIndex].tgl_akhir_fu = todayIsoDate;
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);

    if (db) {
      setDoc(doc(db, 'fu_logs', sanitizeDocId(newLog.id)), cleanForFirestore(newLog)).catch(() => {});
      const medDocId = mediator.kd_med || mediator.temp_id;
      if (medDocId) {
        setDoc(doc(db, 'mediators', sanitizeDocId(medDocId)), cleanForFirestore(mediators[medIndex])).catch(() => {});
      }
    }

    notifyAllListeners();

    return {
      success: true,
      message: `Follow-Up untuk ${mediator.nama_mediator} (${mediator.kd_med}) berhasil disimpan!`,
      log: newLog
    };
  },

  getFullSystemBackup(exportedBy: string = 'SUPER_ADMIN'): SystemFullBackup {
    return {
      meta: {
        appName: 'MED CONTROL BAF - MEDIATOR MANAGEMENT SYSTEM',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        exportedBy,
        environment: 'Production Cloud'
      },
      data: {
        users: this.getUsers(),
        cabang: this.getCabangList(),
        posko: this.getPoskoList(),
        mediators: this.getMediators(),
        fu_logs: this.getFULogs()
      }
    };
  },

  restoreFullSystemBackup(backup: SystemFullBackup): { success: boolean; message: string } {
    try {
      if (!backup || !backup.data) {
        return { success: false, message: 'Format file backup tidak valid!' };
      }
      const { users, cabang, posko, mediators, fu_logs } = backup.data;
      if (!Array.isArray(users) || !Array.isArray(cabang) || !Array.isArray(mediators)) {
        return { success: false, message: 'Struktur data backup tidak lengkap!' };
      }

      saveToStorage(STORAGE_KEYS.USERS, users);
      saveToStorage(STORAGE_KEYS.CABANG, cabang);
      saveToStorage(STORAGE_KEYS.POSKO, Array.isArray(posko) ? posko : INITIAL_POSKO);
      saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
      saveToStorage(STORAGE_KEYS.FU_LOGS, Array.isArray(fu_logs) ? fu_logs : []);

      if (db) {
        const batch = writeBatch(db);
        users.forEach(u => batch.set(doc(db!, 'users', sanitizeDocId(u.id)), cleanForFirestore(u)));
        cabang.forEach(c => batch.set(doc(db!, 'cabang', sanitizeDocId(c.kd_cabang)), cleanForFirestore(c)));
        (posko || INITIAL_POSKO).forEach(p => batch.set(doc(db!, 'posko', sanitizeDocId(p.kd_posko)), cleanForFirestore(p)));
        mediators.forEach(m => batch.set(doc(db!, 'mediators', sanitizeDocId(m.kd_med || m.temp_id)), cleanForFirestore(m)));
        (fu_logs || []).forEach(f => batch.set(doc(db!, 'fu_logs', sanitizeDocId(f.id)), cleanForFirestore(f)));
        batch.commit().catch(e => console.warn('Restore sync batch warning:', e));
      }

      notifyAllListeners();
      return {
        success: true,
        message: `Database berhasil dipulihkan! (${users.length} User, ${cabang.length} Cabang, ${mediators.length} Mediator, ${fu_logs?.length || 0} Log FU)`
      };
    } catch (err: any) {
      return { success: false, message: `Gagal restore database: ${err.message}` };
    }
  },

  resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.CABANG, JSON.stringify(INITIAL_CABANG));
    localStorage.setItem(STORAGE_KEYS.POSKO, JSON.stringify(INITIAL_POSKO));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(INITIAL_MEDIATORS));
    localStorage.setItem(STORAGE_KEYS.FU_LOGS, JSON.stringify(INITIAL_FU_LOGS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    notifyAllListeners();
  }
};
