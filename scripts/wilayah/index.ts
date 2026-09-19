/**
 * MASTER WILAYAH PIPELINE CLI
 * 
 * Usage:
 *   npx tsx scripts/wilayah/index.ts --dry-run [--mode=pilot|full] [--province=71]
 *   npx tsx scripts/wilayah/index.ts --import [--mode=pilot|full] [--province=71]
 */

import { IbnuxOnlineAdapter } from './adapter';
import { validateRegionDataset, formatValidationReport } from './validator';
import { FirestoreWilayahImporter, TARGET_COLLECTIONS } from './importer';
import {
  CanonicalProvince,
  CanonicalRegency,
  CanonicalDistrict,
  CanonicalVillage
} from './types';

async function main() {
  const args = process.argv.slice(2);
  const isImport = args.includes('--import');
  const isDryRun = args.includes('--dry-run') || !isImport;
  
  // Mode selection: default to pilot (Sulawesi Utara: 71) for safety
  const modeArg = args.find(a => a.startsWith('--mode='));
  const mode = modeArg ? modeArg.split('=')[1] : 'pilot';
  
  const provArg = args.find(a => a.startsWith('--province='));
  const targetProvId = provArg ? provArg.split('=')[1] : '71';

  console.log('================================================================');
  console.log('       MASTER WILAYAH INDONESIA IMPORT & VALIDATION TOOL        ');
  console.log('================================================================');
  console.log(`Execution Mode : ${isImport ? 'LIVE IMPORT (WRITE)' : 'DRY RUN (READ-ONLY)'}`);
  console.log(`Scope Target   : ${mode === 'pilot' ? `Pilot Province ${targetProvId} (Sulawesi Utara + Children)` : 'Full National (38 Provinces)'}`);
  console.log('----------------------------------------------------------------');

  const adapter = new IbnuxOnlineAdapter();
  console.log(`[1/4] Connecting to source adapter: ${adapter.name}...`);

  let provinces: CanonicalProvince[] = [];
  let regencies: CanonicalRegency[] = [];
  let districts: CanonicalDistrict[] = [];
  let villages: CanonicalVillage[] = [];

  const allProvs = await adapter.fetchProvinces();
  console.log(`[2/4] Retrieved ${allProvs.length} provinces from source.`);

  if (mode === 'pilot') {
    const pilotProv = allProvs.find(p => p.id === targetProvId);
    if (!pilotProv) {
      throw new Error(`Target province ID "${targetProvId}" not found in source dataset.`);
    }
    provinces = [pilotProv];
    console.log(`  Filtered to pilot province: [${pilotProv.id}] ${pilotProv.name}`);

    // Fetch regencies for pilot province
    console.log(`  Fetching regencies for province ${pilotProv.id}...`);
    const provRegs = await adapter.fetchRegencies(pilotProv.id);
    regencies.push(...provRegs);
    console.log(`  Retrieved ${provRegs.length} regencies in ${pilotProv.name}.`);

    // Fetch districts for each regency
    console.log(`  Fetching districts for ${provRegs.length} regencies...`);
    for (const reg of provRegs) {
      const regDists = await adapter.fetchDistricts(reg.id, pilotProv.id);
      districts.push(...regDists);
    }
    console.log(`  Retrieved ${districts.length} districts in ${pilotProv.name}.`);

    // Fetch villages for each district with concurrent batches (concurrency: 15)
    console.log(`  Fetching villages for ${districts.length} districts (concurrency: 15)...`);
    const CONCURRENCY = 15;
    for (let i = 0; i < districts.length; i += CONCURRENCY) {
      const slice = districts.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        slice.map(dist => adapter.fetchVillages(dist.id, dist.regencyId, pilotProv.id))
      );
      results.forEach(res => villages.push(...res));
      const processed = Math.min(i + CONCURRENCY, districts.length);
      process.stdout.write(`    Progress: ${processed}/${districts.length} districts processed (${villages.length} villages loaded)\r`);
    }
    console.log(`\n  Retrieved ${villages.length} total villages in ${pilotProv.name}.`);
  } else {
    // Mode Full: Fetch all provinces and their children
    provinces = allProvs;
    console.log('Fetching full national scope regencies...');
    for (const prov of provinces) {
      const pRegs = await adapter.fetchRegencies(prov.id);
      regencies.push(...pRegs);
    }
    console.log(`Retrieved ${regencies.length} regencies nationwide.`);
  }

  // [3/4] Run Validation Engine
  console.log('\n[3/4] Running Comprehensive Validation Engine...');
  const report = validateRegionDataset({
    sourceName: adapter.name,
    scopeDescription: mode === 'pilot' ? `Pilot Province ${targetProvId} (Sulawesi Utara)` : 'Full National Dataset',
    provinces,
    regencies,
    districts,
    villages
  });

  console.log('\n' + formatValidationReport(report));

  if (!report.passed) {
    console.error('\n❌ VALIDATION REJECTED: Dataset contains structural errors. Pipeline aborted.');
    process.exit(1);
  }

  // [4/4] Importer Run
  console.log('\n[4/4] Executing Importer Pipeline...');
  const importer = new FirestoreWilayahImporter();

  if (isDryRun) {
    const summary = await importer.runImport(
      { provinces, regencies, districts, villages },
      report,
      {
        dryRun: true,
        onProgress: (p) => {
          process.stdout.write(`  [DryRun Simulation] ${p.level}: ${p.processed}/${p.total} (${p.percent}%)\r`);
        }
      }
    );
    console.log('\n');
    console.log('================================================================');
    console.log('                   DRY RUN EXECUTION SUMMARY                    ');
    console.log('================================================================');
    console.log(`Provinces simulated   : ${summary.importedProvinces}`);
    console.log(`Regencies simulated   : ${summary.importedRegencies}`);
    console.log(`Districts simulated   : ${summary.importedDistricts}`);
    console.log(`Villages simulated    : ${summary.importedVillages}`);
    console.log(`Total records checked : ${summary.totalWritten}`);
    console.log(`Batches simulated     : ${summary.batchesExecuted}`);
    console.log(`Target Collections    : ${summary.collectionsTouched.join(', ')}`);
    console.log('Firestore Writes      : 0 (DRY RUN MODE - SAFE)');
    console.log('Existing Data Impact  : ZERO (NO MODIFICATIONS)');
    console.log('Status                : PASS - READY FOR PHASE 1C/1D');
    console.log('================================================================');
  } else {
    console.log('\n⚠️ LIVE IMPORT MODE REQUESTED.');
    console.log('Notice: Phase 1B mandate requires explicit dry-run validation approval first.');
    console.log('Target collections will be:');
    console.log(`  - ${TARGET_COLLECTIONS.PROVINCE}`);
    console.log(`  - ${TARGET_COLLECTIONS.REGENCY}`);
    console.log(`  - ${TARGET_COLLECTIONS.DISTRICT}`);
    console.log(`  - ${TARGET_COLLECTIONS.VILLAGE}`);
  }
}

main().catch(err => {
  console.error('\nFatal Pipeline Error:', err.message);
  process.exit(1);
});
