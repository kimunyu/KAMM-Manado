// Sales Acquisition Types

export type SalesAcquisitionStatus = 
  | 'PROSPEK_BARU' 
  | 'PROSES_SURVEI' 
  | 'DISETUJUI' 
  | 'CAIR' 
  | 'DITOLAK' 
  | 'BATAL';

export type SalesAcquisitionSourceLead = 
  | 'CANVASSING' 
  | 'SOSMED' 
  | 'MEDIATOR' 
  | 'EX_CUSTOMER' 
  | 'WALK_IN';

export type JenisJaminan = 'R2' | 'R4' | 'SERTIFIKAT';

export interface SalesAcquisition {
  id: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  created_by_user_nama: string;
  
  nama_calon_konsumen: string;
  no_telepon: string;
  clean_phone: string;
  sumber_lead: SalesAcquisitionSourceLead;
  jenis_jaminan: JenisJaminan;
  
  kd_med?: string;
  ref_no_psb_lama?: string;
  
  status: SalesAcquisitionStatus;
  status_alasan?: string;
  
  assigned_user_id: string;
  assigned_user_nama?: string;
  kd_ao: string;
  kd_cabang: string;
  kd_posko: string;
  
  wilayah_provinsi_id: string;
  wilayah_provinsi_nama?: string;
  wilayah_kabupaten_id: string;
  wilayah_kabupaten_nama?: string;
  wilayah_kecamatan_id: string;
  wilayah_kecamatan_nama?: string;
  wilayah_desa_id: string;
  wilayah_desa_nama?: string;
  alamat_detail: string;
  
  plafon_pengajuan?: number;
  plafon_disetujui?: number;
  tenor?: number;
  angsuran?: number;
  no_psb_baru?: string;
  tgl_cair?: string;
  
  catatan_survei?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
}

export interface SalesAcquisitionHistory {
  id: string;
  lead_id: string;
  timestamp: string;
  user_id: string;
  user_nama: string;
  action: string;
  previous_status?: SalesAcquisitionStatus;
  new_status?: SalesAcquisitionStatus;
  notes?: string;
}

export interface QuickEntryInput {
  nama_calon_konsumen: string;
  no_telepon: string;
  sumber_lead: SalesAcquisitionSourceLead;
  jenis_jaminan: JenisJaminan;
  kd_med?: string;
  ref_no_psb_lama?: string;
  assigned_user_id: string;
  kd_ao: string;
  kd_cabang: string;
  kd_posko: string;
  wilayah_provinsi_id: string;
  wilayah_kabupaten_id: string;
  wilayah_kecamatan_id: string;
  wilayah_desa_id: string;
  alamat_detail?: string;
}
