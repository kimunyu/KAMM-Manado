import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { DatabaseService } from './storage';
import { UserAuthMappingService } from './userAuthMapping';
import { db, firebaseConfigData } from './firebase';
import { mapFirebaseAuthError } from './firebaseAuth';

export type FirebaseMigrationStatus = 
  | 'MIGRATED'         // Has firebase_uid linked
  | 'READY'            // Has valid identifier/email, ready to be provisioned
  | 'EMAIL_REQUIRED'   // Missing username/kd_ao
  | 'CONFLICT'         // Duplicate identifier across different Firestore users
  | 'ERROR';           // Invalid format or other error

export interface UserMigrationSummary {
  totalUsers: number;
  migratedCount: number;
  readyCount: number;
  emailRequiredCount: number;
  conflictCount: number;
}

export interface UserProvisioningStatus {
  user: User;
  status: FirebaseMigrationStatus;
  statusMessage: string;
  hasFirebaseUid: boolean;
  hasEmail: boolean;
  firebaseIdentifier?: string;
  duplicateWithUserId?: string;
}

export interface ProvisionResult {
  userId: string;
  nama: string;
  username: string;
  kd_ao?: string;
  email: string;
  firebase_uid?: string;
  success: boolean;
  message: string;
  error?: string;
}

export interface BulkProvisionSummary {
  total: number;
  processed: number;
  successCount: number;
  failedCount: number;
  results: ProvisionResult[];
}

/**
 * Derives the official deterministic Firebase Auth email identifier from a User record.
 * Prioritizes user's kd_ao (e.g. 'MN.72' -> 'mn.72@kamm-manado.internal').
 * If kd_ao is missing, falls back to username (e.g. 'superadmin' -> 'superadmin@kamm-manado.internal').
 */
export function deriveUserAuthEmail(user: User): string {
  const rawPrefix = (user.kd_ao || user.username || 'user').trim();
  const cleanPrefix = (rawPrefix.includes('@') ? rawPrefix.split('@')[0] : rawPrefix)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');
  return `${cleanPrefix || 'user'}@kamm-manado.internal`;
}

/**
 * Service to inspect, audit, and evaluate Firebase UID mapping & provisioning readiness.
 * (P0-2B - Client-Safe / Super Admin Diagnostics & Automated Provisioning)
 */
export const UserProvisioningService = {
  /**
   * Derives the designated email identifier for a user.
   */
  getUserAuthEmail(user: User): string {
    return deriveUserAuthEmail(user);
  },

  /**
   * Evaluates the Firebase Auth migration status of a single user.
   */
  evaluateUserStatus(user: User, allUsers: User[]): UserProvisioningStatus {
    const hasUid = !!(user.firebase_uid && user.firebase_uid.trim().length > 0);
    const derivedIdentifier = deriveUserAuthEmail(user);
    const hasIdentifier = derivedIdentifier.length > 0;
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : '';

    // 1. Check if already migrated with Firebase UID
    if (hasUid) {
      return {
        user,
        status: 'MIGRATED',
        statusMessage: 'Sudah terhubung ke Firebase Authentication.',
        hasFirebaseUid: true,
        hasEmail: true,
        firebaseIdentifier: derivedIdentifier
      };
    }

    // 2. Check if username/identifier is missing
    if (!hasIdentifier || !user.username) {
      return {
        user,
        status: 'EMAIL_REQUIRED',
        statusMessage: 'Username / Kode AO belum terisi.',
        hasFirebaseUid: false,
        hasEmail: false
      };
    }

    // 3. Duplicate Check: Ensure no other Firestore user uses the exact same derived identifier
    const duplicateUser = allUsers.find(
      u => u.id !== user.id && (
        deriveUserAuthEmail(u) === derivedIdentifier ||
        (cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail)
      )
    );

    if (duplicateUser) {
      return {
        user,
        status: 'CONFLICT',
        statusMessage: `Konflik kredensial! Identitas sama digunakan oleh akun "${duplicateUser.nama}" (@${duplicateUser.username}).`,
        hasFirebaseUid: false,
        hasEmail: !!cleanEmail,
        firebaseIdentifier: derivedIdentifier,
        duplicateWithUserId: duplicateUser.id
      };
    }

    // 4. Ready for provisioning
    return {
      user,
      status: 'READY',
      statusMessage: `Siap diprovisioning ke Firebase Authentication (${derivedIdentifier}).`,
      hasFirebaseUid: false,
      hasEmail: true,
      firebaseIdentifier: derivedIdentifier
    };
  },

  /**
   * Computes the migration summary across all users.
   */
  getMigrationSummary(allUsers: User[]): UserMigrationSummary {
    let migratedCount = 0;
    let readyCount = 0;
    let emailRequiredCount = 0;
    let conflictCount = 0;

    allUsers.forEach(u => {
      const evaluation = this.evaluateUserStatus(u, allUsers);
      switch (evaluation.status) {
        case 'MIGRATED':
          migratedCount++;
          break;
        case 'READY':
          readyCount++;
          break;
        case 'EMAIL_REQUIRED':
          emailRequiredCount++;
          break;
        case 'CONFLICT':
          conflictCount++;
          break;
        default:
          break;
      }
    });

    return {
      totalUsers: allUsers.length,
      migratedCount,
      readyCount,
      emailRequiredCount,
      conflictCount
    };
  },

  /**
   * Links a Firebase UID to an existing Firestore user document without altering documentId.
   */
  async linkFirebaseUid(userId: string, firebaseUid: string): Promise<{ success: boolean; message: string }> {
    const users = DatabaseService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, message: 'User tidak ditemukan di sistem database.' };
    }

    const cleanUid = firebaseUid.trim();
    if (!cleanUid) {
      return { success: false, message: 'Firebase UID tidak boleh kosong.' };
    }

    // Check if UID is already used by another user
    const duplicateUidUser = users.find(u => u.id !== userId && u.firebase_uid === cleanUid);
    if (duplicateUidUser) {
      return { 
        success: false, 
        message: `Firebase UID ini sudah terhubung dengan akun "${duplicateUidUser.nama}" (@${duplicateUidUser.username}).` 
      };
    }

    const targetUser = users[userIndex];
    const derivedEmail = deriveUserAuthEmail(targetUser);
    const updatedUser: User = {
      ...targetUser,
      firebase_uid: cleanUid,
      email: derivedEmail
    };

    // Ensure Firestore user_auth mapping document is created atomically
    await UserAuthMappingService.linkUserToFirebaseUid(userId, cleanUid, derivedEmail).catch(err => {
      console.warn('UserProvisioningService link mapping background error:', err);
    });

    return await DatabaseService.saveUser(updatedUser, true);
  },

  /**
   * Provisions a single user into Firebase Authentication and maps their UID in Firestore.
   * Uses an isolated secondary Firebase app to avoid disrupting the current Super Admin session.
   */
  async provisionSingleUser(user: User, customPassword?: string): Promise<ProvisionResult> {
    const email = deriveUserAuthEmail(user);
    const password = customPassword || 'test1234';

    if (!firebaseConfigData || !firebaseConfigData.apiKey) {
      return {
        userId: user.id,
        nama: user.nama,
        username: user.username,
        kd_ao: user.kd_ao,
        email,
        success: false,
        message: 'Konfigurasi Firebase belum siap.',
        error: 'FIREBASE_CONFIG_MISSING'
      };
    }

    const secondaryAppName = `ProvisionApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let secondaryApp: any = null;

    try {
      secondaryApp = initializeApp(firebaseConfigData, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      let firebaseUid: string | null = null;

      // 1. Try creating a new Firebase Auth account
      try {
        const createRes = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        firebaseUid = createRes.user.uid;
      } catch (createErr: any) {
        // If email already exists in Firebase Auth, attempt sign-in to retrieve existing UID
        if (createErr?.code === 'auth/email-already-in-use') {
          try {
            // Try with requested password
            const signRes = await signInWithEmailAndPassword(secondaryAuth, email, password);
            firebaseUid = signRes.user.uid;
          } catch (signErr1: any) {
            // Try with user's current password from record (e.g. '1234' or custom password)
            if (user.password && user.password !== password) {
              try {
                const signRes2 = await signInWithEmailAndPassword(secondaryAuth, email, user.password);
                firebaseUid = signRes2.user.uid;
              } catch (signErr2: any) {
                // Try fallback '1234'
                try {
                  const signRes3 = await signInWithEmailAndPassword(secondaryAuth, email, '1234');
                  firebaseUid = signRes3.user.uid;
                } catch {
                  throw new Error(`Akun "${email}" sudah ada di Firebase Auth dengan password lain.`);
                }
              }
            } else {
              throw signErr1;
            }
          }
        } else {
          throw createErr;
        }
      }

      // Sign out from secondary auth session
      await signOut(secondaryAuth).catch(() => {});

      if (!firebaseUid) {
        throw new Error('Gagal mendapatkan Firebase UID.');
      }

      // 2. Write/Update Firestore user_auth/{firebaseUid}
      if (db) {
        await setDoc(doc(db, 'user_auth', firebaseUid), {
          user_id: user.id,
          email: email,
          status: user.status || 'AKTIF',
          linked_at: new Date().toISOString(),
          linked_by: 'SUPER_ADMIN_PROVISIONING'
        }, { merge: true });
      }

      // 3. Update master users/{user.id} in Firestore and local state
      const updatedUser: User = {
        ...user,
        firebase_uid: firebaseUid,
        email: email,
        password: password
      };

      const saveRes = await DatabaseService.saveUser(updatedUser, true);
      if (!saveRes.success) {
        throw new Error(saveRes.message);
      }

      return {
        userId: user.id,
        nama: user.nama,
        username: user.username,
        kd_ao: user.kd_ao,
        email,
        firebase_uid: firebaseUid,
        success: true,
        message: `Berhasil membuat & menautkan Firebase UID (${firebaseUid.slice(0, 8)}...) untuk ${user.nama}`
      };

    } catch (err: any) {
      console.warn(`[PROVISION-USER-FAILED] user=${user.username} email=${email}:`, err);
      return {
        userId: user.id,
        nama: user.nama,
        username: user.username,
        kd_ao: user.kd_ao,
        email,
        success: false,
        message: mapFirebaseAuthError(err) || err?.message || 'Gagal melakukan provisioning.',
        error: err?.code || err?.message
      };
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch {
          // Ignore app cleanup error
        }
      }
    }
  },

  /**
   * Bulk provisions all users without a Firebase UID.
   * Processes sequentially to avoid Firebase Auth rate limits.
   */
  async provisionAllUnlinkedUsers(
    allUsers: User[],
    defaultPassword = 'test1234',
    onProgress?: (current: number, total: number, user: User, status: 'PROVISIONING' | 'SUCCESS' | 'FAILED', message?: string) => void
  ): Promise<BulkProvisionSummary> {
    const unlinkedUsers = allUsers.filter(u => !u.firebase_uid || u.firebase_uid.trim().length === 0);
    const total = unlinkedUsers.length;
    const results: ProvisionResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < unlinkedUsers.length; i++) {
      const user = unlinkedUsers[i];
      if (onProgress) {
        onProgress(i + 1, total, user, 'PROVISIONING', `Memproses ${user.nama} (${deriveUserAuthEmail(user)})...`);
      }

      const res = await this.provisionSingleUser(user, defaultPassword);
      results.push(res);

      if (res.success) {
        successCount++;
        if (onProgress) {
          onProgress(i + 1, total, user, 'SUCCESS', res.message);
        }
      } else {
        failedCount++;
        if (onProgress) {
          onProgress(i + 1, total, user, 'FAILED', res.message);
        }
      }

      // Small delay between requests (150ms) to ensure smooth Firebase rate-limiting compliance
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return {
      total,
      processed: results.length,
      successCount,
      failedCount,
      results
    };
  }
};
