/**
 * SOURCE ADAPTER
 * Adapter interface and implementation for source dataset (ibnux/data-indonesia).
 * Designed for modularity: any alternate source (e.g. Kemendagri CSV/API) can implement RegionSourceAdapter.
 */

import {
  CanonicalProvince,
  CanonicalRegency,
  CanonicalDistrict,
  CanonicalVillage
} from './types';
import { normalizeCode, normalizeName, detectRegencyType } from './normalizer';

export interface RawIbnuxItem {
  id: string | number;
  nama: string;
  latitude?: number;
  longitude?: number;
}

export interface RegionSourceAdapter {
  name: string;
  fetchProvinces(): Promise<CanonicalProvince[]>;
  fetchRegencies(provinceId: string): Promise<CanonicalRegency[]>;
  fetchDistricts(regencyId: string, provinceId: string): Promise<CanonicalDistrict[]>;
  fetchVillages(districtId: string, regencyId: string, provinceId: string): Promise<CanonicalVillage[]>;
}

export class IbnuxOnlineAdapter implements RegionSourceAdapter {
  name = 'ibnux/data-indonesia (online raw.githubusercontent.com)';
  private baseUrl = 'https://raw.githubusercontent.com/ibnux/data-indonesia/master';

  private async fetchJson<T>(path: string): Promise<T[]> {
    const url = `${this.baseUrl}/${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T[];
    } catch (err: any) {
      throw new Error(`Failed to parse JSON from ${url}: ${err?.message}`);
    }
  }

  async fetchProvinces(): Promise<CanonicalProvince[]> {
    const raw = await this.fetchJson<RawIbnuxItem>('provinsi.json');
    return raw.map(item => ({
      id: normalizeCode(item.id),
      name: normalizeName(item.nama),
    }));
  }

  async fetchRegencies(provinceId: string): Promise<CanonicalRegency[]> {
    const normProvId = normalizeCode(provinceId);
    const raw = await this.fetchJson<RawIbnuxItem>(`kabupaten/${normProvId}.json`);
    return raw.map(item => {
      const id = normalizeCode(item.id);
      const name = normalizeName(item.nama);
      return {
        id,
        provinceId: normProvId,
        name,
        type: detectRegencyType(name),
      };
    });
  }

  async fetchDistricts(regencyId: string, provinceId: string): Promise<CanonicalDistrict[]> {
    const normRegId = normalizeCode(regencyId);
    const normProvId = normalizeCode(provinceId);
    const raw = await this.fetchJson<RawIbnuxItem>(`kecamatan/${normRegId}.json`);
    return raw.map(item => ({
      id: normalizeCode(item.id),
      regencyId: normRegId,
      provinceId: normProvId,
      name: normalizeName(item.nama),
    }));
  }

  async fetchVillages(districtId: string, regencyId: string, provinceId: string): Promise<CanonicalVillage[]> {
    const normDistId = normalizeCode(districtId);
    const normRegId = normalizeCode(regencyId);
    const normProvId = normalizeCode(provinceId);
    const raw = await this.fetchJson<RawIbnuxItem>(`kelurahan/${normDistId}.json`);
    return raw.map(item => ({
      id: normalizeCode(item.id),
      districtId: normDistId,
      regencyId: normRegId,
      provinceId: normProvId,
      name: normalizeName(item.nama),
    }));
  }
}
