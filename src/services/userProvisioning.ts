import { User } from '../types';
import { DatabaseService } from './storage';
import { UserAuthMappingService } from './userAuthMapping';

export type FirebaseMigrationStatus = 
  | 'MIGRATED'         // Has firebase_uid linked
  | 'READY'            // Has valid email, ready to be provisioned
  | 'EMAIL_REQUIRED'   // Missing email in user profile
  | 'CONFLICT'         // Duplicate email across different Firestore users
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
  duplicateWithUserId?: string;
}

/**
 * Service to inspect, audit, and evaluate Firebase UID mapping & provisioning readiness.
 * (P0-2B - Client-Safe / Super Admin Diagnostics)
 */
export const UserProvisioningService = {
  /**
   * Evaluates the Firebase Auth migration status of a single user.
   */
  evaluateUserStatus(user: User, allUsers: User[]): UserProvisioningStatus {
    const hasUid = !!(user.firebase_uid && user.firebase_uid.trim().length > 0);
    const cleanEmail = user.email ? user.email.trim().toLowerCase() : '';
    const hasEmail = cleanEmail.length > 0;

    // 1. Check if already migrated with Firebase UID
    if (hasUid) {
      return {
        user,
        status: 'MIGRATED',
        statusMessage: 'Sudah terhubung ke Firebase Authentication.',
        hasFirebaseUid: true,
        hasEmail
      };
    }

    // 2. Check if email is missing
    if (!hasEmail) {
      return {
        user,
        status: 'EMAIL_REQUIRED',
        statusMessage: 'Email belum terisi. Diperlukan email untuk Firebase Authentication.',
        hasFirebaseUid: false,
        hasEmail: false
      };
    }

    // 3. Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return {
        user,
        status: 'ERROR',
        statusMessage: 'Format email tidak valid.',
        hasFirebaseUid: false,
        hasEmail: true
      };
    }

    // 4. Duplicate Check: Ensure no other Firestore user uses the exact same email
    const duplicateUser = allUsers.find(
      u => u.id !== user.id && u.email && u.email.trim().toLowerCase() === cleanEmail
    );

    if (duplicateUser) {
      return {
        user,
        status: 'CONFLICT',
        statusMessage: `Konflik email! Email sama digunakan oleh akun "${duplicateUser.nama}" (@${duplicateUser.username}).`,
        hasFirebaseUid: false,
        hasEmail: true,
        duplicateWithUserId: duplicateUser.id
      };
    }

    // 5. Ready for provisioning
    return {
      user,
      status: 'READY',
      statusMessage: 'Email valid & siap diprovisioning ke Firebase Authentication.',
      hasFirebaseUid: false,
      hasEmail: true
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
    const updatedUser: User = {
      ...targetUser,
      firebase_uid: cleanUid
    };

    // Ensure Firestore user_auth mapping document is created atomically
    UserAuthMappingService.linkUserToFirebaseUid(userId, cleanUid, targetUser.email).catch(err => {
      console.warn('UserProvisioningService link mapping background error:', err);
    });

    return await DatabaseService.saveUser(updatedUser, true);
  }
};
