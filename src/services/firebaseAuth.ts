import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase';
import { User } from '../types';

export type FirebaseAuthStatus = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface FirebaseAuthResult {
  success: boolean;
  user?: FirebaseUser;
  message: string;
  errorCode?: string;
}

/**
 * Derives a valid unique internal email address for Firebase Auth if user email is missing.
 */
export function getFirebaseCompatibleEmail(user: User): string {
  if (user.email && user.email.includes('@')) {
    return user.email.trim().toLowerCase();
  }
  const cleanUsername = user.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanUsername || 'user'}@kamm-manado.internal`;
}

/**
 * Maps Firebase Auth error codes to user-friendly Indonesian error messages.
 */
export function mapFirebaseAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Terjadi kesalahan autentikasi. Silakan coba lagi.';
  }

  const authError = error as AuthError;
  const code = authError.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Format email atau username tidak valid.';
    case 'auth/user-not-found':
      return 'Pengguna tidak ditemukan dalam sistem autentikasi Firebase.';
    case 'auth/wrong-password':
      return 'Password yang Anda masukkan salah.';
    case 'auth/invalid-credential':
      return 'Email/username atau password salah.';
    case 'auth/user-disabled':
      return 'Akun Firebase dinonaktifkan.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login gagal. Silakan tunggu beberapa saat sebelum mencoba lagi.';
    case 'auth/network-request-failed':
      return 'Tidak dapat menghubungi Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'Metode autentikasi Email/Password belum diaktifkan pada Firebase Authentication.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
    default:
      return 'Gagal melakukan autentikasi Firebase. Silakan periksa kredensial Anda.';
  }
}

/**
 * Check if Firebase Auth is initialized and ready.
 */
export function isFirebaseAuthAvailable(): boolean {
  return auth !== null;
}

/**
 * Get the currently logged-in Firebase User instance (if any).
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth?.currentUser || null;
}

/**
 * Get the Firebase UID of the active Firebase session (if any).
 */
export function getFirebaseUID(): string | null {
  return auth?.currentUser?.uid || null;
}

/**
 * Sign in using official Firebase Authentication with Email & Password.
 * Direct authentication gate: NO fallback passwords, NO auto-retry with secondary credentials.
 */
export async function signInWithFirebaseAuth(email: string, password: string): Promise<FirebaseAuthResult> {
  if (!auth) {
    return {
      success: false,
      message: 'Firebase Auth belum terinisialisasi pada lingkungan ini.'
    };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return {
      success: true,
      user: userCredential.user,
      message: 'Autentikasi Firebase berhasil.'
    };
  } catch (error: any) {
    const message = mapFirebaseAuthError(error);
    return {
      success: false,
      message,
      errorCode: error?.code
    };
  }
}

/**
 * Creates a new Firebase Auth account explicitly (Administrative / Provisioning action only).
 * Normal user login MUST NOT call this method.
 */
export async function createFirebaseAuthAccount(email: string, password: string): Promise<FirebaseAuthResult> {
  if (!auth) {
    return {
      success: false,
      message: 'Firebase Auth belum terinisialisasi.'
    };
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return {
      success: true,
      user: credential.user,
      message: 'Akun Firebase Auth berhasil dibuat.'
    };
  } catch (error: any) {
    return {
      success: false,
      message: mapFirebaseAuthError(error),
      errorCode: error?.code
    };
  }
}

/**
 * Sign out of official Firebase Authentication.
 */
export async function signOutFirebaseAuth(): Promise<{ success: boolean; message: string }> {
  if (!auth) {
    return { success: true, message: 'Auth not initialized' };
  }

  try {
    await firebaseSignOut(auth);
    return {
      success: true,
      message: 'Logout Firebase berhasil.'
    };
  } catch (error) {
    console.warn('Firebase signOut error:', error);
    return {
      success: false,
      message: 'Gagal melakukan logout Firebase.'
    };
  }
}

/**
 * Observe Firebase Authentication state changes in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToFirebaseAuth(
  callback: (user: FirebaseUser | null, status: FirebaseAuthStatus) => void
): () => void {
  if (!auth) {
    callback(null, 'UNAUTHENTICATED');
    return () => {};
  }

  return onAuthStateChanged(
    auth,
    (user) => {
      if (user) {
        callback(user, 'AUTHENTICATED');
      } else {
        callback(null, 'UNAUTHENTICATED');
      }
    },
    (error) => {
      console.warn('Firebase Auth state listener error:', error);
      callback(null, 'UNAUTHENTICATED');
    }
  );
}
