/**
 * CANONICAL REGION DATA MODEL
 * Master Wilayah Indonesia
 * 
 * Defines standard, source-agnostic interfaces for Indonesian administrative regions.
 * Independent of source JSON format and independent of business organization hierarchy.
 */

export type RegencyType = 'KABUPATEN' | 'KOTA';

export interface CanonicalProvince {
  id: string;   // 2 digits, e.g. "71"
  name: string; // Title Case/Standard Casing, e.g. "Sulawesi Utara"
}

export interface CanonicalRegency {
  id: string;           // 4 digits, e.g. "7171"
  provinceId: string;   // 2 digits, e.g. "71"
  name: string;         // e.g. "Kota Manado" or "Kabupaten Minahasa"
  type: RegencyType;    // "KOTA" | "KABUPATEN"
}

export interface CanonicalDistrict {
  id: string;           // 6 or 7 digits, e.g. "717101"
  regencyId: string;    // 4 digits, e.g. "7171"
  provinceId: string;   // 2 digits, e.g. "71"
  name: string;         // e.g. "Bunaken"
}

export interface CanonicalVillage {
  id: string;           // 10 digits, e.g. "7171011001"
  districtId: string;   // e.g. "717101"
  regencyId: string;    // e.g. "7171"
  provinceId: string;   // e.g. "71"
  name: string;         // e.g. "Molas"
}

/**
 * Target Firestore Document Schemas (as finalized in Phase 1A)
 */
export interface FirestoreProvinceDoc {
  id: string;
  nama: string;
}

export interface FirestoreRegencyDoc {
  id: string;
  provinsi_id: string;
  nama: string;
  tipe: RegencyType;
}

export interface FirestoreDistrictDoc {
  id: string;
  kabupaten_id: string;
  provinsi_id: string;
  nama: string;
}

export interface FirestoreVillageDoc {
  id: string;
  kecamatan_id: string;
  kabupaten_id: string;
  provinsi_id: string;
  nama: string;
}

/**
 * Expected Reference Thresholds
 * Reference: Kepmendagri No. 300.2.2-2138 / BPS Benchmark Reference
 * Used solely as benchmark range, never forced as absolute truth.
 */
export const KEPMENDAGRI_REFERENCE = {
  provinces: 38,
  regencies: 514,
  districts: 7285,
  villages: 83762,
};
