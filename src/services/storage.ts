import { Cabang, Posko, User, UserRole, MediatorKontrak, FULog, MediatorStatus, HasilFU, ExCustomer, ExCustomerFULog, StatusKreditLunas, HasilFUExCustomer } from '../types';
import { INITIAL_CABANG, INITIAL_POSKO, INITIAL_USERS, INITIAL_MEDIATORS, INITIAL_FU_LOGS, INITIAL_EX_CUSTOMERS, INITIAL_EX_CUSTOMER_FU_LOGS } from '../data/initialData';
import { db, auth, firebaseConfigData } from './firebase';
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
  EX_CUSTOMERS: 'med_control_ex_customers_v2',
  EX_CUSTOMER_FU_LOGS: 'med_control_ex_customer_fu_logs_v2',
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

/**
 * P0-2C.12 Structured Firestore Write Logging
 */
export function logFirestoreWrite(params: {
  collection: string;
  documentId: string;
  operation?: 'create' | 'update' | 'delete' | 'set' | 'batch';
  method?: string;
  uid?: string | null;
  businessUserId?: string | null;
  role?: string | null;
  status?: string | null;
  result: 'SUCCESS' | 'FAILED';
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const activeUid = params.uid ?? auth?.currentUser?.uid ?? null;
  const currentProjectId = firebaseConfigData?.projectId || 'kamm-manado';
  const currentDbId = (firebaseConfigData as any)?.firestoreDatabaseId || 'ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e';
  const path = `${params.collection}/${params.documentId}`;

  if (params.result === 'FAILED') {
    console.error('[FORENSIC-FIRESTORE-DENIED]', {
      operation: params.operation || 'write',
      path,
      method: params.method || 'setDoc',
      projectId: currentProjectId,
      databaseId: currentDbId,
      authUid: activeUid,
      errorCode: params.errorCode || 'unknown',
      errorMessage: params.errorMessage || 'Unknown Firestore error'
    });
  }

  console.log(
    `[FS-WRITE] collection=${params.collection} documentId=${params.documentId} uid=${activeUid || 'null'} businessUserId=${params.businessUserId || 'null'} role=${params.role || 'null'} status=${params.status || 'null'} result=${params.result}${params.errorCode ? ` errorCode=${params.errorCode}` : ''}${params.errorMessage ? ` errorMessage="${params.errorMessage}"` : ''}`
  );
}

// Setup real-time listeners to Firestore for cloud sync
let activeSyncUnsubscribers: (() => void)[] = [];
let activeSyncKey: string | null = null;

export function stopFirebaseSync() {
  const previousKey = activeSyncKey;
  const count = activeSyncUnsubscribers.length;
  if (activeSyncUnsubscribers.length > 0) {
    activeSyncUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (err) {
        console.warn('Error unsubscribing sync listener:', err);
      }
    });
    activeSyncUnsubscribers = [];
  }
  activeSyncKey = null;
  if (count > 0 || previousKey) {
    console.log(`[SYNC-LIFECYCLE] action=stop syncKey=${previousKey} unsubscribeCount=${count}`);
  }
}

export function startFirebaseSync(currentUser: User | null = null, authenticatedUid?: string | null) {
  if (!db || !auth) return;

  const currentAuthUid = authenticatedUid || auth.currentUser?.uid;
  if (!currentAuthUid) {
    // Unauthenticated: Abort to prevent permission denial
    stopFirebaseSync();
    return;
  }

  // If no active user or user is inactive, clean up existing listeners and do not attach new ones
  if (!currentUser || currentUser.status !== 'AKTIF') {
    stopFirebaseSync();
    return;
  }

  const syncKey = `${currentUser.id}_${currentAuthUid}_${currentUser.role}_${currentUser.status}`;
  if (activeSyncKey === syncKey && activeSyncUnsubscribers.length > 0) {
    return; // Already actively syncing for this user session
  }

  // Clean up any previous session listeners
  stopFirebaseSync();
  activeSyncKey = syncKey;

  console.log(`[SYNC-LIFECYCLE] action=start uid=${currentAuthUid} role=${currentUser.role} status=${currentUser.status} syncKey=${syncKey}`);

  try {
    // 1. Sync Users
    console.log(`[FS-SYNC-DEBUG] collection=users operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snapshot) => {
      console.log(`[FS-SNAPSHOT] collection=users documentCount=${snapshot.size}`);
      const cloudUsers: User[] = snapshot.docs.map(docSnap => docSnap.data() as User);
      saveToStorage(STORAGE_KEYS.USERS, cloudUsers);
      notifyAllListeners();
    }, (err) => console.warn('[FS-SYNC-ERROR] collection=users onSnapshot error:', err));
    activeSyncUnsubscribers.push(unsubUsers);

    // 2. Sync Cabang
    console.log(`[FS-SYNC-DEBUG] collection=cabang operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
    const cabangCol = collection(db, 'cabang');
    const unsubCabang = onSnapshot(cabangCol, (snapshot) => {
      console.log(`[FS-SNAPSHOT] collection=cabang documentCount=${snapshot.size}`);
      const cloudCabang: Cabang[] = snapshot.docs.map(docSnap => docSnap.data() as Cabang);
      saveToStorage(STORAGE_KEYS.CABANG, cloudCabang);
      notifyAllListeners();
    }, (err) => console.warn('[FS-SYNC-ERROR] collection=cabang onSnapshot error:', err));
    activeSyncUnsubscribers.push(unsubCabang);

    // 3. Sync Posko
    console.log(`[FS-SYNC-DEBUG] collection=posko operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
    const poskoCol = collection(db, 'posko');
    const unsubPosko = onSnapshot(poskoCol, (snapshot) => {
      console.log(`[FS-SNAPSHOT] collection=posko documentCount=${snapshot.size}`);
      const cloudPosko: Posko[] = snapshot.docs.map(docSnap => docSnap.data() as Posko);
      saveToStorage(STORAGE_KEYS.POSKO, cloudPosko);
      notifyAllListeners();
    }, (err) => console.warn('[FS-SYNC-ERROR] collection=posko onSnapshot error:', err));
    activeSyncUnsubscribers.push(unsubPosko);

    // 4. Sync Mediators (Isolated: ADMIN_BPKB is forbidden from mediator collection)
    if (currentUser.role !== 'ADMIN_BPKB') {
      console.log(
        "[CROSS-DEVICE-SYNC]",
        {
          collection: "mediators",
          firebaseAuthUid: currentAuthUid ?? null,
          businessUserId: currentUser?.id ?? null,
          role: currentUser?.role ?? null
        }
      );
      console.log(`[FS-SYNC-DEBUG] collection=mediators operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
      const mediatorsCol = collection(db, 'mediators');
      const unsubMediators = onSnapshot(mediatorsCol, (snapshot) => {
        console.log(`[FS-SNAPSHOT] collection=mediators documentCount=${snapshot.size}`);
        console.log(
          "[FIRESTORE-SNAPSHOT]",
          {
            collection: "mediators",
            documentCount: snapshot.size,
            documents: snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            }))
          }
        );
        const cloudMediators: MediatorKontrak[] = snapshot.docs.map(docSnap => docSnap.data() as MediatorKontrak);
        saveToStorage(STORAGE_KEYS.MEDIATORS, cloudMediators);
        notifyAllListeners();
      }, (err) => {
        console.error(
          "[FIRESTORE-SNAPSHOT-ERROR]",
          err
        );
      });
      activeSyncUnsubscribers.push(unsubMediators);

      // 5. Sync FU Logs (Isolated: ADMIN_BPKB is forbidden from fu_logs collection)
      console.log(`[FS-SYNC-DEBUG] collection=fu_logs operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
      const fuLogsCol = collection(db, 'fu_logs');
      const unsubFuLogs = onSnapshot(fuLogsCol, (snapshot) => {
        console.log(`[FS-SNAPSHOT] collection=fu_logs documentCount=${snapshot.size}`);
        const cloudLogs: FULog[] = snapshot.docs.map(docSnap => docSnap.data() as FULog);
        saveToStorage(STORAGE_KEYS.FU_LOGS, cloudLogs);
        notifyAllListeners();
      }, (err) => console.warn('[FS-SYNC-ERROR] collection=fu_logs onSnapshot error:', err));
      activeSyncUnsubscribers.push(unsubFuLogs);
    }

    // 6. Sync Ex-Customers
    console.log(`[FS-SYNC-DEBUG] collection=ex_customers operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
    const exCustCol = collection(db, 'ex_customers');
    const unsubExCust = onSnapshot(exCustCol, (snapshot) => {
      console.log(`[FS-SNAPSHOT] collection=ex_customers documentCount=${snapshot.size}`);
      const cloudEx: ExCustomer[] = snapshot.docs.map(docSnap => docSnap.data() as ExCustomer);
      saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, cloudEx);
      notifyAllListeners();
    }, (err) => console.warn('[FS-SYNC-ERROR] collection=ex_customers onSnapshot error:', err));
    activeSyncUnsubscribers.push(unsubExCust);

    // 7. Sync Ex-Customer FU Logs
    console.log(`[FS-SYNC-DEBUG] collection=ex_customer_fu_logs operation=onSnapshot firebaseAuthUid=${currentAuthUid} businessUserId=${currentUser.id} role=${currentUser.role} status=${currentUser.status} activeSyncKey=${syncKey}`);
    const exLogsCol = collection(db, 'ex_customer_fu_logs');
    const unsubExLogs = onSnapshot(exLogsCol, (snapshot) => {
      console.log(`[FS-SNAPSHOT] collection=ex_customer_fu_logs documentCount=${snapshot.size}`);
      const cloudExLogs: ExCustomerFULog[] = snapshot.docs.map(docSnap => docSnap.data() as ExCustomerFULog);
      saveToStorage(STORAGE_KEYS.EX_CUSTOMER_FU_LOGS, cloudExLogs);
      notifyAllListeners();
    }, (err) => console.warn('[FS-SYNC-ERROR] collection=ex_customer_fu_logs onSnapshot error:', err));
    activeSyncUnsubscribers.push(unsubExLogs);

  } catch (e) {
    console.warn('Firebase sync listener setup failed:', e);
  }
}

export function initializeFirebaseSync(user?: User | null, authenticatedUid?: string | null) {
  startFirebaseSync(user || null, authenticatedUid || null);
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

  async saveCabang(cabang: Cabang, isEdit: boolean = false, oldKdCabang?: string): Promise<{ success: boolean; message: string }> {
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

    if (db) {
      try {
        const docId = sanitizeDocId(cleanKd);
        await setDoc(doc(db, 'cabang', docId), cleanForFirestore(newRecord));
        logFirestoreWrite({
          collection: 'cabang',
          documentId: cleanKd,
          result: 'SUCCESS'
        });

        if (isEdit && oldKdCabang && cleanKd !== oldKdCabang.toUpperCase()) {
          await deleteDoc(doc(db, 'cabang', sanitizeDocId(oldKdCabang))).catch(() => {});
        }
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'cabang',
          documentId: cleanKd,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menyimpan cabang ke Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    if (isEdit && oldKdCabang) {
      const editIndex = list.findIndex(c => c.kd_cabang.toUpperCase() === oldKdCabang.toUpperCase());
      if (editIndex >= 0) {
        list[editIndex] = newRecord;
      } else {
        list.push(newRecord);
      }
    } else {
      list.push(newRecord);
    }

    saveToStorage(STORAGE_KEYS.CABANG, list);
    notifyAllListeners();
    return { success: true, message: `Cabang ${cleanKd} (${cleanNama}) berhasil disimpan!` };
  },

  async deleteCabang(kd_cabang: string): Promise<{ success: boolean; message: string }> {
    const cleanKd = kd_cabang.toUpperCase();

    if (db) {
      try {
        await deleteDoc(doc(db, 'cabang', sanitizeDocId(cleanKd)));
        logFirestoreWrite({
          collection: 'cabang',
          documentId: cleanKd,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'cabang',
          documentId: cleanKd,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal menghapus cabang: ${err?.message || 'Permission denied'}` };
      }
    }

    const cabangList = this.getCabangList().filter(c => c.kd_cabang.toUpperCase() !== cleanKd);
    saveToStorage(STORAGE_KEYS.CABANG, cabangList);

    const poskoList = this.getPoskoList().filter(p => p.kd_cabang.toUpperCase() !== cleanKd);
    saveToStorage(STORAGE_KEYS.POSKO, poskoList);

    notifyAllListeners();
    return { success: true, message: `Cabang ${cleanKd} berhasil dihapus.` };
  },

  getPoskoList(): Posko[] {
    return getInitialOrStored<Posko[]>(STORAGE_KEYS.POSKO, INITIAL_POSKO);
  },

  async savePosko(posko: Posko, isEdit: boolean = false, oldKdPosko?: string): Promise<{ success: boolean; message: string }> {
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

    if (db) {
      try {
        const docId = sanitizeDocId(cleanKd);
        await setDoc(doc(db, 'posko', docId), cleanForFirestore(newRecord));
        logFirestoreWrite({
          collection: 'posko',
          documentId: cleanKd,
          result: 'SUCCESS'
        });

        if (isEdit && oldKdPosko && cleanKd !== oldKdPosko.toUpperCase()) {
          await deleteDoc(doc(db, 'posko', sanitizeDocId(oldKdPosko))).catch(() => {});
        }
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'posko',
          documentId: cleanKd,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menyimpan posko ke Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    if (isEdit && oldKdPosko) {
      const editIndex = list.findIndex(p => p.kd_posko.toUpperCase() === oldKdPosko.toUpperCase());
      if (editIndex >= 0) {
        list[editIndex] = newRecord;
      } else {
        list.push(newRecord);
      }
    } else {
      list.push(newRecord);
    }

    saveToStorage(STORAGE_KEYS.POSKO, list);
    notifyAllListeners();
    return { success: true, message: `Posko ${cleanKd} (${cleanNama}) berhasil disimpan!` };
  },

  async deletePosko(kd_posko: string): Promise<{ success: boolean; message: string }> {
    const cleanKd = kd_posko.toUpperCase();

    if (db) {
      try {
        await deleteDoc(doc(db, 'posko', sanitizeDocId(cleanKd)));
        logFirestoreWrite({
          collection: 'posko',
          documentId: cleanKd,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'posko',
          documentId: cleanKd,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal menghapus posko: ${err?.message || 'Permission denied'}` };
      }
    }

    const poskoList = this.getPoskoList().filter(p => p.kd_posko.toUpperCase() !== cleanKd);
    saveToStorage(STORAGE_KEYS.POSKO, poskoList);

    notifyAllListeners();
    return { success: true, message: `Posko ${cleanKd} berhasil dihapus.` };
  },

  getPoskoByCabang(kd_cabang: string): Posko[] {
    const cleanKd = kd_cabang.toUpperCase();
    return this.getPoskoList().filter(p => p.kd_cabang.toUpperCase() === cleanKd);
  },

  // User Management
  getUsers(): User[] {
    return getInitialOrStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  async saveUser(user: User, isEdit: boolean = false): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    if (!user.username.trim() || !user.nama.trim()) {
      return { success: false, message: 'Username dan Nama wajib diisi!' };
    }

    const cleanUsername = user.username.trim().toLowerCase();
    const cleanAo = (user.kd_ao || user.username).trim().toUpperCase();

    // Clear branch/posko for national roles
    if (user.role === 'SUPER_ADMIN' || user.role === 'RM' || user.role === 'ADMIN_BPKB') {
      user.kd_cabang = undefined;
      user.kd_posko = undefined;
    }

    // Check duplicate username (excluding current user on edit)
    const existingUserIndex = users.findIndex(
      u => u.username.toLowerCase() === cleanUsername && (!isEdit || u.id !== user.id)
    );
    if (existingUserIndex >= 0) {
      return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain! Username harus unik.` };
    }

    // Check duplicate Kode AO (excluding current user on edit)
    if (cleanAo) {
      const existingAoIndex = users.findIndex(
        u => (u.kd_ao || '').toUpperCase() === cleanAo && (!isEdit || u.id !== user.id)
      );
      if (existingAoIndex >= 0) {
        return { success: false, message: `Kode AO "${cleanAo}" sudah digunakan oleh pengguna "${users[existingAoIndex].nama}"! Kode AO harus unik.` };
      }
    }

    let savedUser: User;

    if (isEdit) {
      const editIndex = users.findIndex(u => u.id === user.id);
      if (editIndex >= 0) {
        savedUser = {
          ...users[editIndex],
          ...user,
          username: cleanUsername,
          kd_ao: cleanAo,
          password: user.password || users[editIndex].password || '1234',
        };
      } else {
        savedUser = { ...user, username: cleanUsername, kd_ao: cleanAo };
      }
    } else {
      savedUser = {
        ...user,
        id: user.id || `USR-${Date.now().toString().slice(-6)}`,
        username: cleanUsername,
        kd_ao: cleanAo,
        password: user.password || '1234',
        must_change_password: false,
        status: user.status || 'AKTIF'
      };
    }

    if (db) {
      try {
        const docId = sanitizeDocId(savedUser.id);
        await setDoc(doc(db, 'users', docId), cleanForFirestore(savedUser));
        logFirestoreWrite({
          collection: 'users',
          documentId: savedUser.id,
          result: 'SUCCESS'
        });

        if (savedUser.firebase_uid) {
          await setDoc(doc(db, 'user_auth', sanitizeDocId(savedUser.firebase_uid)), cleanForFirestore({
            user_id: savedUser.id,
            linked_at: new Date().toISOString(),
            email: savedUser.email,
            status: savedUser.status
          }), { merge: true }).catch(() => {});
        }
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'users',
          documentId: savedUser.id,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menyimpan user ke Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    if (isEdit) {
      const editIndex = users.findIndex(u => u.id === user.id);
      if (editIndex >= 0) {
        users[editIndex] = savedUser;
      } else {
        users.push(savedUser);
      }
    } else {
      users.push(savedUser);
    }

    saveToStorage(STORAGE_KEYS.USERS, users);
    notifyAllListeners();
    return { success: true, message: `Akun "${user.nama}" (@${cleanUsername} / ${cleanAo}) berhasil disimpan ke sistem cloud!` };
  },

  async resetUserPassword(userId: string): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, message: 'Pengguna tidak ditemukan!' };
    }

    const updatedUser: User = {
      ...users[userIndex],
      password: '1234',
      must_change_password: false,
      last_password_change: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', sanitizeDocId(updatedUser.id)), cleanForFirestore(updatedUser));
        logFirestoreWrite({
          collection: 'users',
          documentId: updatedUser.id,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'users',
          documentId: updatedUser.id,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal reset password di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    users[userIndex] = updatedUser;
    saveToStorage(STORAGE_KEYS.USERS, users);
    notifyAllListeners();
    return { 
      success: true, 
      message: `Password akun ${updatedUser.nama} berhasil direset ke "1234".` 
    };
  },

  async changeUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
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

    const updatedUser: User = {
      ...users[userIndex],
      password: newPassword,
      must_change_password: false,
      last_password_change: new Date().toISOString()
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', sanitizeDocId(updatedUser.id)), cleanForFirestore(updatedUser));
        logFirestoreWrite({
          collection: 'users',
          documentId: updatedUser.id,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'users',
          documentId: updatedUser.id,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal mengubah password di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    users[userIndex] = updatedUser;
    saveToStorage(STORAGE_KEYS.USERS, users);
    notifyAllListeners();
    return { success: true, message: 'Password berhasil diperbarui!' };
  },

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    const targetUser = users.find(u => u.id === userId);

    if (db) {
      try {
        await deleteDoc(doc(db, 'users', sanitizeDocId(userId)));
        if (targetUser?.firebase_uid) {
          await deleteDoc(doc(db, 'user_auth', sanitizeDocId(targetUser.firebase_uid))).catch(() => {});
        }
        logFirestoreWrite({
          collection: 'users',
          documentId: userId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'users',
          documentId: userId,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal menghapus user di Firestore: ${err?.message || 'Permission denied'}` };
      }
    }

    const filtered = users.filter(u => u.id !== userId);
    saveToStorage(STORAGE_KEYS.USERS, filtered);
    notifyAllListeners();
    return { success: true, message: 'User berhasil dihapus.' };
  },

  // Mediator Management
  getMediators(): MediatorKontrak[] {
    return getInitialOrStored<MediatorKontrak[]>(STORAGE_KEYS.MEDIATORS, INITIAL_MEDIATORS);
  },

  async submitMediator(params: {
    nama_mediator: string;
    no_tlpn: string;
    kd_ao: string;
    kd_posko: string;
    kd_cabang: string;
    catatan_admin?: string;
    created_by_user: string;
    created_by_role: string;
  }): Promise<{ success: boolean; message: string; data?: MediatorKontrak }> {
    const mediators = this.getMediators();

    if (!params.nama_mediator?.trim()) {
      return { success: false, message: 'Nama mediator wajib diisi!' };
    }

    if (params.nama_mediator.trim().length > 100) {
      return { success: false, message: 'Nama mediator melebihi batas maksimal 100 karakter!' };
    }

    if (!params.no_tlpn?.trim()) {
      return { success: false, message: 'Nomor telepon wajib diisi!' };
    }

    const cleanRole = (params.created_by_role as UserRole) || 'CMO';
    const cleanAo = (params.kd_ao || '').trim().toUpperCase();
    const cleanCabang = (params.kd_cabang || '').trim().toUpperCase();
    const cleanPosko = (params.kd_posko || '').trim().toUpperCase();

    // Strict Scope Verification before interacting with Firestore
    if (cleanRole === 'CMO') {
      if (!cleanAo || !cleanCabang || !cleanPosko) {
        return {
          success: false,
          message: 'Data scope CMO tidak lengkap (Kode AO, Cabang, dan Posko wajib ada). Silakan hubungi Administrator.'
        };
      }
    } else if (cleanRole === 'KAPOS' || cleanRole === 'ADM') {
      if (!cleanCabang || !cleanPosko) {
        return {
          success: false,
          message: `Data scope ${cleanRole} tidak lengkap (Cabang dan Posko wajib ada).`
        };
      }
    } else if (cleanRole === 'KAOPS') {
      if (!cleanCabang) {
        return {
          success: false,
          message: 'Data scope KAOPS tidak lengkap (Cabang wajib ada).'
        };
      }
    }

    const draftCount = mediators.filter(m => m.status === 'BELUM_AKTIF').length + 1;
    const tempCode = `DRAFT-${String(draftCount).padStart(3, '0')}`;
    const tempId = `TMP-${Date.now().toString().slice(-6)}`;

    const newMediator: MediatorKontrak = {
      kd_med: tempCode,
      temp_id: tempId,
      nama_mediator: params.nama_mediator.trim(),
      no_tlpn: params.no_tlpn.trim(),
      status: 'BELUM_AKTIF',
      kd_ao: cleanAo,
      kd_posko: cleanPosko,
      kd_cabang: cleanCabang,
      tgl_akhir_fu: null,
      created_at: new Date().toISOString(),
      created_by_user: (params.created_by_user || 'Petugas Registrasi').trim(),
      created_by_role: cleanRole,
      catatan_admin: (params.catatan_admin || '').trim(),
    };

    const currentAuthUid = auth?.currentUser?.uid || null;
    const currentProjectId = firebaseConfigData?.projectId || 'kamm-manado';
    const currentDbId = (firebaseConfigData as any)?.firestoreDatabaseId || 'ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e';
    const docId = sanitizeDocId(newMediator.temp_id || newMediator.kd_med);

    console.log('[FORENSIC-MEDIATOR-WRITE-START]', {
      projectId: currentProjectId,
      databaseId: currentDbId,
      collection: 'mediators',
      documentId: docId,
      authUid: currentAuthUid,
      userId: (params as any)?.userId || cleanAo,
      role: cleanRole,
      status: newMediator.status,
      kd_ao: newMediator.kd_ao,
      kd_cabang: newMediator.kd_cabang,
      kd_posko: newMediator.kd_posko
    });

    console.log('[FORENSIC-MEDIATOR-WRITE]', {
      projectId: currentProjectId,
      databaseId: currentDbId,
      collection: 'mediators',
      documentId: docId,
      authUid: currentAuthUid,
      status: newMediator.status,
      kd_ao: newMediator.kd_ao,
      kd_cabang: newMediator.kd_cabang,
      kd_posko: newMediator.kd_posko
    });

    if (db) {
      try {
        await setDoc(doc(db, 'mediators', docId), cleanForFirestore(newMediator));
        
        console.log('[FORENSIC-MEDIATOR-RESULT]', {
          result: 'SUCCESS',
          documentId: docId,
          projectId: currentProjectId,
          databaseId: currentDbId,
          authUid: currentAuthUid
        });

        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          operation: 'create',
          method: 'setDoc',
          role: cleanRole,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        const errorCode = err?.code || 'unknown';
        const errorMessage = err?.message || String(err);

        console.error('[FORENSIC-FIRESTORE-DENIED]', {
          operation: 'create',
          path: `mediators/${docId}`,
          method: 'setDoc',
          projectId: currentProjectId,
          databaseId: currentDbId,
          authUid: currentAuthUid,
          errorCode,
          errorMessage
        });

        console.error('[FORENSIC-MEDIATOR-ERROR]', {
          result: 'FAILED',
          documentId: docId,
          errorCode,
          errorMessage,
          projectId: currentProjectId,
          databaseId: currentDbId,
          authUid: currentAuthUid,
          payloadSummary: {
            status: newMediator.status,
            kd_ao: newMediator.kd_ao,
            kd_cabang: newMediator.kd_cabang,
            kd_posko: newMediator.kd_posko
          }
        });

        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          operation: 'create',
          method: 'setDoc',
          role: cleanRole,
          result: 'FAILED',
          errorCode,
          errorMessage
        });
        return {
          success: false,
          message: `Gagal menyimpan mediator ke Firestore: ${errorMessage || 'Permission denied'}`
        };
      }
    }

    mediators.push(newMediator);
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    notifyAllListeners();

    return { 
      success: true, 
      message: `Mediator "${newMediator.nama_mediator}" berhasil diajukan dengan status BELUM AKTIF (${tempCode}). Menunggu peninjauan berkas oleh Admin.`,
      data: newMediator
    };
  },

  async registerMediator(params: {
    nama_mediator: string;
    no_tlpn: string;
    kd_ao?: string;
    kd_posko: string;
    kd_cabang: string;
    created_by_user?: string;
    created_by_role?: any;
    catatan_admin?: string;
  }): Promise<{ success: boolean; message: string; data?: MediatorKontrak }> {
    return this.submitMediator({
      nama_mediator: params.nama_mediator,
      no_tlpn: params.no_tlpn,
      kd_ao: params.kd_ao || '',
      kd_posko: params.kd_posko || '',
      kd_cabang: params.kd_cabang || '',
      created_by_user: params.created_by_user || 'Petugas Registrasi',
      created_by_role: params.created_by_role || 'CMO',
      catatan_admin: params.catatan_admin
    });
  },

  // Tahap 2: Admin melakukan peninjauan berkas -> Mengubah status BELUM_AKTIF menjadi PENDING
  async reviewAndApproveToPending(params: {
    targetTempOrCode: string;
    reviewed_by: string;
    catatan_admin?: string;
  }): Promise<{ success: boolean; message: string }> {
    const mediators = this.getMediators();
    const index = mediators.findIndex(
      m => m.kd_med === params.targetTempOrCode || m.temp_id === params.targetTempOrCode
    );

    if (index === -1) {
      return { success: false, message: 'Data mediator tidak ditemukan!' };
    }

    const pendingCount = mediators.filter(m => m.status === 'PENDING').length + 1;
    const pendingCode = `PENDING-${String(pendingCount).padStart(3, '0')}`;
    const oldCode = mediators[index].kd_med;

    const updatedMed: MediatorKontrak = {
      ...mediators[index],
      status: 'PENDING',
      kd_med: pendingCode,
      reviewed_at: new Date().toISOString(),
      reviewed_by: params.reviewed_by,
      catatan_admin: params.catatan_admin !== undefined ? params.catatan_admin : mediators[index].catatan_admin
    };

    if (db) {
      try {
        const docId = sanitizeDocId(updatedMed.temp_id || updatedMed.kd_med);
        await setDoc(doc(db, 'mediators', docId), cleanForFirestore(updatedMed), { merge: true });
        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'mediators',
          documentId: updatedMed.temp_id || updatedMed.kd_med,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal memperbarui status mediator di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    mediators[index] = updatedMed;
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    notifyAllListeners();

    return {
      success: true,
      message: `Mediator "${updatedMed.nama_mediator}" disetujui (Status: PENDING - ${pendingCode}). Siap untuk penetapan KD MED oleh KAPOS / Super Admin.`
    };
  },

  // Admin atau KAPOS menolak pengajuan
  async rejectMediator(params: {
    targetTempOrCode: string;
    rejected_by: string;
    alasan: string;
  }): Promise<{ success: boolean; message: string }> {
    const mediators = this.getMediators();
    const index = mediators.findIndex(
      m => m.kd_med === params.targetTempOrCode || m.temp_id === params.targetTempOrCode
    );

    if (index === -1) {
      return { success: false, message: 'Data mediator tidak ditemukan!' };
    }

    const updatedMed: MediatorKontrak = {
      ...mediators[index],
      status: 'DITOLAK',
      catatan_admin: `[DITOLAK oleh ${params.rejected_by}]: ${params.alasan.trim()}`
    };

    if (db) {
      try {
        const docId = sanitizeDocId(updatedMed.temp_id || updatedMed.kd_med);
        await setDoc(doc(db, 'mediators', docId), cleanForFirestore(updatedMed), { merge: true });
        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'mediators',
          documentId: updatedMed.temp_id || updatedMed.kd_med,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menolak mediator di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    mediators[index] = updatedMed;
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    notifyAllListeners();

    return {
      success: true,
      message: `Pendaftaran mediator "${updatedMed.nama_mediator}" telah ditolak.`
    };
  },

  async validateAndActivateKdMed(params: {
    targetTempOrCode: string;
    new_kd_med: string;
    validated_by: string;
  }): Promise<{ success: boolean; message: string }> {
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
    const updatedMed: MediatorKontrak = {
      ...mediators[index],
      kd_med: cleanKdMed,
      status: 'AKTIF',
      validated_at: new Date().toISOString(),
      validated_by: params.validated_by
    };

    if (db) {
      try {
        const docId = sanitizeDocId(updatedMed.temp_id || updatedMed.kd_med);
        await setDoc(doc(db, 'mediators', docId), cleanForFirestore(updatedMed), { merge: true });
        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'mediators',
          documentId: updatedMed.temp_id || updatedMed.kd_med,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal aktivasi mediator di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    mediators[index] = updatedMed;

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
    notifyAllListeners();

    return {
      success: true,
      message: `Kode Mediator ${cleanKdMed} berhasil ditetapkan. Status mediator otomatis berubah menjadi AKTIF.`
    };
  },

  async updateMediator(params: {
    kd_med: string;
    nama_mediator?: string;
    no_tlpn?: string;
    kd_ao?: string;
    kd_posko?: string;
    kd_cabang?: string;
    status?: MediatorStatus;
    catatan_admin?: string;
    updated_by_role?: UserRole;
    updated_by_user?: string;
  }): Promise<{ success: boolean; message: string }> {
    const mediators = this.getMediators();
    const index = mediators.findIndex(m => m.kd_med === params.kd_med || m.temp_id === params.kd_med);

    if (index === -1) {
      return { success: false, message: 'Data mediator tidak ditemukan!' };
    }

    const currentMed = mediators[index];
    const role = params.updated_by_role;

    // Authorization checks
    if (role) {
      if (role === 'CMO' || role === 'KAPOS') {
        if (currentMed.status !== 'BELUM_AKTIF') {
          return {
            success: false,
            message: `Role ${role} hanya berhak mengedit data mediator dengan status Pendaftaran Baru (BELUM AKTIF). Data dengan status "${currentMed.status}" terkunci.`
          };
        }
      } else if (role === 'ADM') {
        if (currentMed.status !== 'BELUM_AKTIF' && currentMed.status !== 'PENDING') {
          return {
            success: false,
            message: `Role ADM hanya berhak mengedit mediator berstatus Pendaftaran Baru (BELUM AKTIF) dan Peninjauan Berkas (PENDING). Status "${currentMed.status}" terkunci.`
          };
        }
      } else if (role !== 'KAOPS' && role !== 'SUPER_ADMIN') {
        return {
          success: false,
          message: `Role ${role} tidak memiliki izin untuk mengedit data mediator.`
        };
      }
    }

    if (params.nama_mediator && params.nama_mediator.trim().length > 100) {
      return { success: false, message: 'Nama mediator maksimal 100 karakter!' };
    }

    const updatedMed: MediatorKontrak = {
      ...currentMed,
      nama_mediator: params.nama_mediator ? params.nama_mediator.trim() : currentMed.nama_mediator,
      no_tlpn: params.no_tlpn ? params.no_tlpn.trim() : currentMed.no_tlpn,
      kd_ao: params.kd_ao || currentMed.kd_ao,
      kd_posko: params.kd_posko !== undefined ? params.kd_posko : currentMed.kd_posko,
      kd_cabang: params.kd_cabang || currentMed.kd_cabang,
      status: params.status || currentMed.status,
      catatan_admin: params.catatan_admin !== undefined ? params.catatan_admin : currentMed.catatan_admin
    };

    if (db) {
      try {
        const docId = sanitizeDocId(updatedMed.temp_id || updatedMed.kd_med);
        await setDoc(doc(db, 'mediators', docId), cleanForFirestore(updatedMed), { merge: true });
        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          role,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'mediators',
          documentId: updatedMed.temp_id || updatedMed.kd_med,
          role,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal memperbarui mediator di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    mediators[index] = updatedMed;
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
    notifyAllListeners();
    return { success: true, message: 'Perubahan data mediator berhasil disimpan.' };
  },

  async deleteMediator(kd_med: string): Promise<{ success: boolean; message: string }> {
    const mediators = this.getMediators();
    const target = mediators.find(m => m.kd_med === kd_med || m.temp_id === kd_med);

    if (db && target) {
      try {
        const docId = sanitizeDocId(target.temp_id || target.kd_med);
        await deleteDoc(doc(db, 'mediators', docId));
        logFirestoreWrite({
          collection: 'mediators',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'mediators',
          documentId: target.temp_id || target.kd_med,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal menghapus mediator di Firestore: ${err?.message || 'Permission denied'}` };
      }
    }

    const filtered = mediators.filter(m => m.kd_med !== kd_med && m.temp_id !== kd_med);
    saveToStorage(STORAGE_KEYS.MEDIATORS, filtered);
    notifyAllListeners();
    return { success: true, message: 'Data mediator berhasil dihapus.' };
  },

  async importMediators(
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
  ): Promise<{ success: boolean; count: number; updatedCount: number; message: string }> {
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
        try {
          const docId = sanitizeDocId(cleanKdMed);
          await setDoc(doc(db, 'mediators', docId), cleanForFirestore(record));
          logFirestoreWrite({
            collection: 'mediators',
            documentId: docId,
            result: 'SUCCESS'
          });
        } catch (e: any) {
          logFirestoreWrite({
            collection: 'mediators',
            documentId: cleanKdMed,
            result: 'FAILED',
            errorCode: e?.code,
            errorMessage: e?.message
          });
        }
      }
    }

    if (options.autoCreateCabangPosko) {
      for (const [kd, nama] of newCabangs.entries()) {
        const c: Cabang = { kd_cabang: kd, nama_cabang: nama, wilayah: 'Wilayah Operasional' };
        cabangList.push(c);
        if (db) {
          await setDoc(doc(db, 'cabang', sanitizeDocId(kd)), cleanForFirestore(c)).catch(() => {});
        }
      }
      if (newCabangs.size > 0) {
        saveToStorage(STORAGE_KEYS.CABANG, cabangList);
      }

      for (const [kd, data] of newPoskos.entries()) {
        const p: Posko = { kd_posko: kd, nama_posko: data.nama, kd_cabang: data.cabang };
        poskoList.push(p);
        if (db) {
          await setDoc(doc(db, 'posko', sanitizeDocId(kd)), cleanForFirestore(p)).catch(() => {});
        }
      }
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

  async submitFollowUp(params: {
    kd_med: string;
    hasil_fu: HasilFU;
    catatan_fu: string;
    user_fu: string;
    kd_ao: string;
    kd_posko: string;
    kd_cabang: string;
  }): Promise<{ success: boolean; message: string; log?: FULog }> {
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

    if (db) {
      try {
        const logDocId = sanitizeDocId(newLog.id);
        await setDoc(doc(db, 'fu_logs', logDocId), cleanForFirestore(newLog));
        logFirestoreWrite({
          collection: 'fu_logs',
          documentId: logDocId,
          result: 'SUCCESS'
        });

        const medDocId = sanitizeDocId(mediator.temp_id || mediator.kd_med);
        await setDoc(
          doc(db, 'mediators', medDocId),
          cleanForFirestore({ tgl_akhir_fu: todayIsoDate }),
          { merge: true }
        );
        logFirestoreWrite({
          collection: 'mediators',
          documentId: medDocId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'fu_logs',
          documentId: newLog.id,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menyimpan Follow-Up ke Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    const logs = this.getFULogs();
    logs.unshift(newLog);
    saveToStorage(STORAGE_KEYS.FU_LOGS, logs);

    mediators[medIndex].tgl_akhir_fu = todayIsoDate;
    saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);

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

  async restoreFullSystemBackup(backup: SystemFullBackup): Promise<{ success: boolean; message: string }> {
    try {
      if (!backup || !backup.data) {
        return { success: false, message: 'Format file backup tidak valid!' };
      }
      const { users, cabang, posko, mediators, fu_logs } = backup.data;
      if (!Array.isArray(users) || !Array.isArray(cabang) || !Array.isArray(mediators)) {
        return { success: false, message: 'Struktur data backup tidak lengkap!' };
      }

      if (db) {
        const batch = writeBatch(db);
        users.forEach(u => batch.set(doc(db!, 'users', sanitizeDocId(u.id)), cleanForFirestore(u)));
        cabang.forEach(c => batch.set(doc(db!, 'cabang', sanitizeDocId(c.kd_cabang)), cleanForFirestore(c)));
        (posko || INITIAL_POSKO).forEach(p => batch.set(doc(db!, 'posko', sanitizeDocId(p.kd_posko)), cleanForFirestore(p)));
        mediators.forEach(m => batch.set(doc(db!, 'mediators', sanitizeDocId(m.kd_med || m.temp_id)), cleanForFirestore(m)));
        (fu_logs || []).forEach(f => batch.set(doc(db!, 'fu_logs', sanitizeDocId(f.id)), cleanForFirestore(f)));
        await batch.commit();
        logFirestoreWrite({
          collection: 'system_backup_restore',
          documentId: 'ALL',
          result: 'SUCCESS'
        });
      }

      saveToStorage(STORAGE_KEYS.USERS, users);
      saveToStorage(STORAGE_KEYS.CABANG, cabang);
      saveToStorage(STORAGE_KEYS.POSKO, Array.isArray(posko) ? posko : INITIAL_POSKO);
      saveToStorage(STORAGE_KEYS.MEDIATORS, mediators);
      saveToStorage(STORAGE_KEYS.FU_LOGS, Array.isArray(fu_logs) ? fu_logs : []);

      notifyAllListeners();
      return {
        success: true,
        message: `Database berhasil dipulihkan! (${users.length} User, ${cabang.length} Cabang, ${mediators.length} Mediator, ${fu_logs?.length || 0} Log FU)`
      };
    } catch (err: any) {
      logFirestoreWrite({
        collection: 'system_backup_restore',
        documentId: 'ALL',
        result: 'FAILED',
        errorCode: err?.code,
        errorMessage: err?.message
      });
      return { success: false, message: `Gagal restore database: ${err.message}` };
    }
  },

  // ==========================================
  // EX-CUSTOMER MODULE METHODS & DRIP-FEEDING
  // ==========================================

  getExCustomers(): ExCustomer[] {
    return getInitialOrStored<ExCustomer[]>(STORAGE_KEYS.EX_CUSTOMERS, INITIAL_EX_CUSTOMERS);
  },

  getExCustomerFULogs(): ExCustomerFULog[] {
    return getInitialOrStored<ExCustomerFULog[]>(STORAGE_KEYS.EX_CUSTOMER_FU_LOGS, INITIAL_EX_CUSTOMER_FU_LOGS);
  },

  // Admin BPKB View: Data Leakage Guard (Max 48 Hours / 2x24h) - Akses Nasional Seluruh Cabang & Posko
  getExCustomersForAdminBpkb(currentUser: User): { data: ExCustomer[]; canEdit: (item: ExCustomer) => boolean; remainingHours: (item: ExCustomer) => number } {
    const list = this.getExCustomers();
    const now = Date.now();
    const FORTY_EIGHT_HOURS = 48 * 3600 * 1000;

    // Super admin sees all, Admin BPKB sees all records across all cabang & posko within 48h
    const filtered = list.filter(item => {
      const createdAtTime = new Date(item.created_at).getTime();
      const isWithin48h = (now - createdAtTime) <= FORTY_EIGHT_HOURS;
      
      if (currentUser.role === 'SUPER_ADMIN') return true;
      return isWithin48h;
    });

    // Sort newest first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      data: filtered,
      canEdit: (item: ExCustomer) => {
        if (currentUser.role === 'SUPER_ADMIN') return true;
        const diff = now - new Date(item.created_at).getTime();
        return diff <= FORTY_EIGHT_HOURS;
      },
      remainingHours: (item: ExCustomer) => {
        const diff = FORTY_EIGHT_HOURS - (now - new Date(item.created_at).getTime());
        return Math.max(0, Math.round(diff / (3600 * 1000)));
      }
    };
  },

  async importExCustomers(
    importedItems: {
      no_psb: string;
      kd_cab: string;
      kd_pos: string;
      nama_konsumen: string;
      no_telepon: string;
      tgl_bpkb_sdk: string;
      status_kredit_lunas: StatusKreditLunas;
    }[],
    options: {
      mode: 'append' | 'replace';
      autoCreateCabangPosko?: boolean;
      importedBy: string;
    }
  ): Promise<{ success: boolean; count: number; updatedCount: number; message: string }> {
    let currentList = options.mode === 'replace' ? [] : this.getExCustomers();
    const cabangList = this.getCabangList();
    const poskoList = this.getPoskoList();

    let addedCount = 0;
    let updatedCount = 0;

    const newCabangs = new Map<string, string>();
    const newPoskos = new Map<string, { nama: string; cabang: string }>();

    for (const item of importedItems) {
      if (!item.no_psb || !item.nama_konsumen || !item.no_telepon) continue;

      const cleanNoPsb = item.no_psb.trim().toUpperCase();
      const cleanCabang = (item.kd_cab || 'C16').trim().toUpperCase();
      const cleanPosko = (item.kd_pos || 'QJ0').trim().toUpperCase();

      if (options.autoCreateCabangPosko) {
        if (!cabangList.some(c => c.kd_cabang.toUpperCase() === cleanCabang) && !newCabangs.has(cleanCabang)) {
          newCabangs.set(cleanCabang, `Cabang ${cleanCabang}`);
        }
        if (!poskoList.some(p => p.kd_posko.toUpperCase() === cleanPosko) && !newPoskos.has(cleanPosko)) {
          newPoskos.set(cleanPosko, { nama: `Posko ${cleanPosko}`, cabang: cleanCabang });
        }
      }

      const existingIndex = currentList.findIndex(c => c.no_psb.toUpperCase() === cleanNoPsb);

      const record: ExCustomer = {
        no_psb: cleanNoPsb,
        kd_cab: cleanCabang,
        kd_pos: cleanPosko,
        nama_konsumen: item.nama_konsumen.trim(),
        no_telepon: item.no_telepon.trim(),
        tgl_bpkb_sdk: item.tgl_bpkb_sdk || new Date().toISOString().split('T')[0],
        status_kredit_lunas: item.status_kredit_lunas || 'Tepat Waktu',
        created_at: new Date().toISOString(),
        created_by_uid: 'USR-SUPERADMIN',
        created_by_name: options.importedBy,
        last_fu_date: null,
        last_fu_status: null,
        fu_count: 0
      };

      if (existingIndex >= 0) {
        currentList[existingIndex] = {
          ...currentList[existingIndex],
          ...record,
          created_at: currentList[existingIndex].created_at || record.created_at,
          last_fu_date: currentList[existingIndex].last_fu_date || null,
          last_fu_status: currentList[existingIndex].last_fu_status || null,
          fu_count: currentList[existingIndex].fu_count || 0
        };
        updatedCount++;
      } else {
        currentList.push(record);
        addedCount++;
      }

      if (db) {
        try {
          const docId = sanitizeDocId(cleanNoPsb);
          await setDoc(doc(db, 'ex_customers', docId), cleanForFirestore(record));
          logFirestoreWrite({
            collection: 'ex_customers',
            documentId: docId,
            result: 'SUCCESS'
          });
        } catch (e: any) {
          logFirestoreWrite({
            collection: 'ex_customers',
            documentId: cleanNoPsb,
            result: 'FAILED',
            errorCode: e?.code,
            errorMessage: e?.message
          });
        }
      }
    }

    if (options.autoCreateCabangPosko) {
      for (const [kd, nama] of newCabangs.entries()) {
        const c: Cabang = { kd_cabang: kd, nama_cabang: nama, wilayah: 'Wilayah Operasional' };
        cabangList.push(c);
        if (db) {
          await setDoc(doc(db, 'cabang', sanitizeDocId(kd)), cleanForFirestore(c)).catch(() => {});
        }
      }
      if (newCabangs.size > 0) {
        saveToStorage(STORAGE_KEYS.CABANG, cabangList);
      }

      for (const [kd, data] of newPoskos.entries()) {
        const p: Posko = { kd_posko: kd, nama_posko: data.nama, kd_cabang: data.cabang };
        poskoList.push(p);
        if (db) {
          await setDoc(doc(db, 'posko', sanitizeDocId(kd)), cleanForFirestore(p)).catch(() => {});
        }
      }
      if (newPoskos.size > 0) {
        saveToStorage(STORAGE_KEYS.POSKO, poskoList);
      }
    }

    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, currentList);
    notifyAllListeners();

    return {
      success: true,
      count: addedCount,
      updatedCount,
      message: `Berhasil mengimpor ${addedCount} data BPKB baru${updatedCount > 0 ? ` dan memperbarui ${updatedCount} data yang sudah ada` : ''}.`
    };
  },

  async saveExCustomer(
    exCustomer: {
      no_psb: string;
      kd_cab: string;
      kd_pos: string;
      nama_konsumen: string;
      no_telepon: string;
      tgl_bpkb_sdk: string;
      status_kredit_lunas: StatusKreditLunas;
    },
    isEdit: boolean = false,
    oldNoPsb?: string,
    currentUser?: User
  ): Promise<{ success: boolean; message: string; data?: ExCustomer }> {
    const list = this.getExCustomers();
    const cleanNoPsb = exCustomer.no_psb.trim().toUpperCase();
    const cleanCab = exCustomer.kd_cab.trim().toUpperCase();
    const cleanPos = exCustomer.kd_pos.trim().toUpperCase();
    const cleanNama = exCustomer.nama_konsumen.trim();
    const cleanTelp = exCustomer.no_telepon.trim();
    const cleanTgl = exCustomer.tgl_bpkb_sdk.trim();
    const cleanStatus = exCustomer.status_kredit_lunas;

    if (!cleanNoPsb || !cleanCab || !cleanPos || !cleanNama || !cleanTelp || !cleanTgl || !cleanStatus) {
      return { success: false, message: 'Semua kolom input BPKB wajib diisi dengan lengkap!' };
    }

    const duplicateIndex = list.findIndex(c => c.no_psb.toUpperCase() === cleanNoPsb);

    if (!isEdit && duplicateIndex >= 0) {
      return { success: false, message: `Nomor PSB "${cleanNoPsb}" sudah terdaftar dalam sistem!` };
    }

    const nowIso = new Date().toISOString();

    if (isEdit && oldNoPsb) {
      const editIndex = list.findIndex(c => c.no_psb.toUpperCase() === oldNoPsb.toUpperCase());
      if (editIndex >= 0) {
        const existing = list[editIndex];
        
        // 2x24h check for non-superadmin
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
          const diff = Date.now() - new Date(existing.created_at).getTime();
          if (diff > 48 * 3600 * 1000) {
            return { success: false, message: 'Batas waktu edit (2x24 jam) untuk data ini telah berakhir!' };
          }
        }

        if (cleanNoPsb !== oldNoPsb.toUpperCase() && duplicateIndex >= 0) {
          return { success: false, message: `Nomor PSB baru "${cleanNoPsb}" sudah digunakan data lain!` };
        }

        const updatedRecord: ExCustomer = {
          ...existing,
          no_psb: cleanNoPsb,
          kd_cab: cleanCab,
          kd_pos: cleanPos,
          nama_konsumen: cleanNama,
          no_telepon: cleanTelp,
          tgl_bpkb_sdk: cleanTgl,
          status_kredit_lunas: cleanStatus,
          updated_at: nowIso,
          updated_by_name: currentUser?.nama || 'Admin BPKB'
        };

        if (db) {
          try {
            const docId = sanitizeDocId(cleanNoPsb);
            await setDoc(doc(db, 'ex_customers', docId), cleanForFirestore(updatedRecord));
            logFirestoreWrite({
              collection: 'ex_customers',
              documentId: docId,
              result: 'SUCCESS'
            });

            if (cleanNoPsb !== oldNoPsb.toUpperCase()) {
              await deleteDoc(doc(db, 'ex_customers', sanitizeDocId(oldNoPsb))).catch(() => {});
            }
          } catch (err: any) {
            logFirestoreWrite({
              collection: 'ex_customers',
              documentId: cleanNoPsb,
              result: 'FAILED',
              errorCode: err?.code,
              errorMessage: err?.message
            });
            return {
              success: false,
              message: `Gagal memperbarui data BPKB di Firestore: ${err?.message || 'Permission denied'}`
            };
          }
        }

        list[editIndex] = updatedRecord;
        saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, list);
        notifyAllListeners();

        return { success: true, message: `Data BPKB PSB ${cleanNoPsb} berhasil diperbarui!`, data: updatedRecord };
      }
    }

    const newRecord: ExCustomer = {
      no_psb: cleanNoPsb,
      kd_cab: cleanCab,
      kd_pos: cleanPos,
      nama_konsumen: cleanNama,
      no_telepon: cleanTelp,
      tgl_bpkb_sdk: cleanTgl,
      status_kredit_lunas: cleanStatus,
      created_at: nowIso,
      created_by_uid: currentUser?.id || 'USR-BPKB',
      created_by_name: currentUser?.nama || 'Admin BPKB',
      last_fu_date: null,
      last_fu_status: null,
      fu_count: 0
    };

    if (db) {
      try {
        const docId = sanitizeDocId(cleanNoPsb);
        await setDoc(doc(db, 'ex_customers', docId), cleanForFirestore(newRecord));
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: cleanNoPsb,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menyimpan data BPKB ke Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    list.unshift(newRecord);
    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, list);
    notifyAllListeners();

    return { success: true, message: `Data penyerahan BPKB PSB ${cleanNoPsb} (${cleanNama}) berhasil disimpan!`, data: newRecord };
  },

  async deleteExCustomer(no_psb: string): Promise<{ success: boolean; message: string }> {
    const cleanNo = no_psb.toUpperCase();

    if (db) {
      try {
        await deleteDoc(doc(db, 'ex_customers', sanitizeDocId(cleanNo)));
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: cleanNo,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: cleanNo,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal menghapus data di Firestore: ${err?.message || 'Permission denied'}` };
      }
    }

    const list = this.getExCustomers().filter(c => c.no_psb.toUpperCase() !== cleanNo);
    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, list);

    const logs = this.getExCustomerLogs().filter(l => l.no_psb.toUpperCase() !== cleanNo);
    saveToStorage(STORAGE_KEYS.EX_CUSTOMER_FU_LOGS, logs);

    notifyAllListeners();
    return { success: true, message: `Data Ex-Customer PSB ${cleanNo} berhasil dihapus permanen.` };
  },

  async clearAllExCustomers(): Promise<{ success: boolean; message: string }> {
    const currentList = this.getExCustomers();

    if (db) {
      try {
        const batch = writeBatch(db);
        currentList.forEach(c => {
          batch.delete(doc(db!, 'ex_customers', sanitizeDocId(c.no_psb)));
        });
        await batch.commit();
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: 'ALL',
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: 'ALL',
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
      }
    }

    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, []);
    saveToStorage(STORAGE_KEYS.EX_CUSTOMER_FU_LOGS, []);

    try {
      localStorage.removeItem('med_control_ex_customers_v1');
      localStorage.removeItem('med_control_ex_customer_fu_logs_v1');
    } catch {}

    notifyAllListeners();
    return { success: true, message: 'Semua data Ex-Customer dan riwayat follow up telah berhasil dihapus / dikosongkan untuk persiapan input data real.' };
  },

  // Drip Feeding Queue (25 items per day per Cabang + Posko, Shared Pool for Admin & Kapos)
  // ONLY for categories: Lebih Awal, Tepat Waktu, Dalam Perhatian Khusus, Kurang Lancar
  getDailyDripForPosko(kd_cab: string, kd_pos: string): {
    dripList: ExCustomer[];
    totalAvailable: number;
    completedToday: number;
    pendingToday: number;
  } {
    const all = this.getExCustomers();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 3600 * 1000;

    const ALLOWED_STATUSES: StatusKreditLunas[] = [
      'Lebih Awal',
      'Tepat Waktu',
      'Dalam Perhatian Khusus',
      'Kurang Lancar'
    ];

    const poskoCustomers = all.filter(c => 
      (!kd_cab || c.kd_cab.toUpperCase() === kd_cab.toUpperCase()) &&
      (!kd_pos || c.kd_pos.toUpperCase() === kd_pos.toUpperCase()) &&
      ALLOWED_STATUSES.includes(c.status_kredit_lunas)
    );

    const priorityWeight: Record<StatusKreditLunas, number> = {
      'Lebih Awal': 100,
      'Tepat Waktu': 90,
      'Dalam Perhatian Khusus': 60,
      'Kurang Lancar': 40,
      'Diragukan': 0,
      'AR2': 0,
      'AR3': 0,
      'AR4': 0
    };

    const recentlyFollowedUp = poskoCustomers.filter(c => {
      if (!c.last_fu_date) return false;
      const fuTime = new Date(c.last_fu_date).getTime();
      return (now - fuTime) <= ONE_DAY_MS;
    });

    const notRecentlyFollowedUp = poskoCustomers.filter(c => {
      if (!c.last_fu_date) return true;
      const fuTime = new Date(c.last_fu_date).getTime();
      return (now - fuTime) > ONE_DAY_MS;
    });

    notRecentlyFollowedUp.sort((a, b) => {
      const weightA = priorityWeight[a.status_kredit_lunas] || 0;
      const weightB = priorityWeight[b.status_kredit_lunas] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const remainingSlots = Math.max(0, 25 - recentlyFollowedUp.length);
    const fillFromAvailable = notRecentlyFollowedUp.slice(0, remainingSlots);

    const combinedDrip = [...recentlyFollowedUp, ...fillFromAvailable];

    const completedToday = combinedDrip.filter(c => {
      if (!c.last_fu_date) return false;
      return (now - new Date(c.last_fu_date).getTime()) <= ONE_DAY_MS;
    }).length;

    const pendingToday = combinedDrip.length - completedToday;

    return {
      dripList: combinedDrip,
      totalAvailable: poskoCustomers.length,
      completedToday,
      pendingToday
    };
  },

  // CMO Assignment (Max 5 per CMO, resets after 24 hours)
  getAssignedExCustomersForCMO(cmoId: string): ExCustomer[] {
    const all = this.getExCustomers();
    const now = Date.now();
    const ONE_DAY_MS = 24 * 3600 * 1000;

    const ALLOWED_STATUSES: StatusKreditLunas[] = [
      'Lebih Awal',
      'Tepat Waktu',
      'Dalam Perhatian Khusus',
      'Kurang Lancar'
    ];

    return all.filter(c => {
      if (c.assigned_to_cmo_id !== cmoId) return false;
      if (!c.assigned_at) return false;
      if (!ALLOWED_STATUSES.includes(c.status_kredit_lunas)) return false;
      const assignedTime = new Date(c.assigned_at).getTime();
      return (now - assignedTime) <= ONE_DAY_MS;
    });
  },

  async assignExCustomerToCMO(no_psb: string, cmoId: string, cmoName: string): Promise<{ success: boolean; message: string }> {
    const list = this.getExCustomers();
    const cleanNo = no_psb.toUpperCase();
    const index = list.findIndex(c => c.no_psb.toUpperCase() === cleanNo);

    if (index === -1) {
      return { success: false, message: 'Data Ex-Customer tidak ditemukan!' };
    }

    const ALLOWED_STATUSES: StatusKreditLunas[] = [
      'Lebih Awal',
      'Tepat Waktu',
      'Dalam Perhatian Khusus',
      'Kurang Lancar'
    ];

    if (!ALLOWED_STATUSES.includes(list[index].status_kredit_lunas)) {
      return { 
        success: false, 
        message: `Hanya konsumen dengan kategori 'Lebih Awal', 'Tepat Waktu', 'Dalam Perhatian Khusus', dan 'Kurang Lancar' yang dapat ditugaskan ke CMO!` 
      };
    }

    // Check CMO limit (Max 5 active assigned per CMO)
    const activeAssigned = this.getAssignedExCustomersForCMO(cmoId);
    if (activeAssigned.length >= 5 && !activeAssigned.some(c => c.no_psb.toUpperCase() === cleanNo)) {
      return { success: false, message: `CMO ${cmoName} telah mencapai batas maksimal 5 penugasan harian!` };
    }

    const updatedItem: ExCustomer = {
      ...list[index],
      assigned_to_cmo_id: cmoId,
      assigned_to_cmo_name: cmoName,
      assigned_at: new Date().toISOString()
    };

    if (db) {
      try {
        const docId = sanitizeDocId(cleanNo);
        await setDoc(doc(db, 'ex_customers', docId), cleanForFirestore(updatedItem), { merge: true });
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: cleanNo,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal assign di Firestore: ${err?.message || 'Permission denied'}` };
      }
    }

    list[index] = updatedItem;
    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, list);
    notifyAllListeners();

    return { success: true, message: `Konsumen PSB ${cleanNo} berhasil ditugaskan ke CMO ${cmoName}!` };
  },

  async unassignExCustomer(no_psb: string): Promise<{ success: boolean; message: string }> {
    const list = this.getExCustomers();
    const cleanNo = no_psb.toUpperCase();
    const index = list.findIndex(c => c.no_psb.toUpperCase() === cleanNo);

    if (index === -1) {
      return { success: false, message: 'Data tidak ditemukan!' };
    }

    const updatedItem: ExCustomer = {
      ...list[index],
      assigned_to_cmo_id: undefined,
      assigned_to_cmo_name: undefined,
      assigned_at: undefined
    };

    if (db) {
      try {
        const docId = sanitizeDocId(cleanNo);
        await setDoc(doc(db, 'ex_customers', docId), cleanForFirestore(updatedItem));
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: docId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: cleanNo,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return { success: false, message: `Gagal unassign di Firestore: ${err?.message || 'Permission denied'}` };
      }
    }

    list[index] = updatedItem;
    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, list);
    notifyAllListeners();

    return { success: true, message: `Penugasan konsumen PSB ${cleanNo} berhasil dibatalkan.` };
  },

  // Submit Follow Up for Ex-Customer
  async submitExCustomerFU(params: {
    no_psb: string;
    hasil_fu: HasilFUExCustomer;
    catatan_fu: string;
    currentUser: User;
  }): Promise<{ success: boolean; message: string; log?: ExCustomerFULog }> {
    if (!params.hasil_fu) {
      return { success: false, message: 'Hasil FU wajib dipilih!' };
    }
    if (params.catatan_fu && params.catatan_fu.length > 100) {
      return { success: false, message: 'Catatan FU melebihi batas maksimal 100 karakter!' };
    }

    const list = this.getExCustomers();
    const cleanNo = params.no_psb.toUpperCase();
    const index = list.findIndex(c => c.no_psb.toUpperCase() === cleanNo);

    if (index === -1) {
      return { success: false, message: 'Data Ex-Customer tidak ditemukan!' };
    }

    const item = list[index];
    const nowIso = new Date().toISOString();

    const newLog: ExCustomerFULog = {
      id: `LOG-EX-${Date.now().toString().slice(-6)}`,
      no_psb: item.no_psb,
      nama_konsumen: item.nama_konsumen,
      kd_cab: item.kd_cab,
      kd_pos: item.kd_pos,
      tgl_fu: nowIso,
      hasil_fu: params.hasil_fu,
      catatan_fu: (params.catatan_fu || '').trim(),
      user_fu: params.currentUser.nama,
      user_id: params.currentUser.id,
      user_role: params.currentUser.role,
      kd_ao: params.currentUser.kd_ao
    };

    // Update Ex-Customer State
    const updatedItem: ExCustomer = {
      ...item,
      last_fu_date: nowIso,
      last_fu_status: params.hasil_fu,
      last_fu_by_user: params.currentUser.nama,
      last_fu_by_role: params.currentUser.role,
      last_fu_notes: (params.catatan_fu || '').trim(),
      fu_count: (item.fu_count || 0) + 1
    };

    if (db) {
      try {
        const itemDocId = sanitizeDocId(cleanNo);
        const logDocId = sanitizeDocId(newLog.id);
        await setDoc(doc(db, 'ex_customers', itemDocId), cleanForFirestore(updatedItem));
        await setDoc(doc(db, 'ex_customer_fu_logs', logDocId), cleanForFirestore(newLog));
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: itemDocId,
          result: 'SUCCESS'
        });
        logFirestoreWrite({
          collection: 'ex_customer_fu_logs',
          documentId: logDocId,
          result: 'SUCCESS'
        });
      } catch (err: any) {
        logFirestoreWrite({
          collection: 'ex_customers',
          documentId: cleanNo,
          result: 'FAILED',
          errorCode: err?.code,
          errorMessage: err?.message
        });
        return {
          success: false,
          message: `Gagal menyimpan Follow-Up Ex-Customer di Firestore: ${err?.message || 'Permission denied'}`
        };
      }
    }

    list[index] = updatedItem;
    saveToStorage(STORAGE_KEYS.EX_CUSTOMERS, list);

    const logs = this.getExCustomerFULogs();
    logs.unshift(newLog);
    saveToStorage(STORAGE_KEYS.EX_CUSTOMER_FU_LOGS, logs);

    notifyAllListeners();

    return {
      success: true,
      message: `Hasil Follow-Up untuk ${item.nama_konsumen} (${item.no_psb}) berhasil disimpan!`,
      log: newLog
    };
  },

  resetToDefault(): void {
    localStorage.setItem(STORAGE_KEYS.CABANG, JSON.stringify(INITIAL_CABANG));
    localStorage.setItem(STORAGE_KEYS.POSKO, JSON.stringify(INITIAL_POSKO));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(INITIAL_MEDIATORS));
    localStorage.setItem(STORAGE_KEYS.FU_LOGS, JSON.stringify(INITIAL_FU_LOGS));
    localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(INITIAL_EX_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.EX_CUSTOMER_FU_LOGS, JSON.stringify(INITIAL_EX_CUSTOMER_FU_LOGS));
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    notifyAllListeners();
  }
};
