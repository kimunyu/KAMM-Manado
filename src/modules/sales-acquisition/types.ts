import { 
  SalesAcquisition, 
  SalesAcquisitionSourceLead, 
  SalesAcquisitionStatus, 
  JenisJaminan,
  DuplicateCheckResult, 
  User, 
  Cabang, 
  Posko,
  WilayahProvinsi,
  WilayahKabupaten,
  WilayahKecamatan,
  WilayahDesa
} from '../../types';

export type {
  SalesAcquisition,
  SalesAcquisitionSourceLead,
  SalesAcquisitionStatus,
  JenisJaminan,
  DuplicateCheckResult,
  WilayahProvinsi,
  WilayahKabupaten,
  WilayahKecamatan,
  WilayahDesa
};

export interface QuickEntryInput {
  nama_calon_konsumen: string;
  no_telepon: string;
  sumber_lead: SalesAcquisitionSourceLead;
  jenis_jaminan: JenisJaminan;
  kd_med?: string;
  ref_no_psb_lama?: string;
  assigned_user_id?: string;
  kd_ao?: string;
  kd_cabang?: string;
  kd_posko?: string;
  wilayah_provinsi_id: string;
  wilayah_kabupaten_id: string;
  wilayah_kecamatan_id: string;
  wilayah_desa_id: string;
  alamat_detail: string;
}

export interface NormalUpdateInput {
  nama_calon_konsumen: string;
  no_telepon: string;
  sumber_lead: SalesAcquisitionSourceLead;
  jenis_jaminan?: JenisJaminan;
  kd_med?: string;
  ref_no_psb_lama?: string;
  wilayah_provinsi_id?: string;
  wilayah_kabupaten_id?: string;
  wilayah_kecamatan_id?: string;
  wilayah_desa_id?: string;
  alamat_detail?: string;
}

export interface ReassignInput {
  new_assigned_user_id: string;
  new_kd_ao: string;
  new_kd_cabang?: string;
  new_kd_posko?: string;
}

export interface ConvertCairInput {
  no_psb: string;
  tgl_cair?: string; // Optional custom date, defaults to today
  keterangan?: string;
}

export interface TolakBatalInput {
  status: 'DITOLAK' | 'BATAL';
  alasan_tolak_batal: string;
}

export interface SalesAcquisitionFilters {
  searchQuery: string;
  statusFilter: SalesAcquisitionStatus | 'ALL';
  sumberFilter: SalesAcquisitionSourceLead | 'ALL';
  cabangFilter: string;
  poskoFilter: string;
  aoFilter: string;
  dateStart?: string;
  dateEnd?: string;
}

export interface AcquisitionMetrics {
  totalLeads: number;
  prospekBaru: number;
  prosesSurvei: number;
  pengajuanBerkas: number;
  disetujui: number;
  cair: number;
  ditolak: number;
  batal: number;
  conversionRate: number; // Cair / Total
}
