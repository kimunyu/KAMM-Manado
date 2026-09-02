import { SystemHealthStatus } from '../types';
import { db } from './firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { DatabaseService } from './storage';
import { AuditService } from './auditService';

export async function checkSystemHealth(): Promise<SystemHealthStatus> {
  const startTime = performance.now();
  let firestoreConnected = false;
  let latencyMs = 0;

  try {
    // Ping Firestore by querying 1 doc from users collection
    const q = query(collection(db, 'users'), limit(1));
    await getDocs(q);
    const endTime = performance.now();
    latencyMs = Math.round(endTime - startTime);
    firestoreConnected = true;
  } catch (err) {
    console.warn('Health check Firestore ping failed:', err);
    firestoreConnected = false;
    latencyMs = -1;
  }

  const users = DatabaseService.getUsers();
  const mediators = DatabaseService.getMediators();
  const fuLogs = DatabaseService.getFULogs();
  const exCustomers = DatabaseService.getExCustomers();
  const exCustomerLogs = DatabaseService.getExCustomerFULogs();
  const cabang = DatabaseService.getCabangList();
  const posko = DatabaseService.getPoskoList();
  const auditLogs = AuditService.getLogs();

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    firestoreConnected,
    latencyMs,
    lastChecked: new Date().toISOString(),
    collectionCounts: {
      users: users.length,
      mediators: mediators.length,
      fu_logs: fuLogs.length,
      ex_customers: exCustomers.length,
      ex_customer_fu_logs: exCustomerLogs.length,
      cabang: cabang.length,
      posko: posko.length,
      audit_logs: auditLogs.length,
    }
  };
}
