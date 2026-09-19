/**
 * VALIDATION ENGINE
 * 
 * Strict validation rules before any Firestore write:
 * A. Duplicate ID detection per level.
 * B. Orphan relation check (Regency->Province, District->Regency, Village->District).
 * C. Invalid Code (empty, whitespace, non-string).
 * D. Parent consistency (prefix integrity and parent match).
 * E. Name empty check.
 * F. Allow duplicate name across different IDs.
 * G. Expected hierarchy range verification (Warning vs Fail).
 */

import {
  CanonicalProvince,
  CanonicalRegency,
  CanonicalDistrict,
  CanonicalVillage,
  KEPMENDAGRI_REFERENCE
} from './types';

export interface LevelValidationStats {
  total: number;
  duplicateIds: number;
  invalidIds: number;
  emptyNames: number;
  orphans: number;
  inconsistentParents: number;
}

export interface ValidationReport {
  timestamp: string;
  source: string;
  targetScope: string;
  passed: boolean;
  hasWarnings: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    provinces: LevelValidationStats;
    regencies: LevelValidationStats;
    districts: LevelValidationStats;
    villages: LevelValidationStats;
  };
}

export function validateRegionDataset(params: {
  sourceName: string;
  scopeDescription: string;
  provinces: CanonicalProvince[];
  regencies: CanonicalRegency[];
  districts: CanonicalDistrict[];
  villages: CanonicalVillage[];
}): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const provStats: LevelValidationStats = { total: params.provinces.length, duplicateIds: 0, invalidIds: 0, emptyNames: 0, orphans: 0, inconsistentParents: 0 };
  const regStats: LevelValidationStats = { total: params.regencies.length, duplicateIds: 0, invalidIds: 0, emptyNames: 0, orphans: 0, inconsistentParents: 0 };
  const distStats: LevelValidationStats = { total: params.districts.length, duplicateIds: 0, invalidIds: 0, emptyNames: 0, orphans: 0, inconsistentParents: 0 };
  const villStats: LevelValidationStats = { total: params.villages.length, duplicateIds: 0, invalidIds: 0, emptyNames: 0, orphans: 0, inconsistentParents: 0 };

  // 1. Validate Provinces
  const provMap = new Map<string, CanonicalProvince>();
  for (const p of params.provinces) {
    if (!p.id || typeof p.id !== 'string' || /\s/.test(p.id)) {
      provStats.invalidIds++;
      errors.push(`Invalid Province ID: "${p.id}"`);
    } else if (provMap.has(p.id)) {
      provStats.duplicateIds++;
      errors.push(`Duplicate Province ID: "${p.id}" (${p.name})`);
    } else {
      provMap.set(p.id, p);
    }

    if (!p.name || p.name.trim().length === 0) {
      provStats.emptyNames++;
      errors.push(`Empty name for Province ID "${p.id}"`);
    }
  }

  // 2. Validate Regencies
  const regMap = new Map<string, CanonicalRegency>();
  for (const r of params.regencies) {
    if (!r.id || typeof r.id !== 'string' || /\s/.test(r.id)) {
      regStats.invalidIds++;
      errors.push(`Invalid Regency ID: "${r.id}"`);
    } else if (regMap.has(r.id)) {
      regStats.duplicateIds++;
      errors.push(`Duplicate Regency ID: "${r.id}" (${r.name})`);
    } else {
      regMap.set(r.id, r);
    }

    if (!r.name || r.name.trim().length === 0) {
      regStats.emptyNames++;
      errors.push(`Empty name for Regency ID "${r.id}"`);
    }

    // Orphan check: must have valid parent province
    if (!r.provinceId || !provMap.has(r.provinceId)) {
      regStats.orphans++;
      errors.push(`Orphan Regency ID "${r.id}" (${r.name}): Parent Province ID "${r.provinceId}" not found`);
    } else if (!r.id.startsWith(r.provinceId)) {
      regStats.inconsistentParents++;
      warnings.push(`Regency ID "${r.id}" prefix does not match Province ID "${r.provinceId}"`);
    }
  }

  // 3. Validate Districts
  const distMap = new Map<string, CanonicalDistrict>();
  for (const d of params.districts) {
    if (!d.id || typeof d.id !== 'string' || /\s/.test(d.id)) {
      distStats.invalidIds++;
      errors.push(`Invalid District ID: "${d.id}"`);
    } else if (distMap.has(d.id)) {
      distStats.duplicateIds++;
      errors.push(`Duplicate District ID: "${d.id}" (${d.name})`);
    } else {
      distMap.set(d.id, d);
    }

    if (!d.name || d.name.trim().length === 0) {
      distStats.emptyNames++;
      errors.push(`Empty name for District ID "${d.id}"`);
    }

    // Orphan check: must have valid parent regency
    if (!d.regencyId || !regMap.has(d.regencyId)) {
      distStats.orphans++;
      errors.push(`Orphan District ID "${d.id}" (${d.name}): Parent Regency ID "${d.regencyId}" not found`);
    } else if (!d.id.startsWith(d.regencyId)) {
      distStats.inconsistentParents++;
      warnings.push(`District ID "${d.id}" prefix does not match Regency ID "${d.regencyId}"`);
    }

    // Province consistency check
    if (!d.provinceId || !provMap.has(d.provinceId)) {
      errors.push(`District ID "${d.id}" has invalid province reference "${d.provinceId}"`);
    }
  }

  // 4. Validate Villages
  const villMap = new Map<string, CanonicalVillage>();
  for (const v of params.villages) {
    if (!v.id || typeof v.id !== 'string' || /\s/.test(v.id)) {
      villStats.invalidIds++;
      errors.push(`Invalid Village ID: "${v.id}"`);
    } else if (villMap.has(v.id)) {
      villStats.duplicateIds++;
      errors.push(`Duplicate Village ID: "${v.id}" (${v.name})`);
    } else {
      villMap.set(v.id, v);
    }

    if (!v.name || v.name.trim().length === 0) {
      villStats.emptyNames++;
      errors.push(`Empty name for Village ID "${v.id}"`);
    }

    // Orphan check: must have valid parent district
    if (!v.districtId || !distMap.has(v.districtId)) {
      villStats.orphans++;
      errors.push(`Orphan Village ID "${v.id}" (${v.name}): Parent District ID "${v.districtId}" not found`);
    } else if (!v.id.startsWith(v.districtId)) {
      villStats.inconsistentParents++;
      warnings.push(`Village ID "${v.id}" prefix does not match District ID "${v.districtId}"`);
    }

    // Regency & Province consistency check
    if (!v.regencyId || !regMap.has(v.regencyId)) {
      errors.push(`Village ID "${v.id}" has invalid regency reference "${v.regencyId}"`);
    }
    if (!v.provinceId || !provMap.has(v.provinceId)) {
      errors.push(`Village ID "${v.id}" has invalid province reference "${v.provinceId}"`);
    }
  }

  // Hierarchy benchmark check (Warnings only, not errors)
  if (params.scopeDescription.toLowerCase().includes('nasional') || params.scopeDescription.toLowerCase().includes('full')) {
    if (params.provinces.length !== KEPMENDAGRI_REFERENCE.provinces) {
      warnings.push(`Province count (${params.provinces.length}) differs from Kepmendagri 2025 benchmark (${KEPMENDAGRI_REFERENCE.provinces})`);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    source: params.sourceName,
    targetScope: params.scopeDescription,
    passed: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    stats: {
      provinces: provStats,
      regencies: regStats,
      districts: distStats,
      villages: villStats,
    }
  };
}

export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push('================================================================');
  lines.push('            MASTER WILAYAH VALIDATION REPORT                    ');
  lines.push('================================================================');
  lines.push(`Source     : ${report.source}`);
  lines.push(`Scope      : ${report.targetScope}`);
  lines.push(`Generated  : ${report.timestamp}`);
  lines.push('----------------------------------------------------------------');
  lines.push('PROVINCE');
  lines.push(`  Actual             : ${report.stats.provinces.total}`);
  lines.push(`  Duplicate IDs      : ${report.stats.provinces.duplicateIds}`);
  lines.push(`  Invalid IDs        : ${report.stats.provinces.invalidIds}`);
  lines.push(`  Empty Names        : ${report.stats.provinces.emptyNames}`);
  lines.push('----------------------------------------------------------------');
  lines.push('REGENCY / KABUPATEN / KOTA');
  lines.push(`  Actual             : ${report.stats.regencies.total}`);
  lines.push(`  Duplicate IDs      : ${report.stats.regencies.duplicateIds}`);
  lines.push(`  Invalid IDs        : ${report.stats.regencies.invalidIds}`);
  lines.push(`  Empty Names        : ${report.stats.regencies.emptyNames}`);
  lines.push(`  Orphans            : ${report.stats.regencies.orphans}`);
  lines.push('----------------------------------------------------------------');
  lines.push('DISTRICT / KECAMATAN');
  lines.push(`  Actual             : ${report.stats.districts.total}`);
  lines.push(`  Duplicate IDs      : ${report.stats.districts.duplicateIds}`);
  lines.push(`  Invalid IDs        : ${report.stats.districts.invalidIds}`);
  lines.push(`  Empty Names        : ${report.stats.districts.emptyNames}`);
  lines.push(`  Orphans            : ${report.stats.districts.orphans}`);
  lines.push('----------------------------------------------------------------');
  lines.push('VILLAGE / DESA / KELURAHAN');
  lines.push(`  Actual             : ${report.stats.villages.total}`);
  lines.push(`  Duplicate IDs      : ${report.stats.villages.duplicateIds}`);
  lines.push(`  Invalid IDs        : ${report.stats.villages.invalidIds}`);
  lines.push(`  Empty Names        : ${report.stats.villages.emptyNames}`);
  lines.push(`  Orphans            : ${report.stats.villages.orphans}`);
  lines.push('================================================================');
  lines.push(`STATUS: ${report.passed ? 'PASS' : 'FAILED'}`);
  if (report.hasWarnings) {
    lines.push(`WARNINGS: ${report.warnings.length}`);
    report.warnings.slice(0, 10).forEach(w => lines.push(`  [WARN] ${w}`));
    if (report.warnings.length > 10) lines.push(`  ... and ${report.warnings.length - 10} more warnings`);
  }
  if (!report.passed) {
    lines.push(`ERRORS: ${report.errors.length}`);
    report.errors.slice(0, 15).forEach(e => lines.push(`  [ERR] ${e}`));
    if (report.errors.length > 15) lines.push(`  ... and ${report.errors.length - 15} more errors`);
  }
  lines.push('================================================================');
  return lines.join('\n');
}
