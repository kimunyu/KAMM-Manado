import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { SalesControlRecord } from '../types';
import { User } from '../../../types';
import { AuditService } from '../../../services/auditService';
import { checkAcceptLockStatus } from '../utils/slaUtils';

const COLLECTION_NAME = 'sales_control_records';
const LOCAL_STORAGE_KEY = 'kamm_sales_control_records_v1';

class SalesServiceManager {
  private recordsCache: SalesControlRecord[] = [];
  private listeners: Set<(records: SalesControlRecord[]) => void> = new Set();
  private unsubSnapshot: (() => void) | null = null;
  private currentSubscribedUser: User | null = null;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        this.recordsCache = JSON.parse(data);
      }
    } catch (e) {
      console.error('Gagal membaca cache lokal sales_control_records:', e);
      this.recordsCache = [];
    }
  }

  private saveToLocalStorage(records: SalesControlRecord[]): void {
    this.recordsCache = records;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Gagal menyimpan cache lokal sales_control_records:', e);
    }
  }

  private notify(): void {
    const records = this.getRecords(this.currentSubscribedUser);
    this.listeners.forEach((callback) => callback(records));
  }

  /**
   * Mengambil data records dengan penyekatan strict per-role (ADM, KAPOS, KAOPS, KACAB).
   * SUPER_ADMIN, RM, dan ADM_DE memiliki akses monitoring nasional seluruh cabang.
   */
  public getRecords(user?: User | null): SalesControlRecord[] {
    if (!user) {
      return [...this.recordsCache];
    }

    // Role Nasional: Akses semua record
    if (user.role === 'SUPER_ADMIN' || user.role === 'RM' || user.role === 'ADM_DE') {
      return [...this.recordsCache];
    }

    // Role ADM: STRICT terisolasi hanya pada posko dan cabang penempatannya
    if (user.role === 'ADM') {
      return this.recordsCache.filter((r) => {
        const matchPosko = !user.kd_posko || r.posko_id === user.kd_posko || (r as any).kd_posko === user.kd_posko;
        const matchCabang = !user.kd_cabang || r.cabang_id === user.kd_cabang || (r as any).kd_cabang === user.kd_cabang;
        return matchPosko && matchCabang;
      });
    }

    // Role KAPOS: STRICT terisolasi hanya pada posko penempatannya
    if (user.role === 'KAPOS') {
      return this.recordsCache.filter((r) => {
        return !user.kd_posko || r.posko_id === user.kd_posko || (r as any).kd_posko === user.kd_posko;
      });
    }

    // Role KAOPS / KACAB: Terisolasi pada cabang penempatannya
    if (user.role === 'KAOPS' || user.role === 'KACAB') {
      return this.recordsCache.filter((r) => {
        return !user.kd_cabang || r.cabang_id === user.kd_cabang || (r as any).kd_cabang === user.kd_cabang;
      });
    }

    return [...this.recordsCache];
  }

  /**
   * Subscribe ke real-time updates Firestore sales_control_records dengan query tersegregasi per-role.
   */
  public subscribe(
    user: User | null,
    callback: (records: SalesControlRecord[]) => void,
    onError?: (err: any) => void
  ): () => void {
    this.currentSubscribedUser = user;
    this.listeners.add(callback);
    // Kirim cached data awal terlebih dahulu
    callback(this.getRecords(user));

    // Inisialisasi onSnapshot Firestore jika belum aktif atau jika user berganti
    if (db) {
      try {
        if (this.unsubSnapshot) {
          this.unsubSnapshot();
          this.unsubSnapshot = null;
        }

        const colRef = collection(db, COLLECTION_NAME);
        let q = query(colRef);

        // Pasang klausa WHERE yang selaras dengan firestore.rules agar query diizinkan
        if (user) {
          if (user.role === 'ADM' && user.kd_posko) {
            q = query(colRef, where('posko_id', '==', user.kd_posko));
          } else if (user.role === 'KAPOS' && user.kd_posko) {
            q = query(colRef, where('posko_id', '==', user.kd_posko));
          } else if ((user.role === 'KAOPS' || user.role === 'KACAB') && user.kd_cabang) {
            q = query(colRef, where('cabang_id', '==', user.kd_cabang));
          }
        }
        
        this.unsubSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const list: SalesControlRecord[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as SalesControlRecord;
              list.push({
                ...data,
                id: docSnap.id,
                no_psb: data.no_psb || docSnap.id,
                cabang_id: data.cabang_id || (data as any).kd_cabang || '',
                kd_cabang: data.cabang_id || (data as any).kd_cabang || '',
                posko_id: data.posko_id || (data as any).kd_posko || '',
                kd_posko: data.posko_id || (data as any).kd_posko || '',
              });
            });
            
            // Sort by tgl_cair / created_at desc
            list.sort((a, b) => {
              const dateA = a.created_at || a.tgl_cair || '';
              const dateB = b.created_at || b.tgl_cair || '';
              return String(dateB).localeCompare(String(dateA));
            });

            // Merge list ke dalam cache jika user role ADM/KAPOS terbatas
            if (user && (user.role === 'ADM' || user.role === 'KAPOS')) {
              const existingOthers = this.recordsCache.filter(r => 
                user.kd_posko ? (r.posko_id !== user.kd_posko && (r as any).kd_posko !== user.kd_posko) : true
              );
              this.saveToLocalStorage([...list, ...existingOthers]);
            } else {
              this.saveToLocalStorage(list);
            }

            this.notify();
          },
          (err) => {
            console.warn('[KONTROL-SALES] onSnapshot notice:', err.message);
            if (onError) onError(err);
          }
        );
      } catch (e) {
        console.warn('[KONTROL-SALES] Gagal memulai onSnapshot Firestore:', e);
      }
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.unsubSnapshot) {
        this.unsubSnapshot();
        this.unsubSnapshot = null;
      }
    };
  }

  /**
   * Cek apakah NO PSB sudah terdaftar
   */
  public async checkNoPsbExists(noPsb: string): Promise<boolean> {
    const trimmed = noPsb.trim();
    // 1. Cek dari memory cache
    const existingInCache = this.recordsCache.find(r => r.no_psb.trim() === trimmed);
    if (existingInCache) return true;

    // 2. Cek langsung ke Firestore dengan penanganan error aman
    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, trimmed);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
      } catch (err) {
        // Jika read dibatasi oleh rule security antar posko, abaikan warning
        return false;
      }
    }
    return false;
  }

  /**
   * Input Data Pencairan Baru
   * Hak Akses: ADM, KAOPS, ADM_DE, SUPER_ADMIN
   * Sesuai Poin 4: Keterangan awal SELALU string kosong ""
   */
  public async createRecord(
    input: {
      tgl_cair: string;
      no_psb: string;
      nama_konsumen: string;
      no_wa: string;
      tgl_jt?: string;
      cabang_id: string;
      posko_id: string;
    },
    user: User
  ): Promise<{ success: boolean; message: string; record?: SalesControlRecord }> {
    // 1. Validasi Izin Input (Poin 3: ADM_DE diizinkan)
    const allowedInputRoles = ['ADM', 'KAOPS', 'ADM_DE', 'SUPER_ADMIN'];
    if (!allowedInputRoles.includes(user.role)) {
      return { 
        success: false, 
        message: `Role ${user.role} tidak memiliki hak akses untuk menginput data pencairan baru.` 
      };
    }

    const noPsb = input.no_psb.trim();
    
    // Validasi NO PSB (tepat 8 digit angka)
    if (!/^\d{8}$/.test(noPsb)) {
      return { success: false, message: 'NO PSB harus terdiri dari tepat 8 digit angka numerik.' };
    }

    // Validasi Nama Konsumen
    const namaKonsumen = input.nama_konsumen.trim();
    if (!namaKonsumen || namaKonsumen.length > 50) {
      return { success: false, message: 'Nama konsumen wajib diisi dan maksimal 50 karakter.' };
    }

    // Validasi No WA (Format 08...)
    const noWa = input.no_wa.trim();
    if (!noWa.startsWith('08') || noWa.length < 10 || noWa.length > 15) {
      return { success: false, message: 'Nomor WhatsApp wajib diawali format "08..." dengan panjang 10-15 digit.' };
    }

    // Cek Unik NO PSB
    const exists = await this.checkNoPsbExists(noPsb);
    if (exists) {
      return { success: false, message: `NO PSB "${noPsb}" sudah terdaftar dalam sistem Kontrol Sales!` };
    }

    const tglCair = input.tgl_cair.trim();
    const tglJt = (input.tgl_jt && input.tgl_jt.trim()) ? input.tgl_jt.trim() : tglCair;

    // Sesuai Poin 4: Keterangan awal selalu string kosong ""
    const newRecord: SalesControlRecord = {
      id: noPsb,
      no_psb: noPsb,
      tgl_cair: tglCair,
      tgl_jt: tglJt,
      nama_konsumen: namaKonsumen,
      no_wa: noWa,
      status: 'SUBMISS',
      keterangan: '',
      cabang_id: input.cabang_id,
      kd_cabang: input.cabang_id,
      posko_id: input.posko_id,
      kd_posko: input.posko_id,
      created_by: `${user.id} - ${user.nama} (${user.role})`,
      created_by_uid: user.id,
      created_by_name: user.nama,
      created_at: new Date().toISOString(),
    };

    // 1. Simpan ke Firestore
    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, noPsb);
        await setDoc(docRef, {
          ...newRecord,
          created_at_timestamp: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('Gagal menyimpan ke Firestore sales_control_records:', err);
        return { success: false, message: `Gagal menyimpan ke server: ${err.message || String(err)}` };
      }
    }

    // 2. Update Cache lokal
    const updated = [newRecord, ...this.recordsCache.filter(r => r.no_psb !== noPsb)];
    this.saveToLocalStorage(updated);
    this.notify();

    // 3. Catat Audit Log
    AuditService.record(
      { id: user.id, nama: user.nama, role: user.role, kd_ao: user.kd_ao },
      'KONTROL_SALES',
      'INPUT_PENCAIRAN_SALES',
      `Input laporan pencairan baru nasabah "${namaKonsumen}" (NO PSB: ${noPsb}, Cabang: ${input.cabang_id}, Posko: ${input.posko_id})`,
      noPsb,
      { no_psb: noPsb, cabang_id: input.cabang_id, posko_id: input.posko_id, tgl_cair: tglCair }
    );

    return { success: true, message: `Data pencairan nasabah "${namaKonsumen}" berhasil disimpan!`, record: newRecord };
  }

  /**
   * Validasi & Edit oleh ADM_DE (atau SUPER_ADMIN)
   * Poin 1: Dapat mengubah tgl_cair untuk mengoreksi kesalahan input tanggal pencairan oleh Role ADM.
   */
  public async validateStatusByAdmDe(
    id: string,
    params: {
      status: 'ACCEPT' | 'BELUM SELESAI';
      keterangan?: string;
      tgl_cair?: string;
      tgl_jt?: string;
      nama_konsumen?: string;
      no_wa?: string;
    },
    user: User
  ): Promise<{ success: boolean; message: string }> {
    if (user.role !== 'ADM_DE' && user.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya ADM_DE dan SUPER_ADMIN yang berwenang melakukan validasi data.' };
    }

    const existing = this.recordsCache.find(r => r.id === id || r.no_psb === id);
    if (!existing) {
      return { success: false, message: 'Data pencairan tidak ditemukan.' };
    }

    // Rule: Jika status validasi ACCEPT sudah 1x24 jam maka aksi validasi tidak dapat dilakukan kembali
    if (existing.status === 'ACCEPT') {
      const lockStatus = checkAcceptLockStatus(existing);
      if (lockStatus.isLocked) {
        return { 
          success: false, 
          message: `Aksi validasi ditutup: Status ACCEPT nasabah "${existing.nama_konsumen}" (NO PSB: ${existing.no_psb}) telah melewati batas waktu 1x24 jam (divalidasi pada ${lockStatus.formattedValidationDate}) dan telah terkunci permanen.` 
        };
      }
    }

    let finalKeterangan = '';
    if (params.status === 'ACCEPT') {
      // Saat ACCEPT default "SESUAI"
      finalKeterangan = params.keterangan && params.keterangan.trim().length > 0 
        ? params.keterangan.trim() 
        : 'SESUAI';
    } else {
      // Saat BELUM SELESAI wajib diisi poin kekurangan
      finalKeterangan = (params.keterangan || '').trim();
      if (!finalKeterangan) {
        return { success: false, message: 'Wajib mengisi poin kekurangan/alasan status "BELUM SELESAI".' };
      }
    }

    if (finalKeterangan.length > 500) {
      return { success: false, message: 'Keterangan maksimal 500 karakter.' };
    }

    const updates: Partial<SalesControlRecord> = {
      status: params.status,
      keterangan: finalKeterangan,
      updated_at: new Date().toISOString(),
      updated_by: `${user.id} - ${user.nama} (${user.role})`,
      updated_by_uid: user.id,
    };

    // Rekam timestamp validated_at saat status ACCEPT divalidasi
    if (params.status === 'ACCEPT') {
      updates.validated_at = existing.validated_at || new Date().toISOString();
    } else {
      updates.validated_at = null as any;
    }

    // Poin 1: ADM_DE & SUPER_ADMIN dapat mengoreksi tgl_cair
    if (params.tgl_cair && params.tgl_cair.trim()) {
      updates.tgl_cair = params.tgl_cair.trim();
    }

    if (params.tgl_jt && params.tgl_jt.trim()) {
      updates.tgl_jt = params.tgl_jt.trim();
    }

    if (params.nama_konsumen && params.nama_konsumen.trim()) {
      updates.nama_konsumen = params.nama_konsumen.trim().slice(0, 50);
    }
    if (params.no_wa && params.no_wa.trim()) {
      const clean = params.no_wa.trim();
      if (clean.startsWith('08') && clean.length >= 10 && clean.length <= 15) {
        updates.no_wa = clean;
      }
    }

    // 1. Simpan ke Firestore
    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, existing.no_psb);
        await updateDoc(docRef, {
          ...updates,
          updated_at_timestamp: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('Gagal update Firestore status sales_control_records:', err);
        return { success: false, message: `Gagal menyimpan ke server: ${err.message || String(err)}` };
      }
    }

    // 2. Update Cache lokal
    const updatedRecord: SalesControlRecord = {
      ...existing,
      ...updates,
    };
    const updatedList = this.recordsCache.map(r => r.no_psb === existing.no_psb ? updatedRecord : r);
    this.saveToLocalStorage(updatedList);
    this.notify();

    // 3. Catat Audit Log
    AuditService.record(
      { id: user.id, nama: user.nama, role: user.role, kd_ao: user.kd_ao },
      'KONTROL_SALES',
      params.status === 'ACCEPT' ? 'VALIDASI_ACCEPT_SALES' : 'VALIDASI_BELUM_SELESAI_SALES',
      `Validasi ADM_DE untuk nasabah "${existing.nama_konsumen}" (NO PSB: ${existing.no_psb}) diubah menjadi [${params.status}]. Tgl Cair: ${updates.tgl_cair || existing.tgl_cair}. Ket: ${finalKeterangan}`,
      existing.no_psb,
      { no_psb: existing.no_psb, new_status: params.status, tgl_cair: updates.tgl_cair || existing.tgl_cair, keterangan: finalKeterangan }
    );

    return { 
      success: true, 
      message: `Status nasabah "${existing.nama_konsumen}" berhasil diubah menjadi ${params.status}!` 
    };
  }

  /**
   * Edit data umum konsumen
   * Poin 1: tgl_cair HANYA dapat diubah oleh ADM_DE atau SUPER_ADMIN.
   */
  public async editRecordByCreator(
    id: string,
    params: {
      nama_konsumen?: string;
      no_wa?: string;
      tgl_cair?: string;
      keterangan?: string;
    },
    user: User
  ): Promise<{ success: boolean; message: string }> {
    const existing = this.recordsCache.find(r => r.id === id || r.no_psb === id);
    if (!existing) {
      return { success: false, message: 'Data pencairan tidak ditemukan.' };
    }

    if (existing.status === 'ACCEPT' && user.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Data yang telah berstatus "ACCEPT" tidak dapat diubah oleh cabang.' };
    }

    const updates: Partial<SalesControlRecord> = {
      updated_at: new Date().toISOString(),
      updated_by: `${user.id} - ${user.nama} (${user.role})`,
      updated_by_uid: user.id,
    };

    if (params.nama_konsumen) updates.nama_konsumen = params.nama_konsumen.trim().slice(0, 50);
    if (params.no_wa) updates.no_wa = params.no_wa.trim();

    // Poin 1: Hak akses ubah tgl_cair khusus ADM_DE dan SUPER_ADMIN
    if (params.tgl_cair && params.tgl_cair.trim() && params.tgl_cair.trim() !== existing.tgl_cair) {
      if (user.role === 'ADM_DE' || user.role === 'SUPER_ADMIN') {
        updates.tgl_cair = params.tgl_cair.trim();
      } else {
        return { 
          success: false, 
          message: 'Hak akses ditolak: Tanggal pencairan (TGL CAIR) hanya dapat diubah oleh role ADM_DE atau SUPER_ADMIN.' 
        };
      }
    }

    // Role ADM tidak boleh mengedit keterangan secara sembarangan
    if (params.keterangan !== undefined && user.role !== 'ADM') {
      updates.keterangan = params.keterangan.trim().slice(0, 500);
    }

    // Simpan ke Firestore
    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, existing.no_psb);
        await updateDoc(docRef, {
          ...updates,
          updated_at_timestamp: serverTimestamp(),
        });
      } catch (err: any) {
        return { success: false, message: `Gagal menyimpan perubahan: ${err.message || String(err)}` };
      }
    }

    // Update lokal
    const updatedRecord: SalesControlRecord = { ...existing, ...updates };
    const updatedList = this.recordsCache.map(r => r.no_psb === existing.no_psb ? updatedRecord : r);
    this.saveToLocalStorage(updatedList);
    this.notify();

    AuditService.record(
      { id: user.id, nama: user.nama, role: user.role, kd_ao: user.kd_ao },
      'KONTROL_SALES',
      'EDIT_DATA_SALES',
      `Perubahan data nasabah "${existing.nama_konsumen}" (NO PSB: ${existing.no_psb}) oleh ${user.nama} (${user.role})`,
      existing.no_psb
    );

    return { success: true, message: 'Perubahan data berhasil disimpan.' };
  }

  /**
   * Hapus Record Pencairan (Hanya Super Admin)
   */
  public async deleteRecord(id: string, user: User): Promise<{ success: boolean; message: string }> {
    if (user.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Administrator yang berhak menghapus data pencairan.' };
    }

    const existing = this.recordsCache.find(r => r.id === id || r.no_psb === id);
    if (!existing) {
      return { success: false, message: 'Data tidak ditemukan.' };
    }

    if (db) {
      try {
        const docRef = doc(db, COLLECTION_NAME, existing.no_psb);
        await deleteDoc(docRef);
      } catch (err: any) {
        return { success: false, message: `Gagal menghapus dari server: ${err.message || String(err)}` };
      }
    }

    const updated = this.recordsCache.filter(r => r.no_psb !== existing.no_psb);
    this.saveToLocalStorage(updated);
    this.notify();

    AuditService.record(
      { id: user.id, nama: user.nama, role: user.role, kd_ao: user.kd_ao },
      'KONTROL_SALES',
      'HAPUS_DATA_SALES',
      `Menghapus data pencairan nasabah "${existing.nama_konsumen}" (NO PSB: ${existing.no_psb})`,
      existing.no_psb
    );

    return { success: true, message: 'Data berhasil dihapus.' };
  }
}

export const SalesService = new SalesServiceManager();
