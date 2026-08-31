import { doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
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
 */
export const UserAuthMappingService = {
  /**
   * Resolves a Firebase UID to its corresponding User Profile.
   * Target flow: Firebase UID -> user_auth/{uid} -> user_id -> users/{user_id} -> User Profile
   */
  async getUserProfileByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const cleanUid = firebaseUid?.trim();
    if (!cleanUid) return null;

    const allUsers = DatabaseService.getUsers();

    // 1. Check direct Firestore user_auth mapping document if db is available
    if (db) {
      try {
        const authDocRef = doc(db, 'user_auth', cleanUid);
        const authDocSnap = await getDoc(authDocRef);

        if (authDocSnap.exists()) {
          const mappingData = authDocSnap.data() as UserAuthMappingDoc;
          if (mappingData.user_id) {
            // Find in current cached users
            const matched = allUsers.find(u => u.id === mappingData.user_id);
            if (matched) {
              return matched;
            }

            // Fallback: fetch directly from Firestore users collection
            const userDocRef = doc(db, 'users', mappingData.user_id);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              return userDocSnap.data() as User;
            }
          }
        }

        // Direct lookup on users/{cleanUid} in case user profile was saved under Firebase UID
        const directUserRef = doc(db, 'users', cleanUid);
        const directUserSnap = await getDoc(directUserRef);
        if (directUserSnap.exists()) {
          return directUserSnap.data() as User;
        }
      } catch (err) {
        console.warn('UserAuthMapping: Error fetching user_auth document from Firestore:', err);
      }
    }

    // 2. Check cached/synced users list by firebase_uid field
    const userByField = allUsers.find(u => u.firebase_uid === cleanUid);
    if (userByField) {
      return userByField;
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
   * 
   * Case A: UID not used, user not mapped -> Valid
   * Case B: UID used by SAME user -> Already mapped
   * Case C: UID used by ANOTHER user -> CONFLICT
   * Case D: User already has DIFFERENT UID -> CONFLICT
   * Email check: Firebase email vs Profile email -> EMAIL_MISMATCH warning
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

    // Check Email validation / consistency (Non-blocking warning / classification)
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
   * Updates:
   * 1. users/{userId}.firebase_uid = firebaseUid
   * 2. user_auth/{firebaseUid} = { user_id: userId, linked_at, ... }
   */
  async linkUserToFirebaseUid(
    userId: string,
    firebaseUid: string,
    authEmail?: string,
    linkedBy: string = 'SUPER_ADMIN'
  ): Promise<{ success: boolean; message: string; status?: MappingValidationStatus }> {
    const cleanUid = firebaseUid?.trim();
    const cleanUserId = userId?.trim();

    if (!cleanUid || !cleanUserId) {
      return { success: false, message: 'User ID dan Firebase UID tidak boleh kosong.' };
    }

    // 1. Run conflict validation
    const validation = await this.validateFirebaseUidMapping(cleanUid, cleanUserId, authEmail);
    if (!validation.valid) {
      return { success: false, message: validation.message, status: validation.status };
    }

    const allUsers = DatabaseService.getUsers();
    const userIndex = allUsers.findIndex(u => u.id === cleanUserId);
    if (userIndex === -1) {
      return { success: false, message: 'User tidak ditemukan dalam database.' };
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
        const batch = writeBatch(db);
        
        // Document 1: users/{userId}
        const userDocRef = doc(db, 'users', cleanUserId);
        batch.set(userDocRef, { firebase_uid: cleanUid }, { merge: true });

        // Document 2: user_auth/{firebaseUid}
        const authDocRef = doc(db, 'user_auth', cleanUid);
        batch.set(authDocRef, mappingDoc);

        await batch.commit();
      } catch (err: any) {
        console.warn('UserAuthMapping: Firestore batch commit failed:', err);
        return {
          success: false,
          message: `Gagal memperbarui Firestore mapping: ${err.message || err}`
        };
      }
    }

    // 3. Update local database cache
    DatabaseService.saveUser(updatedUser, true);

    return {
      success: true,
      message: `Berhasil menautkan akun "${targetUser.nama}" ke Firebase UID (${cleanUid.slice(0, 8)}...).`,
      status: validation.status
    };
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
