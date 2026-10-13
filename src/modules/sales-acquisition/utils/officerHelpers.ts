import { SalesAcquisition } from '../types';
import { User } from '../../../types';

export interface OfficerDisplayResult {
  kodeAo: string;
  nama: string;
  fullDisplay: string;
  role?: string;
}

/**
 * Resolves creator display in format: "[KD AO] - [Nama AO]"
 * Backwards compatible with legacy records via allUsers lookup.
 */
export function getCreatorDisplay(
  record: SalesAcquisition,
  allUsers?: User[]
): OfficerDisplayResult {
  let kodeAo = record.created_by_kd_ao || '';
  let nama = record.created_by_nama || '';
  let role = record.created_by_role;

  if ((!nama || !kodeAo) && allUsers && allUsers.length > 0 && record.created_by_user_id) {
    const user = allUsers.find(u => u.id === record.created_by_user_id);
    if (user) {
      if (!nama) nama = user.nama;
      if (!kodeAo && user.kd_ao) kodeAo = user.kd_ao;
      if (!role) role = user.role;
    }
  }

  const safeKodeAo = kodeAo ? kodeAo.trim() : '';
  const safeNama = nama ? nama.trim() : (record.created_by_user_id || 'Penginput Awal');
  
  let fullDisplay = safeNama;
  if (safeKodeAo && safeNama) {
    fullDisplay = `${safeKodeAo} - ${safeNama}`;
  } else if (safeKodeAo) {
    fullDisplay = safeKodeAo;
  }

  return {
    kodeAo: safeKodeAo || '-',
    nama: safeNama,
    fullDisplay,
    role
  };
}

/**
 * Resolves assigned officer display:
 * kodeAo: "[KD AO]"
 * nama: "[Nama AO]"
 * fullDisplay: "[KD AO] - [Nama AO]"
 * Backwards compatible with legacy records via allUsers lookup.
 */
export function getAssignedOfficerDisplay(
  record: SalesAcquisition,
  allUsers?: User[]
): OfficerDisplayResult {
  let kodeAo = record.kd_ao || '';
  let nama = record.assigned_user_nama || '';

  if (!nama && allUsers && allUsers.length > 0) {
    const user = allUsers.find(
      u => u.id === record.assigned_user_id || (kodeAo && u.kd_ao === kodeAo)
    );
    if (user) {
      nama = user.nama;
      if (!kodeAo && user.kd_ao) kodeAo = user.kd_ao;
    }
  }

  const safeKodeAo = kodeAo ? kodeAo.trim() : '';
  const safeNama = nama ? nama.trim() : (record.assigned_user_id || '-');

  let fullDisplay = safeNama;
  if (safeKodeAo && safeNama && safeNama !== '-') {
    fullDisplay = `${safeKodeAo} - ${safeNama}`;
  } else if (safeKodeAo) {
    fullDisplay = safeKodeAo;
  }

  return {
    kodeAo: safeKodeAo || '-',
    nama: safeNama,
    fullDisplay
  };
}
