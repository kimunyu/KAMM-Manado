import { AuditLog, AuditActionCategory, UserRole } from '../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  getDocs
} from 'firebase/firestore';

const STORAGE_KEY_AUDIT = 'med_control_audit_logs_v1';

class AuditServiceManager {
  private logs: AuditLog[] = [];
  private unsubscribeFirestore: (() => void) | null = null;
  private listeners: Set<(logs: AuditLog[]) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromLocalStorage();
    this.initFirestoreListener();
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

  private initFirestoreListener() {
    if (this.isInitialized) return;
    this.isInitialized = true;

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
          console.warn('Audit logs realtime listener note (fallback to local):', error.message);
        }
      );
    } catch (e) {
      console.warn('Audit logs Firestore init error:', e);
    }
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
      const docRef = doc(db, 'audit_logs', id);
      await setDoc(docRef, newLog);
    } catch (err: any) {
      console.warn('Gagal sync audit log ke Firestore (tersimpan lokal):', err.message);
    }

    return newLog;
  }
}

export const AuditService = new AuditServiceManager();
