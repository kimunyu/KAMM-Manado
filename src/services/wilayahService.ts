import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  WilayahProvinsi, 
  WilayahKabupaten, 
  WilayahKecamatan, 
  WilayahDesa 
} from '../types';
import fallbackWilayahData from '../data/wilayahFallbackData.json';

/**
 * Cache Configuration
 * TTL: 30 days (Master data administratif sangat stabil)
 */
const CACHE_PREFIX = 'kamm:wilayah:v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Hari

interface CacheEntry<T> {
  version: 'v1';
  timestamp: number;
  data: T;
}

class WilayahService {
  // In-Memory Cache layer untuk respon instan tanpa I/O
  private memoryCache: Map<string, { timestamp: number; data: any }> = new Map();

  /**
   * Helper pembacaan cache defensive (Memory -> localStorage -> null)
   */
  private getFromCache<T>(key: string): T | null {
    const now = Date.now();

    // 1. Cek In-Memory Cache
    const mem = this.memoryCache.get(key);
    if (mem && (now - mem.timestamp < CACHE_TTL_MS)) {
      return mem.data as T;
    }

    // 2. Cek localStorage (Defensive parsing)
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (!parsed || parsed.version !== 'v1' || !Array.isArray(parsed.data)) {
        localStorage.removeItem(key);
        return null;
      }

      // Cek TTL
      if (now - parsed.timestamp > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }

      // Simpan kembali ke memory cache untuk akses cepat berikutnya
      this.memoryCache.set(key, { timestamp: parsed.timestamp, data: parsed.data });
      return parsed.data;
    } catch (err) {
      // Jika localStorage corrupt atau error, fail safe dengan anggap cache miss
      console.warn(`[WilayahService] Cache read error for ${key}:`, err);
      try {
        localStorage.removeItem(key);
      } catch (_) {}
      return null;
    }
  }

  /**
   * Helper penyimpanan cache defensive (Memory + localStorage)
   */
  private saveToCache<T>(key: string, data: T): void {
    const now = Date.now();
    this.memoryCache.set(key, { timestamp: now, data });

    try {
      const entry: CacheEntry<T> = {
        version: 'v1',
        timestamp: now,
        data
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (err) {
      // Quota exceeded atau storage disabled, abaikan tanpa crash
      console.warn(`[WilayahService] Cache write error for ${key}:`, err);
    }
  }

  /**
   * Membaca seluruh master Provinsi (diurutkan berdasarkan nama ASC)
   * Mengutamakan Firestore -> Fallback ke canonical local dataset jika offline/kosong
   */
  async getProvinsi(): Promise<WilayahProvinsi[]> {
    const cacheKey = `${CACHE_PREFIX}:provinsi`;
    const cached = this.getFromCache<WilayahProvinsi[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    let list: WilayahProvinsi[] = [];

    // 1. Coba baca dari Cloud Firestore
    if (db) {
      try {
        const colRef = collection(db, 'wilayah_provinsi');
        const q = query(colRef, orderBy('nama', 'asc'));
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.nama === 'string') {
            list.push({
              id: String(d.id || docSnap.id),
              nama: String(d.nama)
            });
          }
        });
      } catch (err) {
        console.info('[WilayahService] Firestore getProvinsi offline/unavailable, beralih ke fallback canonical.');
      }
    }

    // 2. Fallback jika Firestore kosong atau error
    if (list.length === 0 && fallbackWilayahData.provinces) {
      list = fallbackWilayahData.provinces.map((p: any) => ({
        id: String(p.id),
        nama: String(p.nama)
      }));
    }

    list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    if (list.length > 0) {
      this.saveToCache(cacheKey, list);
    }
    return list;
  }

  /**
   * Membaca Kabupaten/Kota berdasarkan provinsi_id (diurutkan berdasarkan nama ASC)
   */
  async getKabupatenByProvinsiId(provinsiId: string): Promise<WilayahKabupaten[]> {
    const cleanId = String(provinsiId).trim();
    if (!cleanId) return [];

    const cacheKey = `${CACHE_PREFIX}:kabupaten:${cleanId}`;
    const cached = this.getFromCache<WilayahKabupaten[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    let list: WilayahKabupaten[] = [];

    // 1. Coba baca dari Cloud Firestore
    if (db) {
      try {
        const colRef = collection(db, 'wilayah_kabupaten');
        const q = query(
          colRef, 
          where('provinsi_id', '==', cleanId)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.nama === 'string') {
            list.push({
              id: String(d.id || docSnap.id),
              provinsi_id: String(d.provinsi_id || cleanId),
              nama: String(d.nama),
              tipe: d.tipe === 'KOTA' ? 'KOTA' : 'KABUPATEN'
            });
          }
        });
      } catch (err) {
        console.info(`[WilayahService] Firestore getKabupaten(${cleanId}) offline/unavailable, beralih ke fallback canonical.`);
      }
    }

    // 2. Fallback jika Firestore kosong atau error
    if (list.length === 0 && fallbackWilayahData.regencies) {
      list = fallbackWilayahData.regencies
        .filter((r: any) => String(r.provinsi_id) === cleanId)
        .map((r: any) => ({
          id: String(r.id),
          provinsi_id: String(r.provinsi_id || cleanId),
          nama: String(r.nama),
          tipe: r.tipe === 'KOTA' ? 'KOTA' : 'KABUPATEN'
        }));
    }

    list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    if (list.length > 0) {
      this.saveToCache(cacheKey, list);
    }
    return list;
  }

  /**
   * Membaca Kecamatan berdasarkan kabupaten_id (diurutkan berdasarkan nama ASC)
   */
  async getKecamatanByKabupatenId(kabupatenId: string): Promise<WilayahKecamatan[]> {
    const cleanId = String(kabupatenId).trim();
    if (!cleanId) return [];

    const cacheKey = `${CACHE_PREFIX}:kecamatan:${cleanId}`;
    const cached = this.getFromCache<WilayahKecamatan[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    let list: WilayahKecamatan[] = [];

    // 1. Coba baca dari Cloud Firestore
    if (db) {
      try {
        const colRef = collection(db, 'wilayah_kecamatan');
        const q = query(
          colRef, 
          where('kabupaten_id', '==', cleanId)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.nama === 'string') {
            list.push({
              id: String(d.id || docSnap.id),
              kabupaten_id: String(d.kabupaten_id || cleanId),
              provinsi_id: String(d.provinsi_id || ''),
              nama: String(d.nama)
            });
          }
        });
      } catch (err) {
        console.info(`[WilayahService] Firestore getKecamatan(${cleanId}) offline/unavailable, beralih ke fallback canonical.`);
      }
    }

    // 2. Fallback jika Firestore kosong atau error
    if (list.length === 0 && fallbackWilayahData.districts) {
      list = fallbackWilayahData.districts
        .filter((d: any) => String(d.kabupaten_id) === cleanId)
        .map((d: any) => ({
          id: String(d.id),
          kabupaten_id: String(d.kabupaten_id || cleanId),
          provinsi_id: String(d.provinsi_id || ''),
          nama: String(d.nama)
        }));
    }

    list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    if (list.length > 0) {
      this.saveToCache(cacheKey, list);
    }
    return list;
  }

  /**
   * Membaca Desa/Kelurahan berdasarkan kecamatan_id (diurutkan berdasarkan nama ASC)
   */
  async getDesaByKecamatanId(kecamatanId: string): Promise<WilayahDesa[]> {
    const cleanId = String(kecamatanId).trim();
    if (!cleanId) return [];

    const cacheKey = `${CACHE_PREFIX}:desa:${cleanId}`;
    const cached = this.getFromCache<WilayahDesa[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }

    let list: WilayahDesa[] = [];

    // 1. Coba baca dari Cloud Firestore
    if (db) {
      try {
        const colRef = collection(db, 'wilayah_desa');
        const q = query(
          colRef, 
          where('kecamatan_id', '==', cleanId)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && typeof d.nama === 'string') {
            list.push({
              id: String(d.id || docSnap.id),
              kecamatan_id: String(d.kecamatan_id || cleanId),
              kabupaten_id: String(d.kabupaten_id || ''),
              provinsi_id: String(d.provinsi_id || ''),
              nama: String(d.nama)
            });
          }
        });
      } catch (err) {
        console.info(`[WilayahService] Firestore getDesa(${cleanId}) offline/unavailable, beralih ke fallback canonical.`);
      }
    }

    // 2. Fallback jika Firestore kosong atau error
    if (list.length === 0 && fallbackWilayahData.villages) {
      list = fallbackWilayahData.villages
        .filter((v: any) => String(v.kecamatan_id) === cleanId)
        .map((v: any) => ({
          id: String(v.id),
          kecamatan_id: String(v.kecamatan_id || cleanId),
          kabupaten_id: String(v.kabupaten_id || ''),
          provinsi_id: String(v.provinsi_id || ''),
          nama: String(v.nama)
        }));
    }

    list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    if (list.length > 0) {
      this.saveToCache(cacheKey, list);
    }
    return list;
  }

  /**
   * Helper untuk membersihkan cache wilayah secara manual jika dibutuhkan
   */
  clearCache(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn('[WilayahService] Error clearing cache:', err);
    }
  }
}

export const wilayahService = new WilayahService();
