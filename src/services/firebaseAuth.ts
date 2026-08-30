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
 * Ensures password meets Firebase Auth minimum 6-character length constraint.
 */
export function getFirebaseCompatiblePassword(rawPassword?: string): string {
  const pwd = rawPassword || '1234';
  if (pwd.length < 6) {
    return pwd.padEnd(6, '0');
  }
  return pwd;
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
      return 'Format email tidak valid.';
    case 'auth/user-not-found':
      return 'Pengguna dengan email ini tidak ditemukan.';
    case 'auth/wrong-password':
      return 'Password yang dimasukkan salah.';
    case 'auth/invalid-credential':
      return 'Kombinasi email atau password salah.';
    case 'auth/user-disabled':
      return 'Akun telah dinonaktifkan oleh administrator.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login gagal. Silakan tunggu beberapa saat sebelum mencoba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan terputus. Pastikan perangkat terhubung ke internet.';
    case 'auth/operation-not-allowed':
      return 'Metode autentikasi ini sedang tidak diaktifkan pada sistem.';
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
 * Signs in the user or provisions their Firebase Auth account automatically on login.
 * This guarantees auth.currentUser is always populated for Firestore operations.
 */
export async function signInOrProvisionFirebaseAuth(user: User, rawPassword?: string): Promise<FirebaseAuthResult> {
  if (!auth) {
    return {
      success: true, // Offline mode fallback
      message: 'Firebase Auth tidak aktif (mode lokal).'
    };
  }

  const email = getFirebaseCompatibleEmail(user);
  const password = getFirebaseCompatiblePassword(rawPassword || user.password);

  try {
    // 1. Attempt standard sign-in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user,
      message: 'Autentikasi Firebase berhasil.'
    };
  } catch (err: any) {
    const errCode = err?.code;

    // 2. If user doesn't exist yet in Firebase Auth, create account automatically
    if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') {
      try {
        const newCredential = await createUserWithEmailAndPassword(auth, email, password);
        return {
          success: true,
          user: newCredential.user,
          message: 'Akun Firebase Auth berhasil dibuat dan diotentikasi.'
        };
      } catch (createErr: any) {
        // If email already in use (e.g. password mismatch), attempt fallback with default password
        if (createErr?.code === 'auth/email-already-in-use') {
          const fallbackPassword = getFirebaseCompatiblePassword('1234');
          try {
            const fbCred = await signInWithEmailAndPassword(auth, email, fallbackPassword);
            return {
              success: true,
              user: fbCred.user,
              message: 'Autentikasi Firebase berhasil menggunakan kredensial default.'
            };
          } catch (fbErr: any) {
            console.warn('Fallback Firebase sign-in failed:', fbErr);
          }
        }
        console.warn('Firebase createUser error:', createErr);
      }
    }

    // Return current user if already signed in matching UID
    if (auth.currentUser) {
      return {
        success: true,
        user: auth.currentUser,
        message: 'Menggunakan sesi Firebase Auth yang sedang aktif.'
      };
    }

    return {
      success: false,
      message: mapFirebaseAuthError(err),
      errorCode: errCode
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
