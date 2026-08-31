import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Cabang, Posko, MediatorStatus } from '../types';
import { DatabaseService, saveToStorage, startFirebaseSync, stopFirebaseSync } from '../services/storage';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { 
  FirebaseAuthStatus, 
  signInWithFirebaseAuth, 
  signOutFirebaseAuth, 
  subscribeToFirebaseAuth,
  getCurrentFirebaseUser,
  getFirebaseUID,
  getFirebaseCompatibleEmail,
  getFirebaseAuthIdentifierFromUsername
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
  identityReady: boolean;
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
  
  // Cold start state: Authenticated state must be verified strictly by Firebase Auth gate
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSuperAdminSession, setIsSuperAdminSession] = useState<boolean>(false);

  // Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(getCurrentFirebaseUser());
  const [firebaseAuthStatus, setFirebaseAuthStatus] = useState<FirebaseAuthStatus>('LOADING');
  const [identityReady, setIdentityReady] = useState<boolean>(false);

  const loadData = () => {
    const users = DatabaseService.getUsers();
    const cabang = DatabaseService.getCabangList();
    const posko = DatabaseService.getPoskoList();
    setAllUsers(users);
    setAllCabang(cabang);
    setAllPosko(posko);

    // If an active authenticated Firebase user exists, synchronize profile data
    if (auth?.currentUser && currentUser) {
      const live = users.find(u => u.id === currentUser.id || u.firebase_uid === auth?.currentUser?.uid);
      if (live && live.status === 'AKTIF') {
        setCurrentUser(live);
        setIsSuperAdminSession(live.role === 'SUPER_ADMIN');
        saveToStorage('med_control_auth_user_v2', live);
        saveToStorage('med_control_is_super_admin_session_v2', live.role === 'SUPER_ADMIN');
      } else if (live && live.status !== 'AKTIF') {
        setCurrentUser(null);
        setIsSuperAdminSession(false);
        setIdentityReady(false);
        localStorage.removeItem('med_control_auth_user_v2');
        localStorage.removeItem('med_control_is_super_admin_session_v2');
        stopFirebaseSync();
      }
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to Firebase Auth state changes (Single Source of Truth)
    const unsubscribeFirebaseAuth = subscribeToFirebaseAuth(async (fbUser, status) => {
      setFirebaseUser(fbUser);
      setFirebaseAuthStatus(status);

      if (!fbUser || status !== 'AUTHENTICATED') {
        // Unauthenticated in Firebase: revoke application access unconditionally
        setCurrentUser(null);
        setIsSuperAdminSession(false);
        setIdentityReady(false);
        localStorage.removeItem('med_control_auth_user_v2');
        localStorage.removeItem('med_control_is_super_admin_session_v2');
        stopFirebaseSync();
        console.log('[AUTH-GATE]', { firebaseUid: null, businessUserId: null, role: null, status: null, authorized: false });
        return;
      }

      // If user is authenticated via Firebase Auth, resolve profile through single-source-of-truth mapping
      let matchedUser = await UserAuthMappingService.getUserProfileByFirebaseUid(fbUser.uid);

      // Fallback lookup in local cached users by email or username if mapping doc is transitioning
      if (!matchedUser) {
        const users = DatabaseService.getUsers();
        matchedUser = users.find(
          u => (u.firebase_uid && u.firebase_uid === fbUser.uid) ||
               (u.email && fbUser.email && u.email.toLowerCase() === fbUser.email.toLowerCase()) ||
               (fbUser.email && u.username && u.username.toLowerCase() === fbUser.email.split('@')[0].toLowerCase())
        ) || null;

        if (matchedUser && matchedUser.status === 'AKTIF') {
          const linkRes = await UserAuthMappingService.linkUserToFirebaseUid(
            matchedUser.id,
            fbUser.uid,
            fbUser.email || undefined,
            matchedUser.role
          );
          if (!linkRes.success) {
            console.warn('[AUTH-GATE-LINK-WARN]', linkRes.message);
          }
        }
      }

      if (matchedUser && matchedUser.status === 'AKTIF') {
        const activeUser: User = { ...matchedUser, firebase_uid: fbUser.uid };
        setCurrentUser(activeUser);
        setIsSuperAdminSession(activeUser.role === 'SUPER_ADMIN');
        setIdentityReady(true);
        saveToStorage('med_control_auth_user_v2', activeUser);
        saveToStorage('med_control_is_super_admin_session_v2', activeUser.role === 'SUPER_ADMIN');

        console.log('[AUTH-GATE]', { 
          firebaseUid: fbUser.uid, 
          businessUserId: activeUser.id, 
          role: activeUser.role, 
          status: activeUser.status, 
          authorized: true 
        });
      } else {
        setCurrentUser(null);
        setIsSuperAdminSession(false);
        setIdentityReady(false);
        localStorage.removeItem('med_control_auth_user_v2');
        localStorage.removeItem('med_control_is_super_admin_session_v2');
        stopFirebaseSync();
        console.log('[AUTH-GATE]', { 
          firebaseUid: fbUser.uid, 
          businessUserId: matchedUser?.id || null, 
          role: matchedUser?.role || null, 
          status: matchedUser?.status || null, 
          authorized: false 
        });
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

  // Authenticated Login: Solely driven by Firebase Authentication with deterministic username resolution
  const login = async (username: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const rawInput = (username || '').trim();
    const enteredPassword = password || '';

    if (!rawInput) {
      return { success: false, message: 'Username wajib diisi!' };
    }

    if (!enteredPassword) {
      return { success: false, message: 'Password wajib diisi!' };
    }

    // 1. Normalize username (extract clean username identifier, lowercase)
    const cleanUsername = (rawInput.includes('@') ? rawInput.split('@')[0] : rawInput).trim().toLowerCase();
    
    // 2. Derive deterministic Firebase Auth identifier (e.g. superadmin@kamm-manado.internal)
    const primaryIdentifier = getFirebaseAuthIdentifierFromUsername(cleanUsername);

    // 3. Attempt primary Firebase Auth sign-in
    let authRes = await signInWithFirebaseAuth(primaryIdentifier, enteredPassword);

    // 4. Safe Migration Compatibility: If primary identifier fails and user has legacy custom email in profile
    if (!authRes.success && (authRes.errorCode === 'auth/invalid-credential' || authRes.errorCode === 'auth/user-not-found')) {
      const currentUsers = allUsers.length > 0 ? allUsers : DatabaseService.getUsers();
      const matchedProfile = currentUsers.find(u => u.username.toLowerCase() === cleanUsername);
      if (matchedProfile && matchedProfile.email && matchedProfile.email.toLowerCase() !== primaryIdentifier.toLowerCase()) {
        const secondaryRes = await signInWithFirebaseAuth(matchedProfile.email, enteredPassword);
        if (secondaryRes.success) {
          authRes = secondaryRes;
        }
      }
    }

    // If Firebase Auth rejects credentials, fail immediately with zero local bypass
    if (!authRes.success || !authRes.user) {
      console.log('[LOGIN-RESULT]', { 
        firebaseAuth: 'FAILED', 
        mapping: 'N/A', 
        profile: 'N/A', 
        finalResult: 'REJECTED' 
      });
      return { 
        success: false, 
        message: authRes.message 
      };
    }

    const fbUser = authRes.user;
    setFirebaseUser(fbUser);
    setFirebaseAuthStatus('AUTHENTICATED');

    // 5. Resolve user profile via Single Source of Truth Mapping (user_auth/{uid} -> users/{user_id})
    let matchedUser = await UserAuthMappingService.getUserProfileByFirebaseUid(fbUser.uid);
    if (!matchedUser) {
      const currentUsers = allUsers.length > 0 ? allUsers : DatabaseService.getUsers();
      matchedUser = currentUsers.find(
        u => (u.firebase_uid && u.firebase_uid === fbUser.uid) ||
             (u.username && u.username.toLowerCase() === cleanUsername) ||
             (u.email && fbUser.email && u.email.toLowerCase() === fbUser.email.toLowerCase())
      ) || null;

      if (matchedUser) {
        // Await the mapping write to guarantee user_auth/{uid} is created before any subsequent writes occur
        const linkRes = await UserAuthMappingService.linkUserToFirebaseUid(
          matchedUser.id,
          fbUser.uid,
          fbUser.email || undefined,
          matchedUser.role
        );
        if (!linkRes.success) {
          console.warn('[LOGIN-MAPPING-WARN] linkUserToFirebaseUid failed:', linkRes.message);
        }
      }
    }

    if (!matchedUser) {
      console.log('[LOGIN-RESULT]', { 
        firebaseAuth: 'SUCCESS', 
        mapping: 'UNMAPPED', 
        profile: 'NOT_FOUND', 
        finalResult: 'REJECTED' 
      });
      await signOutFirebaseAuth();
      return { 
        success: false, 
        message: 'Akun Firebase belum terhubung dengan profil pengguna sistem. Hubungi Administrator.' 
      };
    }

    if (matchedUser.status !== 'AKTIF') {
      console.log('[LOGIN-RESULT]', { 
        firebaseAuth: 'SUCCESS', 
        mapping: 'MAPPED', 
        profile: matchedUser.id, 
        status: matchedUser.status, 
        finalResult: 'REJECTED' 
      });
      await signOutFirebaseAuth();
      return { 
        success: false, 
        message: 'Akun Anda sedang dinonaktifkan oleh Administrator.' 
      };
    }

    const activeUser: User = { ...matchedUser, firebase_uid: fbUser.uid };
    const isSA = activeUser.role === 'SUPER_ADMIN';

    setCurrentUser(activeUser);
    setIsSuperAdminSession(isSA);
    setIdentityReady(true);
    saveToStorage('med_control_auth_user_v2', activeUser);
    saveToStorage('med_control_is_super_admin_session_v2', isSA);

    console.log('[LOGIN-RESULT]', { 
      firebaseAuth: 'SUCCESS', 
      mapping: 'MAPPED', 
      profile: activeUser.id, 
      role: activeUser.role, 
      status: activeUser.status, 
      finalResult: 'AUTHORIZED' 
    });

    // Start Firestore sync for this user session immediately
    startFirebaseSync(activeUser, fbUser.uid);

    return { success: true, message: 'Login berhasil!' };
  };

  // Firebase Auth Login method for P0-2A / P0-2C.2 transition
  const loginFirebaseAuth = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    return login(email, password);
  };

  // Unified Logout: Cleans both local cache and Firebase Auth session
  const logout = () => {
    stopFirebaseSync();
    setCurrentUser(null);
    setIsSuperAdminSession(false);
    setIdentityReady(false);
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
        identityReady,
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

