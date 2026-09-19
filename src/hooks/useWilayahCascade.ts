import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  WilayahProvinsi, 
  WilayahKabupaten, 
  WilayahKecamatan, 
  WilayahDesa,
  SelectedWilayahState 
} from '../types';
import { wilayahService } from '../services/wilayahService';

export interface UseWilayahCascadeOptions {
  initialValues?: Partial<SelectedWilayahState>;
  onChange?: (state: SelectedWilayahState) => void;
}

export interface UseWilayahCascadeReturn {
  // Lists
  provinsiList: WilayahProvinsi[];
  kabupatenList: WilayahKabupaten[];
  kecamatanList: WilayahKecamatan[];
  desaList: WilayahDesa[];

  // Selected values
  selectedState: SelectedWilayahState;

  // Loading states
  loadingProvinsi: boolean;
  loadingKabupaten: boolean;
  loadingKecamatan: boolean;
  loadingDesa: boolean;

  // Error states
  error: string | null;

  // Handlers
  setProvinsi: (id: string) => void;
  setKabupaten: (id: string) => void;
  setKecamatan: (id: string) => void;
  setDesa: (id: string) => void;
  resetAll: () => void;
}

export function useWilayahCascade(options: UseWilayahCascadeOptions = {}): UseWilayahCascadeReturn {
  const { initialValues, onChange } = options;

  const [selectedState, setSelectedState] = useState<SelectedWilayahState>({
    provinsiId: initialValues?.provinsiId || '',
    kabupatenId: initialValues?.kabupatenId || '',
    kecamatanId: initialValues?.kecamatanId || '',
    desaId: initialValues?.desaId || '',
    provinsiNama: initialValues?.provinsiNama || '',
    kabupatenNama: initialValues?.kabupatenNama || '',
    kecamatanNama: initialValues?.kecamatanNama || '',
    desaNama: initialValues?.desaNama || '',
  });

  const [provinsiList, setProvinsiList] = useState<WilayahProvinsi[]>([]);
  const [kabupatenList, setKabupatenList] = useState<WilayahKabupaten[]>([]);
  const [kecamatanList, setKecamatanList] = useState<WilayahKecamatan[]>([]);
  const [desaList, setDesaList] = useState<WilayahDesa[]>([]);

  const [loadingProvinsi, setLoadingProvinsi] = useState<boolean>(false);
  const [loadingKabupaten, setLoadingKabupaten] = useState<boolean>(false);
  const [loadingKecamatan, setLoadingKecamatan] = useState<boolean>(false);
  const [loadingDesa, setLoadingDesa] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  // Request sequence guards untuk mencegah race condition (out-of-order response)
  const reqSeqRef = useRef({
    provinsi: 0,
    kabupaten: 0,
    kecamatan: 0,
    desa: 0,
  });

  // 1. Initial load: hanya load Provinsi saat mount
  useEffect(() => {
    let isMounted = true;
    const currentSeq = ++reqSeqRef.current.provinsi;

    async function loadProvinsi() {
      setLoadingProvinsi(true);
      setError(null);
      try {
        const data = await wilayahService.getProvinsi();
        if (isMounted && currentSeq === reqSeqRef.current.provinsi) {
          setProvinsiList(data);
        }
      } catch (err: any) {
        if (isMounted && currentSeq === reqSeqRef.current.provinsi) {
          console.error('[useWilayahCascade] Gagal memuat provinsi:', err);
          setError('Gagal memuat daftar provinsi. Pastikan koneksi internet stabil.');
        }
      } finally {
        if (isMounted && currentSeq === reqSeqRef.current.provinsi) {
          setLoadingProvinsi(false);
        }
      }
    }

    loadProvinsi();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Cascade load: Kabupaten saat provinsiId berubah
  useEffect(() => {
    let isMounted = true;
    const currentSeq = ++reqSeqRef.current.kabupaten;
    const provId = selectedState.provinsiId;

    if (!provId) {
      setKabupatenList([]);
      return;
    }

    async function loadKabupaten() {
      setLoadingKabupaten(true);
      setError(null);
      try {
        const data = await wilayahService.getKabupatenByProvinsiId(provId);
        if (isMounted && currentSeq === reqSeqRef.current.kabupaten) {
          setKabupatenList(data);
        }
      } catch (err: any) {
        if (isMounted && currentSeq === reqSeqRef.current.kabupaten) {
          console.error(`[useWilayahCascade] Gagal memuat kabupaten (${provId}):`, err);
          setError('Gagal memuat daftar kabupaten/kota.');
        }
      } finally {
        if (isMounted && currentSeq === reqSeqRef.current.kabupaten) {
          setLoadingKabupaten(false);
        }
      }
    }

    loadKabupaten();

    return () => {
      isMounted = false;
    };
  }, [selectedState.provinsiId]);

  // 3. Cascade load: Kecamatan saat kabupatenId berubah
  useEffect(() => {
    let isMounted = true;
    const currentSeq = ++reqSeqRef.current.kecamatan;
    const kabId = selectedState.kabupatenId;

    if (!kabId) {
      setKecamatanList([]);
      return;
    }

    async function loadKecamatan() {
      setLoadingKecamatan(true);
      setError(null);
      try {
        const data = await wilayahService.getKecamatanByKabupatenId(kabId);
        if (isMounted && currentSeq === reqSeqRef.current.kecamatan) {
          setKecamatanList(data);
        }
      } catch (err: any) {
        if (isMounted && currentSeq === reqSeqRef.current.kecamatan) {
          console.error(`[useWilayahCascade] Gagal memuat kecamatan (${kabId}):`, err);
          setError('Gagal memuat daftar kecamatan.');
        }
      } finally {
        if (isMounted && currentSeq === reqSeqRef.current.kecamatan) {
          setLoadingKecamatan(false);
        }
      }
    }

    loadKecamatan();

    return () => {
      isMounted = false;
    };
  }, [selectedState.kabupatenId]);

  // 4. Cascade load: Desa saat kecamatanId berubah
  useEffect(() => {
    let isMounted = true;
    const currentSeq = ++reqSeqRef.current.desa;
    const kecId = selectedState.kecamatanId;

    if (!kecId) {
      setDesaList([]);
      return;
    }

    async function loadDesa() {
      setLoadingDesa(true);
      setError(null);
      try {
        const data = await wilayahService.getDesaByKecamatanId(kecId);
        if (isMounted && currentSeq === reqSeqRef.current.desa) {
          setDesaList(data);
        }
      } catch (err: any) {
        if (isMounted && currentSeq === reqSeqRef.current.desa) {
          console.error(`[useWilayahCascade] Gagal memuat desa (${kecId}):`, err);
          setError('Gagal memuat daftar desa/kelurahan.');
        }
      } finally {
        if (isMounted && currentSeq === reqSeqRef.current.desa) {
          setLoadingDesa(false);
        }
      }
    }

    loadDesa();

    return () => {
      isMounted = false;
    };
  }, [selectedState.kecamatanId]);

  // Handler: Set Provinsi (Otomatis reset Kabupaten, Kecamatan, Desa)
  const setProvinsi = useCallback((id: string) => {
    const cleanId = String(id || '').trim();
    const item = provinsiList.find((p) => p.id === cleanId);
    
    setSelectedState((prev) => {
      const next: SelectedWilayahState = {
        provinsiId: cleanId,
        provinsiNama: item?.nama || '',
        // Reset cascading children
        kabupatenId: '',
        kabupatenNama: '',
        kecamatanId: '',
        kecamatanNama: '',
        desaId: '',
        desaNama: '',
      };
      onChange?.(next);
      return next;
    });
  }, [provinsiList, onChange]);

  // Handler: Set Kabupaten (Otomatis reset Kecamatan & Desa)
  const setKabupaten = useCallback((id: string) => {
    const cleanId = String(id || '').trim();
    const item = kabupatenList.find((k) => k.id === cleanId);

    setSelectedState((prev) => {
      const next: SelectedWilayahState = {
        ...prev,
        kabupatenId: cleanId,
        kabupatenNama: item?.nama || '',
        // Reset cascading children
        kecamatanId: '',
        kecamatanNama: '',
        desaId: '',
        desaNama: '',
      };
      onChange?.(next);
      return next;
    });
  }, [kabupatenList, onChange]);

  // Handler: Set Kecamatan (Otomatis reset Desa)
  const setKecamatan = useCallback((id: string) => {
    const cleanId = String(id || '').trim();
    const item = kecamatanList.find((kc) => kc.id === cleanId);

    setSelectedState((prev) => {
      const next: SelectedWilayahState = {
        ...prev,
        kecamatanId: cleanId,
        kecamatanNama: item?.nama || '',
        // Reset cascading child
        desaId: '',
        desaNama: '',
      };
      onChange?.(next);
      return next;
    });
  }, [kecamatanList, onChange]);

  // Handler: Set Desa
  const setDesa = useCallback((id: string) => {
    const cleanId = String(id || '').trim();
    const item = desaList.find((d) => d.id === cleanId);

    setSelectedState((prev) => {
      const next: SelectedWilayahState = {
        ...prev,
        desaId: cleanId,
        desaNama: item?.nama || '',
      };
      onChange?.(next);
      return next;
    });
  }, [desaList, onChange]);

  // Handler: Reset All
  const resetAll = useCallback(() => {
    const empty: SelectedWilayahState = {
      provinsiId: '',
      kabupatenId: '',
      kecamatanId: '',
      desaId: '',
      provinsiNama: '',
      kabupatenNama: '',
      kecamatanNama: '',
      desaNama: '',
    };
    setSelectedState(empty);
    setKabupatenList([]);
    setKecamatanList([]);
    setDesaList([]);
    onChange?.(empty);
  }, [onChange]);

  return {
    provinsiList,
    kabupatenList,
    kecamatanList,
    desaList,
    selectedState,
    loadingProvinsi,
    loadingKabupaten,
    loadingKecamatan,
    loadingDesa,
    error,
    setProvinsi,
    setKabupaten,
    setKecamatan,
    setDesa,
    resetAll,
  };
}
