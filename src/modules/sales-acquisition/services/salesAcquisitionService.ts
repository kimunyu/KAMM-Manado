import { SalesAcquisition, QuickEntryInput, SalesAcquisitionStatus, SalesAcquisitionHistory } from '../types';
import { User } from '../../../types';
import { INITIAL_LEADS } from '../../../data/initialData';
import { StorageService } from '../../../services/storage';

const ACQ_STORAGE_KEY = 'kamm_sales_acquisitions';
const ACQ_HISTORY_KEY = 'kamm_sales_acq_history';

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

export class SalesAcquisitionService {
  static getLeads(): SalesAcquisition[] {
    const raw = localStorage.getItem(ACQ_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACQ_STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
      return INITIAL_LEADS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_LEADS;
    }
  }

  static saveLeads(leads: SalesAcquisition[]): void {
    localStorage.setItem(ACQ_STORAGE_KEY, JSON.stringify(leads));
  }

  static getHistory(): SalesAcquisitionHistory[] {
    const raw = localStorage.getItem(ACQ_HISTORY_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static addHistory(entry: Omit<SalesAcquisitionHistory, 'id' | 'timestamp'>): void {
    const hist = this.getHistory();
    hist.unshift({
      ...entry,
      id: `HIST_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(ACQ_HISTORY_KEY, JSON.stringify(hist));
  }

  static checkDuplicate(phoneNumber: string, excludeId?: string): { hasDuplicate: boolean; duplicateInfo?: SalesAcquisition } {
    const clean = cleanPhoneNumber(phoneNumber);
    if (!clean || clean.length < 9) return { hasDuplicate: false };

    const leads = this.getLeads();
    const found = leads.find(l => {
      if (excludeId && l.id === excludeId) return false;
      if (['DITOLAK', 'BATAL'].includes(l.status)) return false;
      return cleanPhoneNumber(l.no_telepon) === clean;
    });

    if (found) {
      return { hasDuplicate: true, duplicateInfo: found };
    }
    return { hasDuplicate: false };
  }

  static async createQuickEntryLead(
    input: QuickEntryInput,
    currentUser: User
  ): Promise<{ success: boolean; message?: string; lead?: SalesAcquisition }> {
    const cleanPhone = cleanPhoneNumber(input.no_telepon);
    if (cleanPhone.length < 9 || cleanPhone.length > 20) {
      return { success: false, message: 'Format nomor telepon tidak valid (9-20 digit angka)!' };
    }

    const dupCheck = this.checkDuplicate(cleanPhone);
    if (dupCheck.hasDuplicate && dupCheck.duplicateInfo) {
      return {
        success: false,
        message: `Nomor telepon ${cleanPhone} sudah terdaftar aktif atas nama "${dupCheck.duplicateInfo.nama_calon_konsumen}" (Status: ${dupCheck.duplicateInfo.status}, AO: ${dupCheck.duplicateInfo.kd_ao || '-'})!`
      };
    }

    const nowIso = new Date().toISOString();
    const docId = `ACQ_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newLead: SalesAcquisition = {
      id: docId,
      created_at: nowIso,
      updated_at: nowIso,
      created_by_user_id: currentUser.id,
      created_by_user_nama: currentUser.nama,
      
      nama_calon_konsumen: input.nama_calon_konsumen.trim(),
      no_telepon: input.no_telepon.trim(),
      clean_phone: cleanPhone,
      sumber_lead: input.sumber_lead,
      jenis_jaminan: input.jenis_jaminan,
      
      kd_med: input.kd_med?.trim().toUpperCase() || '',
      ref_no_psb_lama: input.ref_no_psb_lama?.trim().toUpperCase() || '',
      
      status: 'PROSPEK_BARU',
      assigned_user_id: input.assigned_user_id || currentUser.id,
      assigned_user_nama: currentUser.nama,
      kd_ao: input.kd_ao || currentUser.kd_ao || '',
      kd_cabang: input.kd_cabang || currentUser.kd_cabang || 'C16',
      kd_posko: input.kd_posko || currentUser.kd_posko || 'QJ0',
      
      wilayah_provinsi_id: input.wilayah_provinsi_id,
      wilayah_kabupaten_id: input.wilayah_kabupaten_id,
      wilayah_kecamatan_id: input.wilayah_kecamatan_id,
      wilayah_desa_id: input.wilayah_desa_id,
      alamat_detail: (input.alamat_detail || '').trim()
    };

    const leads = this.getLeads();
    leads.unshift(newLead);
    this.saveLeads(leads);

    this.addHistory({
      lead_id: docId,
      user_id: currentUser.id,
      user_nama: currentUser.nama,
      action: 'INPUT_PROSPEK',
      new_status: 'PROSPEK_BARU',
      notes: `Input Prospek Baru oleh ${currentUser.nama} (${currentUser.role})`
    });

    StorageService.logActivity(
      currentUser.id,
      currentUser.username,
      'CREATE_LEAD',
      'Sales Acquisition',
      `Menambahkan prospek: ${newLead.nama_calon_konsumen} (${newLead.jenis_jaminan})`
    );

    return { success: true, lead: newLead };
  }

  static async updateLeadStatus(
    leadId: string,
    newStatus: SalesAcquisitionStatus,
    currentUser: User,
    notes?: string,
    extraData?: Partial<SalesAcquisition>
  ): Promise<{ success: boolean; message?: string }> {
    const leads = this.getLeads();
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx === -1) {
      return { success: false, message: 'Prospek tidak ditemukan!' };
    }

    const prevStatus = leads[idx].status;
    leads[idx].status = newStatus;
    leads[idx].updated_at = new Date().toISOString();

    if (extraData) {
      Object.assign(leads[idx], extraData);
    }

    this.saveLeads(leads);

    this.addHistory({
      lead_id: leadId,
      user_id: currentUser.id,
      user_nama: currentUser.nama,
      action: `STATUS_CHANGE_TO_${newStatus}`,
      previous_status: prevStatus,
      new_status: newStatus,
      notes: notes || `Status diubah menjadi ${newStatus}`
    });

    return { success: true };
  }

  static async reassignLead(
    leadId: string,
    newAssigneeId: string,
    newAssigneeNama: string,
    newKdAo: string,
    currentUser: User,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> {
    const leads = this.getLeads();
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx === -1) {
      return { success: false, message: 'Prospek tidak ditemukan!' };
    }

    const prevAo = leads[idx].kd_ao;
    leads[idx].assigned_user_id = newAssigneeId;
    leads[idx].assigned_user_nama = newAssigneeNama;
    leads[idx].kd_ao = newKdAo;
    leads[idx].updated_at = new Date().toISOString();

    this.saveLeads(leads);

    this.addHistory({
      lead_id: leadId,
      user_id: currentUser.id,
      user_nama: currentUser.nama,
      action: 'REASSIGN_AO',
      notes: `Penugasan dialihkan dari ${prevAo || '-'} ke ${newKdAo} (${newAssigneeNama}) oleh ${currentUser.nama}. Catatan: ${notes || '-'}`
    });

    return { success: true };
  }

  static async updateLeadDetails(
    leadId: string,
    updates: Partial<SalesAcquisition>,
    currentUser: User
  ): Promise<{ success: boolean; message?: string }> {
    const leads = this.getLeads();
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx === -1) {
      return { success: false, message: 'Prospek tidak ditemukan!' };
    }

    leads[idx] = {
      ...leads[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveLeads(leads);

    this.addHistory({
      lead_id: leadId,
      user_id: currentUser.id,
      user_nama: currentUser.nama,
      action: 'UPDATE_DETAILS',
      notes: `Perubahan data prospek oleh ${currentUser.nama}`
    });

    return { success: true };
  }
}
