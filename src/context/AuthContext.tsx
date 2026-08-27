import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Cabang, Posko } from '../types';
import { DatabaseService, getInitialOrStored, saveToStorage, initializeFirebaseSync } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  isSuperAdminSession: boolean;
  login: (username: string, password?: string) => { success: boolean; message: string };
  logout: () => void;
  changePassword: (newPassword: string) => { success: boolean; message: string };
  resetUserPassword: (userId: string) => { success: boolean; message: string };
  allUsers: User[];
  allCabang: Cabang[];
  allPosko: Posko[];
  refreshData: () => void;
  // RBAC Permission check helpers
  canRegisterMediator: boolean;
  canInputFU: boolean;
  canValidateKdMed: boolean;
  canEditMediatorData: boolean;
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
        (u.username && storedUser.username && u.username.toLowerCase() === storedUser.username.toLowerCase())
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

  const defaultAdmin = (users: User[]): User => {
    return users.find(u => u.role === 'SUPER_ADMIN') || users[0];
  };

  useEffect(() => {
    loadData();
    initializeFirebaseSync();
    const unsubscribe = DatabaseService.subscribe(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const login = (username: string, password?: string): { success: boolean; message: string } => {
    const cleanUsername = username.toLowerCase().trim();
    const user = allUsers.find(u => u.username.toLowerCase() === cleanUsername);

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

    const isSA = user.role === 'SUPER_ADMIN';
    setCurrentUser(user);
    setIsSuperAdminSession(isSA);
    saveToStorage('med_control_auth_user_v2', user);
    saveToStorage('med_control_is_super_admin_session_v2', isSA);
    return { success: true, message: 'Login berhasil!' };
  };

  const logout = () => {
    setCurrentUser(null);
    setIsSuperAdminSession(false);
    localStorage.removeItem('med_control_auth_user_v2');
    localStorage.removeItem('med_control_is_super_admin_session_v2');
  };

  const changePassword = (newPassword: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Tidak ada sesi pengguna aktif.' };
    }

    const res = DatabaseService.changeUserPassword(currentUser.id, newPassword);
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

  const resetUserPassword = (userId: string): { success: boolean; message: string } => {
    const res = DatabaseService.resetUserPassword(userId);
    if (res.success) {
      loadData();
    }
    return res;
  };

  const role = currentUser?.role;

  // RBAC Permission Definitions based on specs
  // CMO, KAPOS, ADM: Can register new mediators (status PENDING) and input FU.
  // KAOPS: Can register mediators, validate/input kd_med manually (activates), edit data, input FU.
  // SUPER_ADMIN: Full control.
  const canRegisterMediator = role === 'CMO' || role === 'KAPOS' || role === 'ADM' || role === 'KAOPS' || role === 'SUPER_ADMIN';
  
  // CMO, KAPOS, ADM, KAOPS, SUPER_ADMIN can input FU
  const canInputFU = role === 'CMO' || role === 'KAPOS' || role === 'ADM' || role === 'KAOPS' || role === 'SUPER_ADMIN';
  
  // Validation / Input KD MED Menu: KAOPS and SUPER_ADMIN can assign KD MED (ADM can also review/edit data in the menu)
  const canValidateKdMed = role === 'KAOPS' || role === 'SUPER_ADMIN' || role === 'ADM';

  // ADM: Can also edit/correct data submitted by CMO, KAPOS, or ADM if discrepancies are found.
  // KAOPS & SUPER_ADMIN can edit data.
  const canEditMediatorData = role === 'ADM' || role === 'KAOPS' || role === 'SUPER_ADMIN';

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
        changePassword,
        resetUserPassword,
        allUsers,
        allCabang,
        allPosko,
        refreshData: loadData,
        canRegisterMediator,
        canInputFU,
        canValidateKdMed,
        canEditMediatorData,
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
