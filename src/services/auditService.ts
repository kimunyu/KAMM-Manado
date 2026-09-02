import { AuditLog, AuditActionCategory, UserRole, User } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit
} from 'firebase/firestore';

const STORAGE_KEY_AUDIT = 'med_control_audit_logs_v1';

class AuditServiceManager {
  private logs: AuditLog[] = [];
  private unsubscribeFirestore: (() => void) | null = null;
  private listeners: Set<(logs: AuditLog[]) => void> = new Set();
  private activeSyncUid: string | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Gagal membaca audit logs lokal:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.logs.slice(0, 500)));
    } catch (e) {
      console.warn('Gagal menyimpan audit logs lokal:', e);
    }
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getLogs());
      } catch (err) {
        console.error('Error notifying audit subscriber:', err);
      }
    });
  }

  /**
   * Start real-time Firestore listener only when an active authenticated user is logged in
   */
  public startSync(currentUser?: User | null, authenticatedUid?: string | null) {
    if (!db || !auth) return;

    const currentAuthUid = authenticatedUid || auth.currentUser?.uid;
    if (!currentAuthUid || !currentUser || currentUser.status !== 'AKTIF') {
      this.stopSync();
      return;
    }

    if (this.activeSyncUid === currentAuthUid && this.unsubscribeFirestore) {
      return; // Already actively syncing for this session
    }

    this.stopSync();
    this.activeSyncUid = currentAuthUid;

    try {
      const colRef = collection(db, 'audit_logs');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(300));

      this.unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const list: AuditLog[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as AuditLog);
          });
          if (list.length > 0) {
            this.logs = list;
            this.saveToLocalStorage();
            this.notify();
          }
        },
        (error) => {
          if (error.code === 'permission-denied') {
            // Permission restricted for current role - fall back smoothly to local logs
            console.debug('[AUDIT-SYNC] Audit logs restricted or unpermitted for current session.');
          } else {
            console.debug('[AUDIT-SYNC] Firestore onSnapshot note:', error.message);
          }
        }
      );
    } catch (e) {
      console.debug('[AUDIT-SYNC] Init listener error:', e);
    }
  }

  /**
   * Stop listener on user logout or session reset
   */
  public stopSync() {
    if (this.unsubscribeFirestore) {
      try {
        this.unsubscribeFirestore();
      } catch (err) {
        // silent
      }
      this.unsubscribeFirestore = null;
    }
    this.activeSyncUid = null;
  }

  public getLogs(): AuditLog[] {
    return [...this.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public subscribe(callback: (logs: AuditLog[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getLogs());
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Record a new audit log entry to Firestore and local state
   */
  public async record(
    actor: { id: string; nama: string; role: UserRole; kd_ao?: string },
    category: AuditActionCategory,
    action: string,
    description: string,
    target_id?: string,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    const id = `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newLog: AuditLog = {
      id,
      timestamp,
      actor_id: actor.id,
      actor_name: actor.nama,
      actor_role: actor.role,
      actor_kd_ao: actor.kd_ao || '',
      category,
      action,
      description,
      target_id: target_id || '',
      metadata: metadata || {}
    };

    // Prepend to local memory and cache
    this.logs = [newLog, ...this.logs.filter(l => l.id !== id)].slice(0, 500);
    this.saveToLocalStorage();
    this.notify();

    // Persist to Firestore asynchronously
    try {
      if (db) {
        const docRef = doc(db, 'audit_logs', id);
        await setDoc(docRef, newLog);
      }
    } catch (err: any) {
      // If Firestore write fails (e.g. offline/permission), keep in local memory
      console.debug('[AUDIT-LOG] Local cache kept; Firestore async persist note:', err?.message || err);
    }

    return newLog;
  }
}

export const AuditService = new AuditServiceManager();
