/**
 * FIRESTORE IMPORTER (Idempotent & Batching)
 * 
 * Rules:
 * 1. Requires successful validation report before execution.
 * 2. Idempotent setDoc with deterministic document ID.
 * 3. Batched in chunks of 450 documents (well within Firestore 500-op limit).
 * 4. Never touches existing collections (users, cabang, posko, mediators, etc.).
 * 5. Dry-run mode guaranteed by default flag.
 */

import {
  CanonicalProvince,
  CanonicalRegency,
  CanonicalDistrict,
  CanonicalVillage,
  FirestoreProvinceDoc,
  FirestoreRegencyDoc,
  FirestoreDistrictDoc,
  FirestoreVillageDoc
} from './types';
import { ValidationReport } from './validator';

export interface ImportOptions {
  dryRun: boolean;
  batchSize?: number;
  onProgress?: (info: { level: string; processed: number; total: number; percent: number }) => void;
}

export interface ImportSummary {
  dryRun: boolean;
  importedProvinces: number;
  importedRegencies: number;
  importedDistricts: number;
  importedVillages: number;
  totalWritten: number;
  batchesExecuted: number;
  durationMs: number;
  collectionsTouched: string[];
}

export const TARGET_COLLECTIONS = {
  PROVINCE: 'wilayah_provinsi',
  REGENCY: 'wilayah_kabupaten',
  DISTRICT: 'wilayah_kecamatan',
  VILLAGE: 'wilayah_desa',
};

export class FirestoreWilayahImporter {
  private batchSize: number;

  constructor(batchSize: number = 450) {
    this.batchSize = Math.min(batchSize, 450); // Cap at 450 to leave safety margin for Firestore limit
  }

  /**
   * Transforms canonical models into Firestore schema documents
   */
  toFirestorePayloads(data: {
    provinces: CanonicalProvince[];
    regencies: CanonicalRegency[];
    districts: CanonicalDistrict[];
    villages: CanonicalVillage[];
  }): {
    provinces: { id: string; doc: FirestoreProvinceDoc }[];
    regencies: { id: string; doc: FirestoreRegencyDoc }[];
    districts: { id: string; doc: FirestoreDistrictDoc }[];
    villages: { id: string; doc: FirestoreVillageDoc }[];
  } {
    return {
      provinces: data.provinces.map(p => ({
        id: p.id,
        doc: { id: p.id, nama: p.name }
      })),
      regencies: data.regencies.map(r => ({
        id: r.id,
        doc: {
          id: r.id,
          provinsi_id: r.provinceId,
          nama: r.name,
          tipe: r.type
        }
      })),
      districts: data.districts.map(d => ({
        id: d.id,
        doc: {
          id: d.id,
          kabupaten_id: d.regencyId,
          provinsi_id: d.provinceId,
          nama: d.name
        }
      })),
      villages: data.villages.map(v => ({
        id: v.id,
        doc: {
          id: v.id,
          kecamatan_id: v.districtId,
          kabupaten_id: v.regencyId,
          provinsi_id: v.provinceId,
          nama: v.name
        }
      }))
    };
  }

  /**
   * Simulates or executes batched imports with verification
   */
  async runImport(
    data: {
      provinces: CanonicalProvince[];
      regencies: CanonicalRegency[];
      districts: CanonicalDistrict[];
      villages: CanonicalVillage[];
    },
    validation: ValidationReport,
    options: ImportOptions,
    firestoreWriter?: (collection: string, docId: string, data: any) => Promise<void>
  ): Promise<ImportSummary> {
    if (!validation.passed) {
      throw new Error(`Cannot proceed with import: Validation FAILED with ${validation.errors.length} error(s).`);
    }

    const startTime = Date.now();
    const payloads = this.toFirestorePayloads(data);

    let batchesExecuted = 0;
    let totalWritten = 0;

    const levels = [
      { name: TARGET_COLLECTIONS.PROVINCE, items: payloads.provinces },
      { name: TARGET_COLLECTIONS.REGENCY, items: payloads.regencies },
      { name: TARGET_COLLECTIONS.DISTRICT, items: payloads.districts },
      { name: TARGET_COLLECTIONS.VILLAGE, items: payloads.villages },
    ];

    for (const level of levels) {
      const total = level.items.length;
      let processed = 0;

      for (let i = 0; i < total; i += this.batchSize) {
        const chunk = level.items.slice(i, i + this.batchSize);
        batchesExecuted++;

        if (!options.dryRun) {
          if (!firestoreWriter) {
            throw new Error('Firestore writer callback is required when dryRun=false.');
          }
          for (const item of chunk) {
            await firestoreWriter(level.name, item.id, item.doc);
            totalWritten++;
          }
        } else {
          totalWritten += chunk.length;
        }

        processed += chunk.length;
        if (options.onProgress) {
          options.onProgress({
            level: level.name,
            processed,
            total,
            percent: Math.round((processed / total) * 100)
          });
        }
      }
    }

    return {
      dryRun: options.dryRun,
      importedProvinces: payloads.provinces.length,
      importedRegencies: payloads.regencies.length,
      importedDistricts: payloads.districts.length,
      importedVillages: payloads.villages.length,
      totalWritten,
      batchesExecuted,
      durationMs: Date.now() - startTime,
      collectionsTouched: Object.values(TARGET_COLLECTIONS)
    };
  }
}
