import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Cabang, Posko, MediatorStatus } from '../types';
import { DatabaseService, getInitialOrStored, saveToStorage, startFirebaseSync, stopFirebaseSync } from '../services/storage';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  FirebaseAuthStatus, 
  signInWithFirebaseAuth, 
  signInOrProvisionFirebaseAuth,
  signOutFirebaseAuth, 
  subscribeToFirebaseAuth,
  getCurrentFirebaseUser,
  getFirebaseUID
} from '../services/firebaseAuth';
import { UserAuthMappingService } from '../services/userAuthMapping';

interface AuthContextType {
  currentUser: User | null;
  isSuperAdminSession: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  // Firebase Auth Foundation (P0-2A)
  firebaseUser: FirebaseUser | null;
  firebaseAuthStatus: FirebaseAuthStatus;
  isFirebaseAuthenticated: boolean;
  firebaseUid: string | null;
  loginFirebaseAuth: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutFirebaseAuth: () => Promise<{ success: boolean; message: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  resetUserPassword: (userId: string) => Promise<{ success: boolean; message: string }>;
  allUsers: User[];
  allCabang: Cabang[];
  allPosko: Posko[];
  refreshData: () => void;
  // RBAC Permission check helpers
  canRegisterMediator: boolean;
  canInputFU: boolean;
  canReviewMediator: boolean;
  canInputKdMed: boolean;
  canValidateKdMed: boolean;
  canEditMediatorData: boolean;
  canEditMediator: (mediatorStatus?: MediatorStatus) => boolean;
  canDeleteMediator: boolean;
  canManageUsers: boolean;
  isViewOnly: boolean;
  canViewAllBranches: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCabang, setAllCabang] = useState<Cabang[]>([]);
  const [allPosko, setAllPosko] = useState<Posko[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getInitialOrStored<User | null>('med_control_auth_user_v2', null);
  });
  const [isSuperAdminSession, setIsSuperAdminSession] = useState<boolean>(() => {
    const stored = getInitialOrStored<User | null>('med_control_auth_user_v2', null);
    return stored?.role === 'SUPER_ADMIN';
  });

  // Firebase Auth State (P0-2A Foundation)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(getCurrentFirebaseUser());
  const [firebaseAuthStatus, setFirebaseAuthStatus] = useState<FirebaseAuthStatus>('LOADING');

  const loadData = () => {
    const users = DatabaseService.getUsers();
    const cabang = DatabaseService.getCabangList();
    const posko = DatabaseService.getPoskoList();
    setAllUsers(users);
    setAllCabang(cabang);
    setAllPosko(posko);

    const storedUser = getInitialOrStored<User | null>('med_control_auth_user_v2', null);
    if (storedUser) {
      const live = users.find(
        u => u.id === storedUser.id || 
        (u.username && storedUser.username && u.username.toLowerCase() === storedUser.username.toLowerCase()) ||
        (storedUser.firebase_uid && u.firebase_uid === storedUser.firebase_uid)
      );
      if (live) {
        setCurrentUser(live);
        setIsSuperAdminSession(live.role === 'SUPER_ADMIN');
        saveToStorage('med_control_auth_user_v2', live);
      } else if (users.length === 0) {
        // Retain session while offline/loading
        setCurrentUser(storedUser);
        setIsSuperAdminSession(storedUser.role === 'SUPER_ADMIN');
      } else if (storedUser.role === 'SUPER_ADMIN' || storedUser.username === 'superadmin') {
        // Always preserve Super Admin session
        setCurrentUser(storedUser);
        setIsSuperAdminSession(true);
      } else {
        // User was removed by admin
        setCurrentUser(null);
        setIsSuperAdminSession(false);
        localStorage.removeItem('med_control_auth_user_v2');
        localStorage.removeItem('med_control_is_super_admin_session_v2');
      }
    } else {
      setCurrentUser(null);
      setIsSuperAdminSession(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to Firebase Auth state changes (P0-2A & P0-2C.2)
    const unsubscribeFirebaseAuth = subscribeToFirebaseAuth(async (fbUser, status) => {
      setFirebaseUser(fbUser);
      setFirebaseAuthStatus(status);

      // If user is authenticated via Firebase Auth, resolve profile through single-source-of-truth mapping
      if (fbUser) {
        // 1. Resolve through primary UID mapping service
        let matchedUser = await UserAuthMappingService.getUserProfileByFirebaseUid(fbUser.uid);

        // 2. Safe fallback lookup in local cached users by email or username if mapping doc is transitioning
        if (!matchedUser) {
          const users = DatabaseService.getUsers();
          matchedUser = users.find(
            u => (u.firebase_uid && u.firebase_uid === fbUser.uid) ||
                 (u.email && fbUser.email && u.email.toLowerCase() === fbUser.email.toLowerCase()) ||
                 (fbUser.email && u.username && u.username.toLowerCase() === fbUser.email.split('@')[0].toLowerCase())
          ) || null;
        }

        // Strict Enforcement:
        // - Only activate session if matched user is explicitly AKTIF
        // - If matchedUser is NONAKTIF, preserve inactive state and do not allow authenticated session
        // - If unmapped (null), NEVER escalate to SUPER_ADMIN
        if (matchedUser && matchedUser.status === 'AKTIF') {
          setCurrentUser(matchedUser);
          setIsSuperAdminSession(matchedUser.role === 'SUPER_ADMIN');
          saveToStorage('med_control_auth_user_v2', matchedUser);
          saveToStorage('med_control_is_super_admin_session_v2', matchedUser.role === 'SUPER_ADMIN');
        } else if (matchedUser && matchedUser.status === 'NONAKTIF') {
          setCurrentUser(null);
          setIsSuperAdminSession(false);
          localStorage.removeItem('med_control_auth_user_v2');
          localStorage.removeItem('med_control_is_super_admin_session_v2');
        }
      }
    });

    const unsubscribeDatabase = DatabaseService.subscribe(() => {
      loadData();
    });

    return () => {
      unsubscribeFirebaseAuth();
      unsubscribeDatabase();
      stopFirebaseSync();
    };
  }, []);

  // Synchronize Firestore listeners strictly scoped to active authenticated user session & role
  useEffect(() => {
    console.log(
      "[AUTH-VERIFY]",
      {
        firebaseAuthUid: auth?.currentUser?.uid ?? null,
        firebaseUserUid: firebaseUser?.uid ?? null,
        businessUserId: currentUser?.id ?? null,
        role: currentUser?.role ?? null,
        status: currentUser?.status ?? null
      }
    );
    console.log(`[AUTH-DEBUG] firebaseAuthUid=${firebaseUser?.uid || 'null'} authReady=${firebaseAuthStatus} currentUserId=${currentUser?.id || 'null'} currentUserRole=${currentUser?.role || 'null'} currentUserStatus=${currentUser?.status || 'null'}`);

    if (firebaseUser && firebaseUser.uid && currentUser && currentUser.status === 'AKTIF') {
      startFirebaseSync(currentUser, firebaseUser.uid);
    } else {
      stopFirebaseSync();
    }
  }, [firebaseUser?.uid, firebaseAuthStatus, currentUser?.id, currentUser?.role, currentUser?.status]);

  // Authenticated Login with Firebase Auth and Single Source of Truth Mapping
  const login = async (username: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const cleanUsername = username.toLowerCase().trim();
    const currentUsers = allUsers.length > 0 ? allUsers : DatabaseService.getUsers();
    const user = currentUsers.find(u => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      return { success: false, message: `Username "${username}" tidak ditemukan dalam sistem!` };
    }

    if (user.status !== 'AKTIF') {
      return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Administrator.' };
    }

    // Check password
    const enteredPassword = password || '';
    if (user.password && user.password !== enteredPassword) {
      return { 
        success: false, 
        message: 'Password yang Anda masukkan salah. Jika lupa password, hubungi Super Admin untuk mereset ke 1234.' 
      };
    }

    // 1. Authenticate with official Firebase Auth
    let fbUid: string | null = null;
    try {
      const fbResult = await signInOrProvisionFirebaseAuth(user, enteredPassword);
      if (fbResult.success && fbResult.user) {
        fbUid = fbResult.user.uid;
        setFirebaseUser(fbResult.user);
        setFirebaseAuthStatus('AUTHENTICATED');

        // 2. Establish / Verify user_auth/{uid} and users/{user_id} mapping
        await UserAuthMappingService.linkUserToFirebaseUid(
          user.id,
          fbResult.user.uid,
          fbResult.user.email || undefined,
          user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SYSTEM_AUTH'
        );
      }
    } catch (authErr) {
      console.warn('Firebase Auth linking during login notice:', authErr);
    }

    const activeUser: User = fbUid ? { ...user, firebase_uid: fbUid } : user;
    const isSA = activeUser.role === 'SUPER_ADMIN';

    setCurrentUser(activeUser);
    setIsSuperAdminSession(isSA);
    saveToStorage('med_control_auth_user_v2', activeUser);
    saveToStorage('med_control_is_super_admin_session_v2', isSA);

    // 3. Start Firestore sync for this user session immediately
    if (fbUid) {
      startFirebaseSync(activeUser, fbUid);
    }

    return { success: true, message: 'Login berhasil!' };
  };

  // Firebase Auth Login method for P0-2A / P0-2C.2 transition
  const loginFirebaseAuth = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const result = await signInWithFirebaseAuth(email, password);
    if (!result.success || !result.user) {
      return { success: false, message: result.message };
    }

    const fbUser = result.user;

    // 1. Resolve through primary UID mapping service
    let matchedUser = await UserAuthMappingService.getUserProfileByFirebaseUid(fbUser.uid);

    // 2. Safe fallback lookup in local cached users by email or username
    if (!matchedUser) {
      const users = DatabaseService.getUsers();
      matchedUser = users.find(
        u => (u.firebase_uid && u.firebase_uid === fbUser.uid) ||
             (u.email && fbUser.email && u.email.toLowerCase() === fbUser.email.toLowerCase()) ||
             (fbUser.email && u.username && u.username.toLowerCase() === fbUser.email.split('@')[0].toLowerCase())
      ) || null;

      // If resolved via email and has no firebase_uid yet, establish mapping
      if (matchedUser && !matchedUser.firebase_uid) {
        UserAuthMappingService.linkUserToFirebaseUid(matchedUser.id, fbUser.uid, fbUser.email || undefined).catch(err => {
          console.warn('Auto-linking user to Firebase UID on login error:', err);
        });
      }
    }

    if (!matchedUser) {
      return { 
        success: false, 
        message: `Autentikasi Firebase berhasil, namun akun belum terhubung dengan profil pengguna (UID: ${fbUser.uid}). Hubungi Super Admin.` 
      };
    }

    if (matchedUser.status !== 'AKTIF') {
      return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Administrator.' };
    }

    const isSA = matchedUser.role === 'SUPER_ADMIN';
    setCurrentUser(matchedUser);
    setIsSuperAdminSession(isSA);
    saveToStorage('med_control_auth_user_v2', matchedUser);
    saveToStorage('med_control_is_super_admin_session_v2', isSA);

    return { success: true, message: 'Login Firebase berhasil!' };
  };

  // Unified Logout: Cleans both legacy localStorage session and Firebase Auth session
  const logout = () => {
    stopFirebaseSync();
    setCurrentUser(null);
    setIsSuperAdminSession(false);
    localStorage.removeItem('med_control_auth_user_v2');
    localStorage.removeItem('med_control_is_super_admin_session_v2');
    signOutFirebaseAuth().catch((err) => {
      console.warn('Firebase signOut non-blocking error:', err);
    });
  };

  const logoutFirebaseAuth = async (): Promise<{ success: boolean; message: string }> => {
    logout();
    return signOutFirebaseAuth();
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Tidak ada sesi pengguna aktif.' };
    }

    const res = await DatabaseService.changeUserPassword(currentUser.id, newPassword);
    if (res.success) {
      loadData();
      const updatedUsers = DatabaseService.getUsers();
      const updatedCurrent = updatedUsers.find(u => u.id === currentUser.id);
      if (updatedCurrent) {
        setCurrentUser(updatedCurrent);
        saveToStorage('med_control_auth_user_v2', updatedCurrent);
      }
    }
    return res;
  };

  const resetUserPassword = async (userId: string): Promise<{ success: boolean; message: string }> => {
    const res = await DatabaseService.resetUserPassword(userId);
    if (res.success) {
      loadData();
    }
    return res;
  };

  const role = currentUser?.role;

  // RBAC Permission Definitions:
  // CMO, KAPOS, ADM, KAOPS, SUPER_ADMIN: Can register new mediators (status BELUM_AKTIF)
  const canRegisterMediator = role === 'CMO' || role === 'KAPOS' || role === 'ADM' || role === 'KAOPS' || role === 'SUPER_ADMIN';
  
  // CMO, KAPOS, ADM, KAOPS, SUPER_ADMIN can input FU
  const canInputFU = role === 'CMO' || role === 'KAPOS' || role === 'ADM' || role === 'KAOPS' || role === 'SUPER_ADMIN';
  
  // Stage 1: ADM & SUPER_ADMIN can review/verify documents and approve to PENDING
  const canReviewMediator = role === 'ADM' || role === 'SUPER_ADMIN';

  // Stage 2: KAPOS & SUPER_ADMIN (and KAOPS) can input official KD MED and activate (status AKTIF)
  const canInputKdMed = role === 'KAPOS' || role === 'SUPER_ADMIN' || role === 'KAOPS';

  // Combined Validation Menu Access: Accessible if user can review or input KD MED
  const canValidateKdMed = canReviewMediator || canInputKdMed;

  // Mediator Editing RBAC:
  // 1. KAPOS & CMO: can only edit mediators with status 'BELUM_AKTIF'
  // 2. ADM: can edit mediators with status 'BELUM_AKTIF' and 'PENDING'
  // 3. KAOPS & SUPER_ADMIN: can edit all mediators including 'AKTIF', 'INAKTIF', and 'DITOLAK'
  const canEditMediator = (mediatorStatus?: MediatorStatus): boolean => {
    if (!currentUser || !role) return false;
    if (role === 'SUPER_ADMIN' || role === 'KAOPS') return true;
    if (!mediatorStatus) return false;

    if (role === 'CMO' || role === 'KAPOS') {
      return mediatorStatus === 'BELUM_AKTIF';
    }
    if (role === 'ADM') {
      return mediatorStatus === 'BELUM_AKTIF' || mediatorStatus === 'PENDING';
    }
    return false;
  };

  // General boolean flag indicating if the role has any mediator edit capabilities
  const canEditMediatorData = role === 'CMO' || role === 'KAPOS' || role === 'ADM' || role === 'KAOPS' || role === 'SUPER_ADMIN';

  // SUPER_ADMIN: Drop/delete
  const canDeleteMediator = role === 'SUPER_ADMIN';

  // User Control: SUPER_ADMIN only
  const canManageUsers = role === 'SUPER_ADMIN';

  // KACAB is view-only based on assigned posko and cabang
  const isViewOnly = role === 'KACAB' || role === 'RM';

  // RM and SUPER_ADMIN see all branches
  const canViewAllBranches = role === 'RM' || role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSuperAdminSession,
        login,
        logout,
        firebaseUser,
        firebaseAuthStatus,
        isFirebaseAuthenticated: !!firebaseUser,
        firebaseUid: getFirebaseUID(),
        loginFirebaseAuth,
        logoutFirebaseAuth,
        changePassword,
        resetUserPassword,
        allUsers,
        allCabang,
        allPosko,
        refreshData: loadData,
        canRegisterMediator,
        canInputFU,
        canReviewMediator,
        canInputKdMed,
        canValidateKdMed,
        canEditMediatorData,
        canEditMediator,
        canDeleteMediator,
        canManageUsers,
        isViewOnly,
        canViewAllBranches
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

