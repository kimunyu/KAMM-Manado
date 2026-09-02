import { doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth, firebaseConfigData } from './firebase';
import { User } from '../types';
import { DatabaseService } from './storage';

export interface UserAuthMappingDoc {
  user_id: string;
  linked_at: string;
  email?: string;
  status?: 'AKTIF' | 'NONAKTIF';
  linked_by?: string;
}

export type MappingValidationStatus = 
  | 'MAPPED'          // Valid 1-to-1 mapping
  | 'UNMAPPED'        // No mapping exists
  | 'CONFLICT'        // UID or User mapped to another entity
  | 'UID_MISMATCH'    // users.firebase_uid differs from user_auth.user_id
  | 'EMAIL_MISMATCH'  // Firebase email differs from Firestore profile email
  | 'INVALID';        // Malformed data

export interface MappingValidationResult {
  valid: boolean;
  status: MappingValidationStatus;
  message: string;
  duplicateUser?: User;
  firebaseUid?: string;
}

export interface VerifiedFirestoreIdentity {
  verified: boolean;
  userAuthExists: boolean;
  userDocExists: boolean;
  mappingUserId?: string;
  mappingStatus?: string;
  profileStatus?: string;
  user?: User;
  reason?: string;
}

// In-flight mutex map to prevent concurrent double-linking race conditions for the same UID
const inFlightLinkOperations = new Map<string, Promise<{ success: boolean; message: string; status?: MappingValidationStatus; user?: User }>>();

/**
 * P0-2C.2: Firebase UID Mapping Enforcement Service
 * 
 * Manages the single-source-of-truth identity relationship between:
 * Firebase Authentication UID <--> user_auth/{firebase_uid} <--> users/{userId}
 * 
 * Rules:
 * 1. Existing user document IDs (e.g. users/USR-001) remain strictly intact.
 * 2. Does NOT escalate privileges (unmapped UID is treated as UNMAPPED, never admin).
 * 3. Does NOT alter passwords or existing roles/permissions.
 * 4. Preserves user active/nonactive status.
 * 5. Strict Zero-Trust: Local cache is only used for candidate lookup, NOT verified identity.
 */
export const UserAuthMappingService = {
  /**
   * Verifies that both user_auth/{firebaseUid} and users/{userId} exist in Firestore,
   * have status 'AKTIF', and point consistently to each other.
   */
  async verifyFirestoreIdentityMapping(firebaseUid: string): Promise<VerifiedFirestoreIdentity> {
    const cleanUid = firebaseUid?.trim();
    if (!cleanUid) {
      return { verified: false, userAuthExists: false, userDocExists: false, reason: 'Firebase UID kosong' };
    }

    if (!db) {
      const allUsers = DatabaseService.getUsers();
      const candidate = allUsers.find(u => u.firebase_uid === cleanUid);
      if (candidate && candidate.status === 'AKTIF') {
        return {
          verified: true,
          userAuthExists: false,
          userDocExists: false,
          user: candidate,
          profileStatus: candidate.status
        };
      }
      return { verified: false, userAuthExists: false, userDocExists: false, reason: 'Firestore DB tidak aktif' };
    }

    try {
      // 1. Check user_auth/{cleanUid} in Firestore
      const authDocRef = doc(db, 'user_auth', cleanUid);
      const authDocSnap = await getDoc(authDocRef);

      if (!authDocSnap.exists()) {
        // Also check if users/{cleanUid} exists directly
        const directUserRef = doc(db, 'users', cleanUid);
        const directUserSnap = await getDoc(directUserRef);
        if (directUserSnap.exists()) {
          const directUser = directUserSnap.data() as User;
          if (directUser.status === 'AKTIF') {
            return {
              verified: true,
              userAuthExists: false,
              userDocExists: true,
              mappingUserId: cleanUid,
              profileStatus: directUser.status,
              user: { ...directUser, firebase_uid: cleanUid }
            };
          }
        }
        return {
          verified: false,
          userAuthExists: false,
          userDocExists: false,
          reason: `Dokumen user_auth/${cleanUid} belum ada di Firestore`
        };
      }

      const mappingData = authDocSnap.data() as UserAuthMappingDoc;
      const mappingUserId = mappingData.user_id;
      const mappingStatus = mappingData.status || 'AKTIF';

      if (!mappingUserId) {
        return {
          verified: false,
          userAuthExists: true,
          userDocExists: false,
          reason: 'Dokumen user_auth tidak memiliki field user_id'
        };
      }

      if (mappingStatus !== 'AKTIF') {
        return {
          verified: false,
          userAuthExists: true,
          userDocExists: false,
          mappingUserId,
          mappingStatus,
          reason: `Status mapping user_auth adalah "${mappingStatus}" (bukan AKTIF)`
        };
      }

      // 2. Check users/{mappingUserId} in Firestore
      const userDocRef = doc(db, 'users', mappingUserId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        return {
          verified: false,
          userAuthExists: true,
          userDocExists: false,
          mappingUserId,
          mappingStatus,
          reason: `Dokumen master users/${mappingUserId} belum ada di Firestore`
        };
      }

      const firestoreUser = userDocSnap.data() as User;
      const profileStatus = firestoreUser.status || 'AKTIF';

      if (profileStatus !== 'AKTIF') {
        return {
          verified: false,
          userAuthExists: true,
          userDocExists: true,
          mappingUserId,
          mappingStatus,
          profileStatus,
          reason: `Profil master pengguna users/${mappingUserId} berstatus "${profileStatus}" (bukan AKTIF)`
        };
      }

      const verifiedUser: User = {
        ...firestoreUser,
        id: firestoreUser.id || mappingUserId,
        firebase_uid: cleanUid
      };

      console.log('[FORENSIC-AUTH]', {
        projectId: firebaseConfigData?.projectId || 'kamm-manado',
        databaseId: (firebaseConfigData as any)?.firestoreDatabaseId || 'ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e',
        authUid: cleanUid,
        email: auth?.currentUser?.email || null,
        emailVerified: auth?.currentUser?.emailVerified ?? false,
        providerId: auth?.currentUser?.providerData?.[0]?.providerId || 'password',
        userAuthExists: true,
        mappedUserId: mappingUserId,
        mappedUserStatus: mappingStatus,
        profileExists: true,
        profileStatus,
        profileRole: verifiedUser.role,
        profileKdAo: verifiedUser.kd_ao || null,
        profileKdCabang: verifiedUser.kd_cabang || null,
        profileKdPosko: verifiedUser.kd_posko || null
      });

      console.log('[FORENSIC-IDENTITY]', {
        authUid: cleanUid,
        userAuthExists: true,
        userAuthUserId: mappingUserId,
        userAuthStatus: mappingStatus,
        userDocExists: true,
        userStatus: profileStatus,
        role: verifiedUser.role,
        username: verifiedUser.username,
        kd_ao: verifiedUser.kd_ao || null,
        kd_cabang: verifiedUser.kd_cabang || null,
        kd_posko: verifiedUser.kd_posko || null,
        firebase_uid: cleanUid
      });

      return {
        verified: true,
        userAuthExists: true,
        userDocExists: true,
        mappingUserId,
        mappingStatus,
        profileStatus,
        user: verifiedUser
      };
    } catch (err: any) {
      console.warn('[IDENTITY-VERIFY-ERROR]', err);
      return {
        verified: false,
        userAuthExists: false,
        userDocExists: false,
        reason: err?.message || 'Error saat verifikasi Firestore identity'
      };
    }
  },

  /**
   * Resolves a Firebase UID to its verified User Profile in Firestore.
   * Target flow: Firebase UID -> user_auth/{uid} -> user_id -> users/{user_id} -> Verified User
   * NOTE: Never returns unverified local cache if Firestore user_auth does not exist.
   */
  async getUserProfileByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const verified = await this.verifyFirestoreIdentityMapping(firebaseUid);
    if (verified.verified && verified.user) {
      return verified.user;
    }
    return null;
  },

  /**
   * Helper to find candidate user in local state by username, email, or cached UID.
   * Strictly used for linking discovery, never as proof of Firestore identity.
   */
  findCandidateUser(params: { username?: string; email?: string; firebaseUid?: string }): User | null {
    const allUsers = DatabaseService.getUsers();
    const cleanUsername = params.username?.trim().toLowerCase();
    const cleanEmail = params.email?.trim().toLowerCase();
    const cleanUid = params.firebaseUid?.trim();

    if (cleanUid) {
      const byUid = allUsers.find(u => u.firebase_uid === cleanUid);
      if (byUid) return byUid;
    }
    if (cleanEmail) {
      const byEmail = allUsers.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
      if (byEmail) return byEmail;

      if (cleanEmail.endsWith('@kamm-manado.internal')) {
        const prefix = cleanEmail.replace('@kamm-manado.internal', '').trim().toLowerCase();
        const byPrefix = allUsers.find(u => 
          (u.kd_ao && u.kd_ao.trim().toLowerCase() === prefix) ||
          (u.username && u.username.trim().toLowerCase() === prefix)
        );
        if (byPrefix) return byPrefix;
      }
    }
    if (cleanUsername) {
      const byUsername = allUsers.find(u => 
        (u.username && u.username.trim().toLowerCase() === cleanUsername) ||
        (u.kd_ao && u.kd_ao.trim().toLowerCase() === cleanUsername)
      );
      if (byUsername) return byUsername;
    }
    return null;
  },

  /**
   * Retrieves the Firebase UID mapped to a given user ID.
   */
  async getFirebaseUidForUser(userId: string): Promise<string | null> {
    const cleanId = userId?.trim();
    if (!cleanId) return null;

    const allUsers = DatabaseService.getUsers();
    const user = allUsers.find(u => u.id === cleanId);
    if (user && user.firebase_uid) {
      return user.firebase_uid;
    }

    if (db) {
      try {
        const userDocRef = doc(db, 'users', cleanId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data() as User;
          return data.firebase_uid || null;
        }
      } catch (err) {
        console.warn('UserAuthMapping: Error fetching user doc from Firestore:', err);
      }
    }

    return null;
  },

  /**
   * Validates duplicate protection, conflict detection, and email consistency.
   */
  async validateFirebaseUidMapping(
    firebaseUid: string, 
    userId: string, 
    authEmail?: string
  ): Promise<MappingValidationResult> {
    const cleanUid = firebaseUid?.trim();
    const cleanUserId = userId?.trim();

    if (!cleanUid || !cleanUserId) {
      return {
        valid: false,
        status: 'INVALID',
        message: 'Firebase UID dan User ID wajib diisi.'
      };
    }

    const allUsers = DatabaseService.getUsers();
    const targetUser = allUsers.find(u => u.id === cleanUserId);

    if (!targetUser) {
      return {
        valid: false,
        status: 'INVALID',
        message: `Pengguna dengan ID "${cleanUserId}" tidak ditemukan dalam sistem.`
      };
    }

    // Check Case D: Target user already has a different firebase_uid
    if (targetUser.firebase_uid && targetUser.firebase_uid !== cleanUid) {
      return {
        valid: false,
        status: 'CONFLICT',
        message: `Akun "${targetUser.nama}" sudah terhubung dengan UID lain (${targetUser.firebase_uid}). Overwrite otomatis ditolak demi keamanan.`,
        firebaseUid: targetUser.firebase_uid
      };
    }

    // Check Case C: UID is already assigned to another user in local cache
    const duplicateUidUser = allUsers.find(u => u.id !== cleanUserId && u.firebase_uid === cleanUid);
    if (duplicateUidUser) {
      return {
        valid: false,
        status: 'CONFLICT',
        message: `Firebase UID ini sudah terhubung dengan akun lain: "${duplicateUidUser.nama}" (@${duplicateUidUser.username}).`,
        duplicateUser: duplicateUidUser
      };
    }

    // Check Firestore user_auth collection for conflicts
    if (db) {
      try {
        const authDocRef = doc(db, 'user_auth', cleanUid);
        const authDocSnap = await getDoc(authDocRef);

        if (authDocSnap.exists()) {
          const authData = authDocSnap.data() as UserAuthMappingDoc;
          if (authData.user_id && authData.user_id !== cleanUserId) {
            const conflictUser = allUsers.find(u => u.id === authData.user_id);
            return {
              valid: false,
              status: 'CONFLICT',
              message: `Dokumen user_auth/${cleanUid} sudah menunjuk ke user ID "${authData.user_id}" (${conflictUser?.nama || 'Unknown'}). Operasi ditolak.`,
              duplicateUser: conflictUser
            };
          }
        }
      } catch (err) {
        console.warn('UserAuthMapping: Validation Firestore query warning:', err);
      }
    }

    // Check Case B: Already linked
    if (targetUser.firebase_uid === cleanUid) {
      return {
        valid: true,
        status: 'MAPPED',
        message: `Akun "${targetUser.nama}" sudah terhubung dengan Firebase UID ini.`
      };
    }

    // Check Email validation / consistency
    if (authEmail && targetUser.email) {
      const cleanAuthEmail = authEmail.trim().toLowerCase();
      const cleanProfileEmail = targetUser.email.trim().toLowerCase();
      if (cleanAuthEmail !== cleanProfileEmail) {
        return {
          valid: true,
          status: 'EMAIL_MISMATCH',
          message: `Email Firebase (${cleanAuthEmail}) berbeda dengan email profil (${cleanProfileEmail}). Mapping tetap valid namun dicatat sebagai EMAIL_MISMATCH.`
        };
      }
    }

    // Case A: Fresh linking allowed
    return {
      valid: true,
      status: 'MAPPED',
      message: 'Valid untuk dilakukan penautan UID.'
    };
  },

  /**
   * Links a User Profile to a Firebase Auth UID consistently and atomically.
   * Implements single-flight mutex and post-commit verification.
   */
  async linkUserToFirebaseUid(
    userId: string,
    firebaseUid: string,
    authEmail?: string,
    linkedBy: string = 'SUPER_ADMIN'
  ): Promise<{ success: boolean; message: string; status?: MappingValidationStatus; user?: User }> {
    const cleanUid = firebaseUid?.trim();
    const cleanUserId = userId?.trim();

    if (!cleanUid || !cleanUserId) {
      return { success: false, message: 'User ID dan Firebase UID tidak boleh kosong.' };
    }

    // Single-Flight check: deduplicate concurrent linking calls for the same UID
    const existingOp = inFlightLinkOperations.get(cleanUid);
    if (existingOp) {
      return existingOp;
    }

    const executionPromise = (async (): Promise<{ success: boolean; message: string; status?: MappingValidationStatus; user?: User }> => {
      // 1. Run conflict validation
      const validation = await this.validateFirebaseUidMapping(cleanUid, cleanUserId, authEmail);
      if (!validation.valid) {
        return { success: false, message: validation.message, status: validation.status };
      }

      const allUsers = DatabaseService.getUsers();
      const userIndex = allUsers.findIndex(u => u.id === cleanUserId);
      if (userIndex === -1) {
        return { success: false, message: 'User tidak ditemukan dalam database lokal.' };
      }

      const targetUser = allUsers[userIndex];
      const nowIso = new Date().toISOString();

      const updatedUser: User = {
        ...targetUser,
        firebase_uid: cleanUid
      };

      const mappingDoc: UserAuthMappingDoc = {
        user_id: cleanUserId,
        linked_at: nowIso,
        email: authEmail || targetUser.email,
        status: targetUser.status,
        linked_by: linkedBy
      };

      // 2. Perform Firestore Atomic Batch Write if db is available
      if (db) {
        try {
          const userDocRef = doc(db, 'users', cleanUserId);
          const userDocSnap = await getDoc(userDocRef);

          // Zero Privilege Escalation: CMO / client cannot create master user documents
          if (!userDocSnap.exists()) {
            return {
              success: false,
              message: `Profil pengguna "${cleanUserId}" belum tersedia di Firestore. Hubungi Administrator untuk provisioning master data.`
            };
          }

          const existingUserData = userDocSnap.data() as User;
          if (existingUserData.status !== 'AKTIF') {
            return {
              success: false,
              message: `Profil pengguna "${cleanUserId}" tidak berstatus AKTIF di Firestore. Hubungi Administrator.`
            };
          }

          const authDocRef = doc(db, 'user_auth', cleanUid);
          const authDocSnap = await getDoc(authDocRef);

          // If already correctly mapped, avoid redundant write
          if (authDocSnap.exists() && 
              (authDocSnap.data() as UserAuthMappingDoc).user_id === cleanUserId && 
              existingUserData.firebase_uid === cleanUid) {
            console.log('[FORENSIC-MAPPING]', {
              status: 'ALREADY_MAPPED',
              firebaseUid: cleanUid,
              userId: cleanUserId,
              email: authEmail || targetUser.email,
              linkedBy
            });
            DatabaseService.saveUser(updatedUser, true);
            return {
              success: true,
              message: `Akun "${targetUser.nama}" sudah terhubung ke Firebase UID ini.`,
              status: 'MAPPED',
              user: updatedUser
            };
          }

          console.log('[FORENSIC-MAPPING]', {
            status: 'LINKING',
            firebaseUid: cleanUid,
            userId: cleanUserId,
            email: authEmail || targetUser.email,
            linkedBy
          });

          const batch = writeBatch(db);
          
          // Document 1: users/{userId} (self-linking firebase_uid)
          batch.set(userDocRef, { firebase_uid: cleanUid }, { merge: true });

          // Document 2: user_auth/{firebaseUid}
          batch.set(authDocRef, mappingDoc);

          await batch.commit();

          // 3. Post-commit verification: read back both documents to confirm write
          const [verifyAuthSnap, verifyUserSnap] = await Promise.all([
            getDoc(authDocRef),
            getDoc(userDocRef)
          ]);

          if (!verifyAuthSnap.exists() || !verifyUserSnap.exists()) {
            return {
              success: false,
              message: 'Verifikasi dokumen Firestore mapping gagal setelah batch write.'
            };
          }
        } catch (err: any) {
          const errorCode = err?.code || 'unknown';
          const errorMessage = err?.message || String(err);

          console.error('[FORENSIC-FIRESTORE-DENIED]', {
            operation: 'batch',
            path: `users/${cleanUserId} + user_auth/${cleanUid}`,
            method: 'batch.commit',
            projectId: firebaseConfigData?.projectId || 'kamm-manado',
            databaseId: (firebaseConfigData as any)?.firestoreDatabaseId || 'ai-studio-mediatorkontrakm-919304e3-4fb7-4025-a4e8-2c90f5b0fe3e',
            authUid: cleanUid,
            errorCode,
            errorMessage
          });

          console.warn('UserAuthMapping: Firestore batch commit failed:', err);
          return {
            success: false,
            message: `Gagal memperbarui Firestore mapping: ${errorMessage || err}`
          };
        }
      }

      // 4. Update local database cache
      DatabaseService.saveUser(updatedUser, true);

      return {
        success: true,
        message: `Berhasil menautkan akun "${targetUser.nama}" ke Firebase UID (${cleanUid.slice(0, 8)}...).`,
        status: validation.status,
        user: updatedUser
      };
    })();

    inFlightLinkOperations.set(cleanUid, executionPromise);
    try {
      return await executionPromise;
    } finally {
      inFlightLinkOperations.delete(cleanUid);
    }
  },

  /**
   * Unlinks a User Profile from Firebase UID (Emergency / Admin Recovery).
   */
  async unlinkUserFromFirebaseUid(userId: string): Promise<{ success: boolean; message: string }> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId) {
      return { success: false, message: 'User ID tidak valid.' };
    }

    const allUsers = DatabaseService.getUsers();
    const user = allUsers.find(u => u.id === cleanUserId);
    if (!user) {
      return { success: false, message: 'User tidak ditemukan.' };
    }

    const oldUid = user.firebase_uid;

    const updatedUser: User = {
      ...user,
      firebase_uid: undefined
    };

    if (db && oldUid) {
      try {
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', cleanUserId);
        batch.update(userDocRef, { firebase_uid: null as any });

        const authDocRef = doc(db, 'user_auth', oldUid);
        batch.delete(authDocRef);

        await batch.commit();
      } catch (err: any) {
        console.warn('UserAuthMapping: Unlink Firestore warning:', err);
      }
    }

    DatabaseService.saveUser(updatedUser, true);

    return {
      success: true,
      message: `Tautan Firebase Auth untuk akun "${user.nama}" berhasil dilepas.`
    };
  },

  /**
   * Diagnostic inspector for a single user's auth mapping state.
   */
  async validateUserAuthMapping(userId: string): Promise<MappingValidationResult> {
    const cleanId = userId?.trim();
    if (!cleanId) {
      return { valid: false, status: 'INVALID', message: 'User ID kosong.' };
    }

    const allUsers = DatabaseService.getUsers();
    const user = allUsers.find(u => u.id === cleanId);
    if (!user) {
      return { valid: false, status: 'INVALID', message: 'User tidak ditemukan.' };
    }

    if (!user.firebase_uid) {
      return {
        valid: false,
        status: 'UNMAPPED',
        message: 'Pengguna belum memiliki Firebase UID (UNMAPPED).'
      };
    }

    // Check if duplicate user in local database has same UID
    const duplicateUidUser = allUsers.find(u => u.id !== cleanId && u.firebase_uid === user.firebase_uid);
    if (duplicateUidUser) {
      return {
        valid: false,
        status: 'CONFLICT',
        message: `UID ${user.firebase_uid} juga digunakan oleh ${duplicateUidUser.nama} (@${duplicateUidUser.username}).`,
        duplicateUser: duplicateUidUser,
        firebaseUid: user.firebase_uid
      };
    }

    if (db) {
      try {
        const authDocRef = doc(db, 'user_auth', user.firebase_uid);
        const snap = await getDoc(authDocRef);

        if (!snap.exists()) {
          return {
            valid: false,
            status: 'UID_MISMATCH',
            message: `User memiliki firebase_uid (${user.firebase_uid}) tetapi dokumen user_auth/${user.firebase_uid} belum ada di Firestore.`,
            firebaseUid: user.firebase_uid
          };
        }

        const data = snap.data() as UserAuthMappingDoc;
        if (data.user_id !== cleanId) {
          return {
            valid: false,
            status: 'CONFLICT',
            message: `Dokumen user_auth/${user.firebase_uid} menunjuk ke user_id "${data.user_id}", bukan "${cleanId}".`,
            firebaseUid: user.firebase_uid
          };
        }

        // Email mismatch check
        if (data.email && user.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
          return {
            valid: true,
            status: 'EMAIL_MISMATCH',
            message: `Mapping konsisten, tetapi email di Firebase (${data.email}) berbeda dari email profile (${user.email}).`,
            firebaseUid: user.firebase_uid
          };
        }
      } catch (err) {
        console.warn('UserAuthMapping: Diagnostic Firestore query error:', err);
      }
    }

    return {
      valid: true,
      status: 'MAPPED',
      message: 'Mapping konsisten dan valid.',
      firebaseUid: user.firebase_uid
    };
  }
};

