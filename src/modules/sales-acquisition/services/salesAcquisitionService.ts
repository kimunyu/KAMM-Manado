import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { 
  SalesAcquisition, 
  SalesAcquisitionStatus, 
  SalesAcquisitionSourceLead,
  QuickEntryInput, 
  NormalUpdateInput, 
  ReassignInput, 
  ConvertCairInput, 
  TolakBatalInput,
  DuplicateCheckResult,
  AcquisitionMetrics
} from '../types';
import { User } from '../../../types';
import { AuditService } from '../../../services/auditService';
import { sanitizeDocId } from '../../../services/storage';

const COLLECTION_NAME = 'sales_acquisitions';
const LOCAL_STORAGE_KEY = 'kamm_sales_acquisitions_v1';

/**
 * Utility to sanitize phone number to canonical numeric format
 */
export function cleanPhoneNumber(raw: string): string {
  if (!raw) return '';
  // Remove non-digit characters except leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  // Strip any remaining +
  cleaned = cleaned.replace(/\+/g, '');
  return cleaned;
}

class SalesAcquisitionServiceManager {
  private cache: SalesAcquisition[] = [];
  private listeners: Set<(data: SalesAcquisition[]) => void> = new Set();
  private unsubSnapshot: (() => void) | null = null;
  private currentSubscribedUser: User | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        this.cache = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Gagal membaca cache lokal sales_acquisitions:', e);
      this.cache = [];
    }
  }

  private saveToLocalStorage(records: SalesAcquisition[]): void {
    this.cache = records;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Gagal menyimpan cache lokal sales_acquisitions:', e);
    }
  }

  private notify(): void {
    const records = this.getRecords(this.currentSubscribedUser);
    this.listeners.forEach((callback) => callback(records));
  }

  /**
   * Mengambil records sesuai batasan RBAC
   */
  public getRecords(user?: User | null): SalesAcquisition[] {
    if (!user) {
      return [...this.cache];
    }

    // Role Nasional: SUPER_ADMIN, RM, ADM_DE
    if (user.role === 'SUPER_ADMIN' || user.role === 'RM' || user.role === 'ADM_DE') {
      return [...this.cache];
    }

    // Role CMO: Hanya prospek yang di-assign kepadanya atau kode AO miliknya, atau yang dibuatnya
    if (user.role === 'CMO') {
      return this.cache.filter((r) => {
        return (
          r.assigned_user_id === user.id ||
          (user.kd_ao && r.kd_ao === user.kd_ao) ||
          r.created_by_user_id === user.id
        );
      });
    }

    // Role KAPOS: Terisolasi pada posko penempatannya
    if (user.role === 'KAPOS') {
      return this.cache.filter((r) => {
        return !user.kd_posko || r.kd_posko === user.kd_posko || r.created_by_user_id === user.id;
      });
    }

    // Role ADM: Terisolasi pada cabang & posko penempatannya
    if (user.role === 'ADM') {
      return this.cache.filter((r) => {
        const matchCabang = !user.kd_cabang || r.kd_cabang === user.kd_cabang;
        const matchPosko = !user.kd_posko || r.kd_posko === user.kd_posko;
        return (matchCabang && matchPosko) || r.created_by_user_id === user.id;
      });
    }

    // Role KAOPS / KACAB / ADM_BPKB: Terisolasi pada cabang penempatannya
    if (user.role === 'KAOPS' || user.role === 'KACAB' || user.role === 'ADM_BPKB' || user.role === 'ADMIN_BPKB') {
      return this.cache.filter((r) => {
        return !user.kd_cabang || r.kd_cabang === user.kd_cabang || r.created_by_user_id === user.id;
      });
    }

    return [...this.cache];
  }

  /**
   * Subscribe ke real-time Firestore updates
   */
  public subscribe(
    user: User | null,
    onData: (records: SalesAcquisition[]) => void,
    onError?: (err: any) => void
  ): () => void {
    this.currentSubscribedUser = user;
    this.listeners.add(onData);
    onData(this.getRecords(user));

    if (!db || !user) {
      return () => {
        this.listeners.delete(onData);
      };
    }

    if (this.unsubSnapshot) {
      this.unsubSnapshot();
      this.unsubSnapshot = null;
    }

    try {
      const colRef = collection(db, COLLECTION_NAME);
      let q = query(colRef);

      // Apply server-side query segregation per-role
      if (user.role === 'CMO') {
        q = query(colRef, where('assigned_user_id', '==', user.id));
      } else if (user.role === 'KAPOS' && user.kd_posko) {
        q = query(colRef, where('kd_posko', '==', user.kd_posko));
      } else if ((user.role === 'ADM' || user.role === 'KAOPS' || user.role === 'KACAB' || user.role === 'ADM_BPKB' || user.role === 'ADMIN_BPKB') && user.kd_cabang) {
        q = query(colRef, where('kd_cabang', '==', user.kd_cabang));
      }

      this.unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const loaded: SalesAcquisition[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            loaded.push({
              ...data,
              id: docSnap.id,
              created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at || new Date().toISOString(),
              updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at || new Date().toISOString(),
              status_updated_at: data.status_updated_at?.toDate ? data.status_updated_at.toDate().toISOString() : data.status_updated_at || new Date().toISOString(),
              tgl_cair: data.tgl_cair?.toDate ? data.tgl_cair.toDate().toISOString() : data.tgl_cair || null,
            });
          });

          // Merge loaded with local cache (preserve other branches if user role is national)
          this.saveToLocalStorage(loaded);
          this.notify();
        },
        (error) => {
          console.warn('[SalesAcquisition] Sync Firestore note:', error.message);
          if (onError) onError(error);
          onData(this.getRecords(user));
        }
      );
    } catch (err) {
      console.warn('[SalesAcquisition] Error setting up snapshot:', err);
      if (onError) onError(err);
    }

    return () => {
      this.listeners.delete(onData);
      if (this.listeners.size === 0 && this.unsubSnapshot) {
        this.unsubSnapshot();
        this.unsubSnapshot = null;
      }
    };
  }

  /**
   * Check for duplicate phone number in active pipeline
   */
  public checkDuplicate(rawPhone: string, excludeId?: string): DuplicateCheckResult {
    const cleanPhone = cleanPhoneNumber(rawPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
      return { hasDuplicate: false, duplicateInfo: null };
    }

    const activeStatuses: SalesAcquisitionStatus[] = [
      'PROSPEK_BARU',
      'PROSES_SURVEI',
      'PENGAJUAN_BERKAS',
      'DISETUJUI'
    ];

    const match = this.cache.find((r) => {
      if (excludeId && r.id === excludeId) return false;
      if (!activeStatuses.includes(r.status)) return false;
      const existingClean = r.no_telepon_clean || cleanPhoneNumber(r.no_telepon);
      return existingClean === cleanPhone;
    });

    if (match) {
      return {
        hasDuplicate: true,
        duplicateInfo: {
          nama_calon_konsumen: match.nama_calon_konsumen,
          kd_ao: match.kd_ao,
          kd_cabang: match.kd_cabang,
          kd_posko: match.kd_posko,
          status: match.status
        }
      };
    }

    return { hasDuplicate: false, duplicateInfo: null };
  }

  /**
   * Quick Entry: Create new Prospect with the 27 canonical fields
   */
  public async createQuickEntryLead(
    input: QuickEntryInput,
    currentUser: User
  ): Promise<{ success: boolean; message: string; record?: SalesAcquisition }> {
    // 1. Validations
    if (!input.nama_calon_konsumen || input.nama_calon_konsumen.trim().length < 3) {
      return { success: false, message: 'Nama calon konsumen minimal 3 karakter!' };
    }
    if (!input.no_telepon || input.no_telepon.trim().length < 9) {
      return { success: false, message: 'Nomor telepon minimal 9 digit!' };
    }
    if (!input.sumber_lead) {
      return { success: false, message: 'Sumber lead wajib dipilih!' };
    }

    // Jenis Jaminan Mandatory Validation: R2, R4, SERTIFIKAT
    if (!input.jenis_jaminan || !['R2', 'R4', 'SERTIFIKAT'].includes(input.jenis_jaminan)) {
      return { success: false, message: 'Jenis jaminan (R2 Motor, R4 Mobil, atau Sertifikat) wajib dipilih!' };
    }

    // Wilayah Domisili (4-Level) & Alamat Detail Mandatory Validation
    if (
      !input.wilayah_provinsi_id?.trim() ||
      !input.wilayah_kabupaten_id?.trim() ||
      !input.wilayah_kecamatan_id?.trim() ||
      !input.wilayah_desa_id?.trim()
    ) {
      return { 
        success: false, 
        message: 'Wilayah domisili (Provinsi, Kabupaten/Kota, Kecamatan, dan Kelurahan/Desa) wajib dipilih lengkap!' 
      };
    }
    if (!input.alamat_detail || input.alamat_detail.trim().length < 5) {
      return { success: false, message: 'Alamat domisili detail / patokan wajib diisi minimal 5 karakter!' };
    }

    const cleanPhone = cleanPhoneNumber(input.no_telepon);
    if (cleanPhone.length < 9 || cleanPhone.length > 20) {
      return { success: false, message: 'Format nomor telepon tidak valid (9-20 digit angka)!' };
    }

    // Check duplicate
    const dupCheck = this.checkDuplicate(cleanPhone);
    if (dupCheck.hasDuplicate && dupCheck.duplicateInfo) {
      return {
        success: false,
        message: `Nomor telepon ${cleanPhone} sudah terdaftar aktif atas nama "${dupCheck.duplicateInfo.nama_calon_konsumen}" (Status: ${dupCheck.duplicateInfo.status}, AO: ${dupCheck.duplicateInfo.kd_ao || '-'})!`
      };
    }

    // Mediator requirement check
    if (input.sumber_lead === 'MEDIATOR' && !input.kd_med?.trim()) {
      return { success: false, message: 'Sumber lead Mediator wajib menyertakan Kode Mediator (KD MED)!' };
    }

    // Ex-Customer requirement check
    if (input.sumber_lead === 'EX_CUSTOMER' && !input.ref_no_psb_lama?.trim()) {
      return { success: false, message: 'Sumber lead Ex-Customer wajib menyertakan No. PSB Lama!' };
    }

    // Context determination
    const assignedUserId = input.assigned_user_id || currentUser.id;
    const kdAo = input.kd_ao || currentUser.kd_ao || '';
    const kdCabang = input.kd_cabang || currentUser.kd_cabang || 'C16';
    const kdPosko = input.kd_posko || currentUser.kd_posko || 'QJ0';

    const nowIso = new Date().toISOString();
    const docId = `ACQ_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Canonical 28 Fields Construction (with jenis_jaminan)
    const newRecord: SalesAcquisition = {
      // 1-5 Audit
      id: docId,
      created_at: nowIso,
      created_by_user_id: currentUser.id,
      updated_at: nowIso,
      updated_by_user_id: currentUser.id,

      // 6-9 Assignment
      assigned_user_id: assignedUserId,
      kd_ao: kdAo,
      kd_cabang: kdCabang,
      kd_posko: kdPosko,

      // 10-12 Customer
      nama_calon_konsumen: input.nama_calon_konsumen.trim(),
      no_telepon: input.no_telepon.trim(),
      no_telepon_clean: cleanPhone,

      // 13-17 State & Pipeline
      sumber_lead: input.sumber_lead,
      status: 'PROSPEK_BARU',
      status_updated_at: nowIso,
      status_updated_by_user_id: currentUser.id,
      alasan_tolak_batal: '',

      // 18-19 References
      kd_med: input.sumber_lead === 'MEDIATOR' ? (input.kd_med || '').trim() : '',
      ref_no_psb_lama: input.sumber_lead === 'EX_CUSTOMER' ? (input.ref_no_psb_lama || '').trim().toUpperCase() : '',

      // 20-24 Master Wilayah & Address (Mandatory)
      wilayah_provinsi_id: input.wilayah_provinsi_id.trim(),
      wilayah_kabupaten_id: input.wilayah_kabupaten_id.trim(),
      wilayah_kecamatan_id: input.wilayah_kecamatan_id.trim(),
      wilayah_desa_id: input.wilayah_desa_id.trim(),
      alamat_detail: input.alamat_detail.trim(),

      // 25-27 Conversion / CAIR
      no_psb: '',
      tgl_cair: null,
      sales_control_id: '',

      // 28. Jenis Jaminan
      jenis_jaminan: input.jenis_jaminan
    };

    // Save to Firestore
    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, docId);
        await setDoc(docRef, {
          ...newRecord,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          status_updated_at: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn('[SalesAcquisition] Firestore save note:', err?.message || err);
        return {
          success: false,
          message: `Gagal menyimpan prospek di Firestore: ${err?.message || 'Akses ditolak'}`
        };
      }
    }

    // Update Local Cache
    this.cache.unshift(newRecord);
    this.saveToLocalStorage(this.cache);
    this.notify();

    // Log Audit Trail
    await AuditService.record(
      {
        id: currentUser.id,
        nama: currentUser.nama,
        role: currentUser.role,
        kd_ao: currentUser.kd_ao
      },
      'SALES_ACQUISITION',
      'CREATE_PROSPEK',
      `Input prospek baru: "${newRecord.nama_calon_konsumen}" (${newRecord.no_telepon_clean}, Sumber: ${newRecord.sumber_lead})`,
      docId,
      {
        assigned_user_id: newRecord.assigned_user_id,
        kd_ao: newRecord.kd_ao,
        kd_cabang: newRecord.kd_cabang,
        kd_posko: newRecord.kd_posko
      }
    );

    return {
      success: true,
      message: `Prospek "${newRecord.nama_calon_konsumen}" berhasil disimpan!`,
      record: newRecord
    };
  }

  /**
   * Normal Update: Enrich prospect data without changing status or assignment
   */
  public async updateLeadDetails(
    leadId: string,
    input: NormalUpdateInput,
    currentUser: User
  ): Promise<{ success: boolean; message: string; record?: SalesAcquisition }> {
    const index = this.cache.findIndex((r) => r.id === leadId);
    if (index === -1) {
      return { success: false, message: 'Data prospek tidak ditemukan!' };
    }

    const existing = this.cache[index];

    // Terminal Freeze Rule
    if (['CAIR', 'DITOLAK', 'BATAL'].includes(existing.status) && currentUser.role !== 'SUPER_ADMIN') {
      return { 
        success: false, 
        message: `Prospek berada pada status terminal "${existing.status}" dan tidak dapat diubah lagi!` 
      };
    }

    if (!input.nama_calon_konsumen || input.nama_calon_konsumen.trim().length < 3) {
      return { success: false, message: 'Nama calon konsumen minimal 3 karakter!' };
    }

    const cleanPhone = cleanPhoneNumber(input.no_telepon);
    if (cleanPhone.length < 9) {
      return { success: false, message: 'Nomor telepon tidak valid!' };
    }

    // Check duplicate
    const dupCheck = this.checkDuplicate(cleanPhone, leadId);
    if (dupCheck.hasDuplicate && dupCheck.duplicateInfo) {
      return {
        success: false,
        message: `Nomor telepon sudah digunakan oleh prospek aktif "${dupCheck.duplicateInfo.nama_calon_konsumen}"!`
      };
    }

    const nowIso = new Date().toISOString();
    const updatedRecord: SalesAcquisition = {
      ...existing,
      nama_calon_konsumen: input.nama_calon_konsumen.trim(),
      no_telepon: input.no_telepon.trim(),
      no_telepon_clean: cleanPhone,
      sumber_lead: input.sumber_lead,
      kd_med: input.sumber_lead === 'MEDIATOR' ? (input.kd_med || '').trim() : '',
      ref_no_psb_lama: input.sumber_lead === 'EX_CUSTOMER' ? (input.ref_no_psb_lama || '').trim().toUpperCase() : '',
      wilayah_provinsi_id: input.wilayah_provinsi_id || existing.wilayah_provinsi_id || '',
      wilayah_kabupaten_id: input.wilayah_kabupaten_id || existing.wilayah_kabupaten_id || '',
      wilayah_kecamatan_id: input.wilayah_kecamatan_id || existing.wilayah_kecamatan_id || '',
      wilayah_desa_id: input.wilayah_desa_id || existing.wilayah_desa_id || '',
      alamat_detail: (input.alamat_detail !== undefined ? input.alamat_detail : existing.alamat_detail || '').trim(),
      jenis_jaminan: input.jenis_jaminan || existing.jenis_jaminan,
      updated_at: nowIso,
      updated_by_user_id: currentUser.id
    };

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, leadId);
        const updatePayload: Record<string, any> = {
          nama_calon_konsumen: updatedRecord.nama_calon_konsumen,
          no_telepon: updatedRecord.no_telepon,
          no_telepon_clean: updatedRecord.no_telepon_clean,
          sumber_lead: updatedRecord.sumber_lead,
          kd_med: updatedRecord.kd_med,
          ref_no_psb_lama: updatedRecord.ref_no_psb_lama,
          wilayah_provinsi_id: updatedRecord.wilayah_provinsi_id,
          wilayah_kabupaten_id: updatedRecord.wilayah_kabupaten_id,
          wilayah_kecamatan_id: updatedRecord.wilayah_kecamatan_id,
          wilayah_desa_id: updatedRecord.wilayah_desa_id,
          alamat_detail: updatedRecord.alamat_detail,
          updated_at: serverTimestamp(),
          updated_by_user_id: currentUser.id
        };
        if (updatedRecord.jenis_jaminan) {
          updatePayload.jenis_jaminan = updatedRecord.jenis_jaminan;
        }
        await updateDoc(docRef, updatePayload);
      } catch (err: any) {
        return {
          success: false,
          message: `Gagal update data di Firestore: ${err?.message || 'Akses ditolak'}`
        };
      }
    }

    this.cache[index] = updatedRecord;
    this.saveToLocalStorage(this.cache);
    this.notify();

    await AuditService.record(
      {
        id: currentUser.id,
        nama: currentUser.nama,
        role: currentUser.role,
        kd_ao: currentUser.kd_ao
      },
      'SALES_ACQUISITION',
      'UPDATE_PROSPEK',
      `Update rincian prospek: "${updatedRecord.nama_calon_konsumen}" (${leadId})`,
      leadId
    );

    return {
      success: true,
      message: 'Data prospek berhasil diperbarui!',
      record: updatedRecord
    };
  }

  /**
   * Advance / Update Status according to strict State Machine
   */
  public async updateLeadStatus(
    leadId: string,
    newStatus: SalesAcquisitionStatus,
    alasanTolakBatal: string,
    currentUser: User
  ): Promise<{ success: boolean; message: string; record?: SalesAcquisition }> {
    const index = this.cache.findIndex((r) => r.id === leadId);
    if (index === -1) {
      return { success: false, message: 'Data prospek tidak ditemukan!' };
    }

    const current = this.cache[index];

    // Terminal Freeze Rule
    if (['CAIR', 'DITOLAK', 'BATAL'].includes(current.status) && currentUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: `Prospek berstatus "${current.status}" adalah terminal dan tidak dapat diubah statusnya!`
      };
    }

    // State Machine Transitions Validation
    const validTransitions: Record<SalesAcquisitionStatus, SalesAcquisitionStatus[]> = {
      'PROSPEK_BARU': ['PROSES_SURVEI', 'DITOLAK', 'BATAL'],
      'PROSES_SURVEI': ['PENGAJUAN_BERKAS', 'DITOLAK', 'BATAL'],
      'PENGAJUAN_BERKAS': ['DISETUJUI', 'DITOLAK', 'BATAL'],
      'DISETUJUI': ['CAIR', 'DITOLAK', 'BATAL'],
      'CAIR': [],
      'DITOLAK': [],
      'BATAL': []
    };

    if (currentUser.role !== 'SUPER_ADMIN') {
      const allowedNext = validTransitions[current.status] || [];
      if (!allowedNext.includes(newStatus)) {
        return {
          success: false,
          message: `Transisi tidak valid dari "${current.status}" ke "${newStatus}"!`
        };
      }
    }

    // Tolak / Batal Reason Requirement
    if ((newStatus === 'DITOLAK' || newStatus === 'BATAL') && !alasanTolakBatal?.trim()) {
      return {
        success: false,
        message: `Status "${newStatus}" wajib menyertakan alasan penolakan/pembatalan!`
      };
    }

    const nowIso = new Date().toISOString();
    const updatedRecord: SalesAcquisition = {
      ...current,
      status: newStatus,
      alasan_tolak_batal: (newStatus === 'DITOLAK' || newStatus === 'BATAL') ? alasanTolakBatal.trim() : '',
      status_updated_at: nowIso,
      status_updated_by_user_id: currentUser.id,
      updated_at: nowIso,
      updated_by_user_id: currentUser.id
    };

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, leadId);
        await updateDoc(docRef, {
          status: newStatus,
          alasan_tolak_batal: updatedRecord.alasan_tolak_batal,
          status_updated_at: serverTimestamp(),
          status_updated_by_user_id: currentUser.id,
          updated_at: serverTimestamp(),
          updated_by_user_id: currentUser.id
        });
      } catch (err: any) {
        return {
          success: false,
          message: `Gagal memperbarui status di Firestore: ${err?.message || 'Akses ditolak'}`
        };
      }
    }

    this.cache[index] = updatedRecord;
    this.saveToLocalStorage(this.cache);
    this.notify();

    await AuditService.record(
      {
        id: currentUser.id,
        nama: currentUser.nama,
        role: currentUser.role,
        kd_ao: currentUser.kd_ao
      },
      'SALES_ACQUISITION',
      'CHANGE_STATUS',
      `Ubah status prospek "${updatedRecord.nama_calon_konsumen}" dari ${current.status} -> ${newStatus}${updatedRecord.alasan_tolak_batal ? ` (Alasan: ${updatedRecord.alasan_tolak_batal})` : ''}`,
      leadId,
      {
        from_status: current.status,
        to_status: newStatus,
        alasan: updatedRecord.alasan_tolak_batal
      }
    );

    return {
      success: true,
      message: `Status prospek berhasil diubah menjadi "${newStatus}"!`,
      record: updatedRecord
    };
  }

  /**
   * ATOMIC CONVERSION TO CAIR:
   * 1. Updates sales_acquisitions with status = 'CAIR', no_psb, tgl_cair, sales_control_id
   * 2. Creates sales_control_records doc atomically with clean PSB number
   * 3. Records audit log
   */
  public async convertToCair(
    leadId: string,
    input: ConvertCairInput,
    currentUser: User
  ): Promise<{ success: boolean; message: string; record?: SalesAcquisition }> {
    const index = this.cache.findIndex((r) => r.id === leadId);
    if (index === -1) {
      return { success: false, message: 'Data prospek tidak ditemukan!' };
    }

    const current = this.cache[index];

    // Must be DISETUJUI before CAIR (unless SUPER_ADMIN)
    if (current.status !== 'DISETUJUI' && currentUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: `Prospek harus berstatus "DISETUJUI" terlebih dahulu sebelum dicairkan! (Status saat ini: ${current.status})`
      };
    }

    if (!input.no_psb || input.no_psb.trim().length < 3) {
      return { success: false, message: 'Nomor PSB baru wajib diisi (minimal 3 karakter)!' };
    }

    const cleanNoPsb = input.no_psb.trim().toUpperCase();
    const salesControlDocId = sanitizeDocId(cleanNoPsb);
    const nowIso = new Date().toISOString();
    const todayDate = input.tgl_cair || nowIso.split('T')[0];

    // Check PSB duplication in cache
    const existingPsb = this.cache.find((r) => r.no_psb === cleanNoPsb && r.id !== leadId);
    if (existingPsb) {
      return {
        success: false,
        message: `Nomor PSB "${cleanNoPsb}" sudah digunakan oleh nasabah lain (${existingPsb.nama_calon_konsumen})!`
      };
    }

    const updatedLead: SalesAcquisition = {
      ...current,
      status: 'CAIR',
      no_psb: cleanNoPsb,
      tgl_cair: nowIso,
      sales_control_id: salesControlDocId,
      status_updated_at: nowIso,
      status_updated_by_user_id: currentUser.id,
      updated_at: nowIso,
      updated_by_user_id: currentUser.id
    };

    // Calculate default JT day (same day of month)
    const dayDD = todayDate.split('-')[2] || '01';

    // Sales Control Record payload
    const salesControlPayload = {
      id: salesControlDocId,
      no_psb: cleanNoPsb,
      tgl_cair: todayDate,
      tgl_jt: dayDD,
      nama_konsumen: current.nama_calon_konsumen,
      no_wa: current.no_telepon_clean,
      status: 'PENDING',
      keterangan: input.keterangan || `Pencairan dari Sales Acquisition (Lead ID: ${leadId})`,
      cabang_id: current.kd_cabang,
      posko_id: current.kd_posko,
      kd_cabang: current.kd_cabang,
      kd_posko: current.kd_posko,
      created_by: currentUser.id,
      created_by_uid: currentUser.id,
      created_by_name: currentUser.nama,
      created_at: nowIso,
      updated_at: nowIso,
      updated_by: currentUser.nama,
      updated_by_uid: currentUser.id,
      acquisition_lead_id: leadId
    };

    // Atomic execution with Firestore writeBatch
    if (db) {
      try {
        const batch = writeBatch(db);

        // 1. Update sales_acquisitions
        const leadRef = doc(db, COLLECTION_NAME, leadId);
        batch.update(leadRef, {
          status: 'CAIR',
          no_psb: cleanNoPsb,
          tgl_cair: serverTimestamp(),
          sales_control_id: salesControlDocId,
          status_updated_at: serverTimestamp(),
          status_updated_by_user_id: currentUser.id,
          updated_at: serverTimestamp(),
          updated_by_user_id: currentUser.id
        });

        // 2. Create sales_control_records
        const scRef = doc(db, 'sales_control_records', salesControlDocId);
        batch.set(scRef, salesControlPayload);

        await batch.commit();
      } catch (err: any) {
        console.error('[SalesAcquisition] Error atomic CAIR batch:', err);
        return {
          success: false,
          message: `Gagal memproses pencairan atomik di Firestore: ${err?.message || 'Akses ditolak'}`
        };
      }
    }

    // Update Local Cache
    this.cache[index] = updatedLead;
    this.saveToLocalStorage(this.cache);
    this.notify();

    // Also update sales control local storage if available
    try {
      const existingScData = localStorage.getItem('kamm_sales_control_records_v1');
      const scList = existingScData ? JSON.parse(existingScData) : [];
      scList.unshift(salesControlPayload);
      localStorage.setItem('kamm_sales_control_records_v1', JSON.stringify(scList));
    } catch {}

    await AuditService.record(
      {
        id: currentUser.id,
        nama: currentUser.nama,
        role: currentUser.role,
        kd_ao: currentUser.kd_ao
      },
      'SALES_ACQUISITION',
      'CONVERT_TO_CAIR',
      `Pencairan prospek "${current.nama_calon_konsumen}" menjadi nasabah resmi KAMM (No. PSB: ${cleanNoPsb})`,
      leadId,
      {
        no_psb: cleanNoPsb,
        sales_control_id: salesControlDocId,
        tgl_cair: todayDate
      }
    );

    return {
      success: true,
      message: `Selamat! Prospek "${current.nama_calon_konsumen}" berhasil dicairkan dengan No. PSB ${cleanNoPsb}! Data otomatis tersinkronisasi ke modul Kontrol Sales.`,
      record: updatedLead
    };
  }

  /**
   * Reassignment of AO / CMO
   * KAPOS, KAOPS, KACAB, and SUPER_ADMIN only
   */
  public async reassignLead(
    leadId: string,
    input: ReassignInput,
    currentUser: User
  ): Promise<{ success: boolean; message: string; record?: SalesAcquisition }> {
    const index = this.cache.findIndex((r) => r.id === leadId);
    if (index === -1) {
      return { success: false, message: 'Data prospek tidak ditemukan!' };
    }

    const current = this.cache[index];

    // Terminal Freeze Rule
    if (['CAIR', 'DITOLAK', 'BATAL'].includes(current.status) && currentUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: `Prospek berstatus "${current.status}" adalah terminal dan tidak dapat dimutasi/dialihkan!`
      };
    }

    const nowIso = new Date().toISOString();
    const updatedRecord: SalesAcquisition = {
      ...current,
      assigned_user_id: input.new_assigned_user_id,
      kd_ao: input.new_kd_ao,
      kd_cabang: input.new_kd_cabang || current.kd_cabang,
      kd_posko: input.new_kd_posko || current.kd_posko,
      updated_at: nowIso,
      updated_by_user_id: currentUser.id
    };

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, leadId);
        await updateDoc(docRef, {
          assigned_user_id: updatedRecord.assigned_user_id,
          kd_ao: updatedRecord.kd_ao,
          kd_cabang: updatedRecord.kd_cabang,
          kd_posko: updatedRecord.kd_posko,
          updated_at: serverTimestamp(),
          updated_by_user_id: currentUser.id
        });
      } catch (err: any) {
        return {
          success: false,
          message: `Gagal mutasi penugasan di Firestore: ${err?.message || 'Akses ditolak'}`
        };
      }
    }

    this.cache[index] = updatedRecord;
    this.saveToLocalStorage(this.cache);
    this.notify();

    await AuditService.record(
      {
        id: currentUser.id,
        nama: currentUser.nama,
        role: currentUser.role,
        kd_ao: currentUser.kd_ao
      },
      'SALES_ACQUISITION',
      'REASSIGN_AO',
      `Mutasi penugasan prospek "${current.nama_calon_konsumen}" dari AO ${current.kd_ao || '-'} ke AO ${input.new_kd_ao}`,
      leadId,
      {
        old_assigned_user_id: current.assigned_user_id,
        new_assigned_user_id: input.new_assigned_user_id,
        old_kd_ao: current.kd_ao,
        new_kd_ao: input.new_kd_ao
      }
    );

    return {
      success: true,
      message: `Prospek berhasil ditugaskan ulang ke AO ${input.new_kd_ao}!`,
      record: updatedRecord
    };
  }

  /**
   * Delete lead (Restricted strictly to SUPER_ADMIN)
   */
  public async deleteLead(
    leadId: string,
    currentUser: User
  ): Promise<{ success: boolean; message: string }> {
    if (currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya SUPER_ADMIN yang memiliki kewenangan menghapus data prospek!' };
    }

    const index = this.cache.findIndex((r) => r.id === leadId);
    if (index === -1) {
      return { success: false, message: 'Data prospek tidak ditemukan!' };
    }

    const record = this.cache[index];

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, leadId);
        await deleteDoc(docRef);
      } catch (err: any) {
        return {
          success: false,
          message: `Gagal menghapus data dari Firestore: ${err?.message || 'Akses ditolak'}`
        };
      }
    }

    this.cache.splice(index, 1);
    this.saveToLocalStorage(this.cache);
    this.notify();

    await AuditService.record(
      {
        id: currentUser.id,
        nama: currentUser.nama,
        role: currentUser.role,
        kd_ao: currentUser.kd_ao
      },
      'SALES_ACQUISITION',
      'DELETE_PROSPEK',
      `Menghapus data prospek "${record.nama_calon_konsumen}" (${leadId})`,
      leadId
    );

    return { success: true, message: 'Data prospek berhasil dihapus permanen.' };
  }

  /**
   * Calculate pipeline funnel metrics
   */
  public getMetrics(records: SalesAcquisition[]): AcquisitionMetrics {
    const total = records.length;
    let prospekBaru = 0;
    let prosesSurvei = 0;
    let pengajuanBerkas = 0;
    let disetujui = 0;
    let cair = 0;
    let ditolak = 0;
    let batal = 0;

    for (const r of records) {
      switch (r.status) {
        case 'PROSPEK_BARU':
          prospekBaru++;
          break;
        case 'PROSES_SURVEI':
          prosesSurvei++;
          break;
        case 'PENGAJUAN_BERKAS':
          pengajuanBerkas++;
          break;
        case 'DISETUJUI':
          disetujui++;
          break;
        case 'CAIR':
          cair++;
          break;
        case 'DITOLAK':
          ditolak++;
          break;
        case 'BATAL':
          batal++;
          break;
      }
    }

    const conversionRate = total > 0 ? (cair / total) * 100 : 0;

    return {
      totalLeads: total,
      prospekBaru,
      prosesSurvei,
      pengajuanBerkas,
      disetujui,
      cair,
      ditolak,
      batal,
      conversionRate
    };
  }
}

export const SalesAcquisitionService = new SalesAcquisitionServiceManager();
