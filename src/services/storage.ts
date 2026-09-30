import { 
  MediatorKontrak, 
  User, 
  Cabang, 
  Posko, 
  ExCustomer, 
  FollowUpLog, 
  ExCustomerFollowUpLog, 
  ActivityLog, 
  MediatorStatus 
} from '../types';
import { 
  INITIAL_MEDIATORS, 
  INITIAL_USERS, 
  INITIAL_CABANG, 
  INITIAL_POSKO, 
  INITIAL_EX_CUSTOMERS 
} from '../data/initialData';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';

export const STORAGE_KEYS = {
  MEDIATORS: 'kamm_mediators',
  USERS: 'kamm_users',
  CABANG: 'kamm_cabang',
  POSKO: 'kamm_posko',
  EX_CUSTOMERS: 'kamm_ex_customers',
  FOLLOW_UPS: 'kamm_follow_ups',
  EX_FOLLOW_UPS: 'kamm_ex_follow_ups',
  LOGS: 'kamm_activity_logs'
};

// Global subscription listeners for real-time reactivity
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(cb => {
    try {
      cb();
    } catch (err) {
      console.error('Subscriber callback error:', err);
    }
  });
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Gagal menyimpan key "${key}" ke localStorage:`, e);
  }
}

export class StorageService {
  // --- Mediators ---
  static getMediators(): MediatorKontrak[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEDIATORS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(INITIAL_MEDIATORS));
      return INITIAL_MEDIATORS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MEDIATORS;
    }
  }

  static saveMediator(mediator: MediatorKontrak): MediatorKontrak {
    const list = this.getMediators();
    const existingIdx = list.findIndex(m => 
      (m.firestore_id && m.firestore_id === mediator.firestore_id) ||
      (m.kd_med && m.kd_med === mediator.kd_med) ||
      (m.temp_id && m.temp_id === mediator.temp_id)
    );

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...mediator, updated_at: new Date().toISOString() };
    } else {
      list.unshift({
        ...mediator,
        firestore_id: mediator.firestore_id || `MED_${Date.now()}`,
        created_at: new Date().toISOString()
      });
    }

    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(list));
    notifySubscribers();
    return mediator;
  }

  static addDraftMediator(input: Partial<MediatorKontrak>): MediatorKontrak {
    const list = this.getMediators();
    let draftNum = list.filter(m => m.status === 'BELUM_AKTIF').length + 1;
    while (list.some(m => m.kd_med === `DRAFT-${String(draftNum).padStart(3, '0')}`)) {
      draftNum++;
    }
    const tempCode = `DRAFT-${String(draftNum).padStart(3, '0')}`;
    const tempId = `TMP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newMed: MediatorKontrak = {
      firestore_id: `MED_${Date.now()}`,
      kd_med: tempCode,
      temp_id: tempId,
      nama_mediator: input.nama_mediator || '',
      no_tlpn: input.no_tlpn || '',
      kd_cabang: input.kd_cabang || 'C16',
      kd_posko: input.kd_posko || 'QJ0',
      kd_ao: input.kd_ao || '',
      status: 'BELUM_AKTIF',
      tanggal_bergabung: new Date().toISOString().split('T')[0],
      no_ktp: input.no_ktp || '',
      alamat: input.alamat || '',
      tempat_lahir: input.tempat_lahir || '',
      tgl_lahir: input.tgl_lahir || '',
      nama_bank: input.nama_bank || '',
      no_rekening: input.no_rekening || '',
      atas_nama_rekening: input.atas_nama_rekening || '',
      catatan: input.catatan || '',
      created_by: input.created_by || '',
      created_at: new Date().toISOString()
    };

    list.unshift(newMed);
    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(list));
    notifySubscribers();
    return newMed;
  }

  static updateMediatorStatus(
    identifier: string, 
    status: MediatorKontrak['status'], 
    newKdMed?: string, 
    userNama?: string
  ): boolean {
    const list = this.getMediators();
    const idx = list.findIndex(m => m.firestore_id === identifier || m.kd_med === identifier || m.temp_id === identifier);
    if (idx === -1) return false;

    list[idx].status = status;
    if (newKdMed) list[idx].kd_med = newKdMed;
    if (status === 'PENDING') list[idx].reviewed_by = userNama;
    if (status === 'AKTIF') list[idx].activated_by = userNama;
    list[idx].updated_at = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(list));
    notifySubscribers();
    return true;
  }

  static deleteMediator(identifier: string): boolean {
    const list = this.getMediators();
    const filtered = list.filter(m => m.firestore_id !== identifier && m.kd_med !== identifier && m.temp_id !== identifier);
    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(filtered));
    notifySubscribers();
    return true;
  }

  // --- Users ---
  static getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUser(user: User): User {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id || u.username === user.username);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...user, created_at: user.created_at || new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    notifySubscribers();
    return user;
  }

  // --- Cabang & Posko ---
  static getCabang(): Cabang[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CABANG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CABANG, JSON.stringify(INITIAL_CABANG));
      return INITIAL_CABANG;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CABANG;
    }
  }

  static getPosko(): Posko[] {
    const raw = localStorage.getItem(STORAGE_KEYS.POSKO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.POSKO, JSON.stringify(INITIAL_POSKO));
      return INITIAL_POSKO;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_POSKO;
    }
  }

  // --- Ex-Customers ---
  static getExCustomers(): ExCustomer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EX_CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(INITIAL_EX_CUSTOMERS));
      return INITIAL_EX_CUSTOMERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_EX_CUSTOMERS;
    }
  }

  static saveExCustomer(cust: ExCustomer): ExCustomer {
    const list = this.getExCustomers();
    const idx = list.findIndex(c => c.no_psb === cust.no_psb);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...cust, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...cust, created_at: cust.created_at || new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(list));
    notifySubscribers();
    return cust;
  }

  static addExCustomerFollowUp(log: Omit<ExCustomerFollowUpLog, 'id' | 'created_at'>): ExCustomerFollowUpLog {
    const logs = this.getExCustomerFollowUps();
    const newLog: ExCustomerFollowUpLog = {
      ...log,
      id: `EXLOG_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.EX_FOLLOW_UPS, JSON.stringify(logs));

    // Update customer status
    const custs = this.getExCustomers();
    const cIdx = custs.findIndex(c => c.no_psb === log.no_psb);
    if (cIdx >= 0) {
      custs[cIdx].status_prospek = log.status_baru;
      custs[cIdx].catatan_terakhir = log.catatan;
      custs[cIdx].tgl_follow_up_terakhir = log.tanggal;
      localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(custs));
    }

    notifySubscribers();
    return newLog;
  }

  static getExCustomerFollowUps(): ExCustomerFollowUpLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EX_FOLLOW_UPS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // --- Follow Up Mediator ---
  static getFollowUps(): FollowUpLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLLOW_UPS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static addFollowUp(log: Omit<FollowUpLog, 'id' | 'created_at'>): FollowUpLog {
    const logs = this.getFollowUps();
    const newLog: FollowUpLog = {
      ...log,
      id: `FU_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(logs));
    notifySubscribers();
    return newLog;
  }

  // --- Activity Logs ---
  static getLogs(): ActivityLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static logActivity(userId: string, username: string, action: string, module: string, details: string) {
    const logs = this.getLogs();
    logs.unshift({
      id: `ACT_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      username,
      action,
      module,
      details
    });
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 500)));
  }
}

// -------------------------------------------------------------
// DatabaseService: Unified Database facade supporting real-time Firestore sync & Local Storage
// -------------------------------------------------------------
export const DatabaseService = {
  getUsers(): User[] {
    return StorageService.getUsers();
  },

  async saveUser(user: User, isUpdate = true): Promise<{ success: boolean; message: string }> {
    StorageService.saveUser(user);
    if (db) {
      try {
        const docRef = doc(db, 'users', user.id);
        await setDoc(docRef, {
          ...user,
          updated_at: new Date().toISOString(),
          updated_at_timestamp: serverTimestamp()
        }, { merge: true });
      } catch (err: any) {
        console.warn('Firestore user save note:', err?.message || err);
      }
    }
    return { success: true, message: 'Data user berhasil disimpan' };
  },

  async changeUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const users = StorageService.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) {
      return { success: false, message: 'User tidak ditemukan' };
    }
    users[idx].password = newPassword;
    users[idx].must_change_password = false;
    users[idx].updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    notifySubscribers();

    if (db) {
      try {
        const docRef = doc(db, 'users', userId);
        await setDoc(docRef, {
          password: newPassword,
          must_change_password: false,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
        console.warn('Firestore password change note:', err?.message || err);
      }
    }

    return { success: true, message: 'Password berhasil diubah' };
  },

  async resetUserPassword(userId: string): Promise<{ success: boolean; message: string }> {
    const defaultPassword = 'password123';
    return this.changeUserPassword(userId, defaultPassword);
  },

  getCabangList(): Cabang[] {
    return StorageService.getCabang();
  },

  getPoskoList(): Posko[] {
    return StorageService.getPosko();
  },

  getMediators(): MediatorKontrak[] {
    return StorageService.getMediators();
  },

  saveMediator(mediator: MediatorKontrak): MediatorKontrak {
    const res = StorageService.saveMediator(mediator);
    if (db && mediator.kd_med) {
      try {
        const docRef = doc(db, 'mediators', mediator.kd_med);
        setDoc(docRef, { ...res, updated_at_timestamp: serverTimestamp() }, { merge: true }).catch(() => {});
      } catch {}
    }
    return res;
  },

  async updateMediator(params: {
    kd_med: string;
    nama_mediator: string;
    no_tlpn: string;
    kd_ao: string;
    kd_cabang?: string;
    kd_posko: string;
    status: MediatorStatus;
    catatan_admin?: string;
    updated_by_role?: string;
    updated_by_user?: string;
  }): Promise<{ success: boolean; message: string }> {
    const list = StorageService.getMediators();
    const idx = list.findIndex(m => m.kd_med === params.kd_med);
    if (idx === -1) {
      return { success: false, message: `Mediator ${params.kd_med} tidak ditemukan!` };
    }

    list[idx] = {
      ...list[idx],
      nama_mediator: params.nama_mediator,
      no_tlpn: params.no_tlpn,
      kd_ao: params.kd_ao,
      kd_cabang: params.kd_cabang || list[idx].kd_cabang,
      kd_posko: params.kd_posko,
      status: params.status,
      catatan_admin: params.catatan_admin,
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(list));
    notifySubscribers();

    if (db) {
      try {
        const docRef = doc(db, 'mediators', params.kd_med);
        await setDoc(docRef, { ...list[idx], updated_at_timestamp: serverTimestamp() }, { merge: true });
      } catch (err: any) {
        console.warn('Firestore updateMediator note:', err?.message || err);
      }
    }

    return { success: true, message: 'Data mediator berhasil diperbarui.' };
  },

  deleteMediator(identifier: string): boolean {
    const res = StorageService.deleteMediator(identifier);
    if (db) {
      try {
        const docRef = doc(db, 'mediators', identifier);
        deleteDoc(docRef).catch(() => {});
      } catch {}
    }
    return res;
  },

  addDraftMediator(input: Partial<MediatorKontrak>): MediatorKontrak {
    return StorageService.addDraftMediator(input);
  },

  updateMediatorStatus(identifier: string, status: MediatorStatus, newKdMed?: string, userNama?: string): boolean {
    return StorageService.updateMediatorStatus(identifier, status, newKdMed, userNama);
  },

  async importMediators(
    rows: Partial<MediatorKontrak>[],
    options?: { mode?: 'merge' | 'replace' | 'append'; autoCreateCabangPosko?: boolean; importedBy?: string }
  ): Promise<{ success: boolean; count: number; updatedCount: number; message: string }> {

    let existing = StorageService.getMediators();
    let createdCount = 0;
    let updatedCount = 0;

    if (options?.mode === 'replace') {
      existing = [];
    }

    const map = new Map<string, MediatorKontrak>();
    existing.forEach(m => map.set(m.kd_med, m));

    rows.forEach(r => {
      if (!r.kd_med) return;
      if (map.has(r.kd_med)) {
        const current = map.get(r.kd_med)!;
        map.set(r.kd_med, {
          ...current,
          ...r,
          updated_at: new Date().toISOString()
        } as MediatorKontrak);
        updatedCount++;
      } else {
        const newMed: MediatorKontrak = {
          kd_med: r.kd_med,
          nama_mediator: r.nama_mediator || '',
          no_tlpn: r.no_tlpn || '',
          kd_cabang: r.kd_cabang || 'C16',
          kd_posko: r.kd_posko || 'QJ0',
          kd_ao: r.kd_ao || '',
          status: r.status || 'AKTIF',
          tanggal_bergabung: r.tanggal_bergabung || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        map.set(r.kd_med, newMed);
        createdCount++;
      }
    });

    const result = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(result));
    notifySubscribers();

    // Async batch save to Firestore
    if (db) {
      try {
        const promises = rows.slice(0, 50).map(r => {
          if (!r.kd_med) return Promise.resolve();
          const docRef = doc(db, 'mediators', r.kd_med);
          return setDoc(docRef, { ...r, updated_at_timestamp: serverTimestamp() }, { merge: true });
        });
        Promise.all(promises).catch(() => {});
      } catch {}
    }

    return {
      success: true,
      count: createdCount,
      updatedCount,
      message: `Berhasil mengimpor ${createdCount} data baru dan memperbarui ${updatedCount} data mediator.`
    };
  },

  getFULogs(): FollowUpLog[] {
    return StorageService.getFollowUps();
  },

  addFollowUp(log: Omit<FollowUpLog, 'id' | 'created_at'>): FollowUpLog {
    return StorageService.addFollowUp(log);
  },

  getExCustomers(): ExCustomer[] {
    return StorageService.getExCustomers();
  },

  saveExCustomer(cust: ExCustomer): ExCustomer {
    const res = StorageService.saveExCustomer(cust);
    if (db && cust.no_psb) {
      try {
        const docRef = doc(db, 'ex_customers', cust.no_psb);
        setDoc(docRef, { ...res, updated_at_timestamp: serverTimestamp() }, { merge: true }).catch(() => {});
      } catch {}
    }
    return res;
  },

  async importExCustomers(
    rows: Partial<ExCustomer>[],
    options?: { mode?: 'merge' | 'replace' | 'append'; autoCreateCabangPosko?: boolean; importedBy?: string }
  ): Promise<{ success: boolean; count: number; updatedCount: number; message: string }> {

    let existing = StorageService.getExCustomers();
    let createdCount = 0;
    let updatedCount = 0;

    if (options?.mode === 'replace') {
      existing = [];
    }

    const map = new Map<string, ExCustomer>();
    existing.forEach(c => map.set(c.no_psb, c));

    rows.forEach(r => {
      if (!r.no_psb) return;
      if (map.has(r.no_psb)) {
        const current = map.get(r.no_psb)!;
        map.set(r.no_psb, {
          ...current,
          ...r,
          updated_at: new Date().toISOString()
        } as ExCustomer);
        updatedCount++;
      } else {
        const newCust: ExCustomer = {
          no_psb: r.no_psb,
          nama_konsumen: r.nama_konsumen || '',
          no_polisi: r.no_polisi || '',
          status_bpkb: r.status_bpkb || 'LUNAS',
          status_prospek: r.status_prospek || 'BELUM_DIHUBUNGI',
          status_kredit_lunas: r.status_kredit_lunas || 'Tepat Waktu',
          no_hp: r.no_hp || '',
          kd_cabang: r.kd_cabang || 'C16',
          kd_posko: r.kd_posko || 'QJ0',
          kd_ao: r.kd_ao || '',
          tgl_bpkb_sdk: r.tgl_bpkb_sdk || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        };
        map.set(r.no_psb, newCust);
        createdCount++;
      }
    });

    const result = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(result));
    notifySubscribers();

    // Async batch save to Firestore
    if (db) {
      try {
        const promises = rows.slice(0, 50).map(r => {
          if (!r.no_psb) return Promise.resolve();
          const docRef = doc(db, 'ex_customers', r.no_psb);
          return setDoc(docRef, { ...r, updated_at_timestamp: serverTimestamp() }, { merge: true });
        });
        Promise.all(promises).catch(() => {});
      } catch {}
    }

    return {
      success: true,
      count: createdCount,
      updatedCount,
      message: `Berhasil mengimpor ${createdCount} data baru dan memperbarui ${updatedCount} data konsumen BPKB.`
    };
  },

  getExCustomerFULogs(): ExCustomerFollowUpLog[] {
    return StorageService.getExCustomerFollowUps();
  },

  addExCustomerFollowUp(log: Omit<ExCustomerFollowUpLog, 'id' | 'created_at'>): ExCustomerFollowUpLog {
    return StorageService.addExCustomerFollowUp(log);
  },

  getAssignedExCustomersForCMO(cmoId: string): ExCustomer[] {
    const list = StorageService.getExCustomers();
    return list.filter(c => c.assigned_to_cmo_id === cmoId);
  },

  async assignExCustomerToCMO(no_psb: string, cmoId: string, cmoNama: string): Promise<{ success: boolean; message: string }> {
    const list = StorageService.getExCustomers();
    const idx = list.findIndex(c => c.no_psb === no_psb);
    if (idx === -1) {
      return { success: false, message: 'Konsumen tidak ditemukan.' };
    }

    list[idx] = {
      ...list[idx],
      assigned_to_cmo_id: cmoId,
      assigned_cmo_nama: cmoNama,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(list));
    notifySubscribers();

    if (db) {
      try {
        const docRef = doc(db, 'ex_customers', no_psb);
        await setDoc(docRef, {
          assigned_to_cmo_id: cmoId,
          assigned_cmo_nama: cmoNama,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
        console.warn('Firestore assign note:', err?.message || err);
      }
    }

    return { success: true, message: `Konsumen berhasil ditugaskan ke CMO ${cmoNama}.` };
  },

  async unassignExCustomerCMO(no_psb: string): Promise<{ success: boolean; message: string }> {
    const list = StorageService.getExCustomers();
    const idx = list.findIndex(c => c.no_psb === no_psb);
    if (idx === -1) {
      return { success: false, message: 'Konsumen tidak ditemukan.' };
    }

    delete list[idx].assigned_to_cmo_id;
    delete list[idx].assigned_cmo_nama;
    delete list[idx].assigned_at;
    list[idx].updated_at = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(list));
    notifySubscribers();

    if (db) {
      try {
        const docRef = doc(db, 'ex_customers', no_psb);
        await setDoc(docRef, {
          assigned_to_cmo_id: null,
          assigned_cmo_nama: null,
          assigned_at: null,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
        console.warn('Firestore unassign note:', err?.message || err);
      }
    }

    return { success: true, message: 'Penugasan CMO berhasil dibatalkan.' };
  },

  subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }
};

// -------------------------------------------------------------
// Real-time Firestore Sync Management
// -------------------------------------------------------------
let activeUnsubscribers: (() => void)[] = [];

export function startFirebaseSync(currentUser?: User | null, authUid?: string | null): void {
  stopFirebaseSync();
  if (!db || !currentUser || currentUser.status !== 'AKTIF') return;

  try {
    // 1. Sync Users collection
    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snapshot) => {
      if (!snapshot.empty) {
        const users: User[] = [];
        snapshot.forEach(docSnap => {
          users.push(docSnap.data() as User);
        });
        if (users.length > 0) {
          const localUsers = StorageService.getUsers();
          const userMap = new Map<string, User>();
          localUsers.forEach(u => userMap.set(u.id, u));
          users.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), ...u }));
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(Array.from(userMap.values())));
          notifySubscribers();
        }
      }
    }, (err) => {
      console.debug('[FIREBASE-SYNC] Users collection sync note:', err.message);
    });
    activeUnsubscribers.push(unsubUsers);

    // 2. Sync Mediators collection
    const medCol = query(collection(db, 'mediators'), limit(500));
    const unsubMeds = onSnapshot(medCol, (snapshot) => {
      if (!snapshot.empty) {
        const meds: MediatorKontrak[] = [];
        snapshot.forEach(docSnap => {
          meds.push(docSnap.data() as MediatorKontrak);
        });
        if (meds.length > 0) {
          const localMeds = StorageService.getMediators();
          const medMap = new Map<string, MediatorKontrak>();
          localMeds.forEach(m => medMap.set(m.kd_med, m));
          meds.forEach(m => medMap.set(m.kd_med, { ...medMap.get(m.kd_med), ...m }));
          localStorage.setItem(STORAGE_KEYS.MEDIATORS, JSON.stringify(Array.from(medMap.values())));
          notifySubscribers();
        }
      }
    }, (err) => {
      console.debug('[FIREBASE-SYNC] Mediators collection sync note:', err.message);
    });
    activeUnsubscribers.push(unsubMeds);

    // 3. Sync Ex Customers collection
    const exCol = query(collection(db, 'ex_customers'), limit(500));
    const unsubEx = onSnapshot(exCol, (snapshot) => {
      if (!snapshot.empty) {
        const exList: ExCustomer[] = [];
        snapshot.forEach(docSnap => {
          exList.push(docSnap.data() as ExCustomer);
        });
        if (exList.length > 0) {
          const localEx = StorageService.getExCustomers();
          const exMap = new Map<string, ExCustomer>();
          localEx.forEach(c => exMap.set(c.no_psb, c));
          exList.forEach(c => exMap.set(c.no_psb, { ...exMap.get(c.no_psb), ...c }));
          localStorage.setItem(STORAGE_KEYS.EX_CUSTOMERS, JSON.stringify(Array.from(exMap.values())));
          notifySubscribers();
        }
      }
    }, (err) => {
      console.debug('[FIREBASE-SYNC] Ex-customers collection sync note:', err.message);
    });
    activeUnsubscribers.push(unsubEx);
  } catch (e) {
    console.debug('[FIREBASE-SYNC] Sync initialization note:', e);
  }
}

export function stopFirebaseSync(): void {
  activeUnsubscribers.forEach(unsub => {
    try {
      unsub();
    } catch {}
  });
  activeUnsubscribers = [];
}
