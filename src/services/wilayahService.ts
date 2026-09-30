// Master Data Wilayah Sulawesi Utara

export interface WilayahNode {
  id: string;
  nama: string;
}

export const PROVINSI_LIST: WilayahNode[] = [
  { id: '71', nama: 'SULAWESI UTARA' },
  { id: '72', nama: 'SULAWESI TENGAH' },
  { id: '73', nama: 'SULAWESI SELATAN' },
  { id: '75', nama: 'GORONTALO' }
];

export const KABUPATEN_MAP: Record<string, WilayahNode[]> = {
  '71': [
    { id: '7171', nama: 'KOTA MANADO' },
    { id: '7172', nama: 'KOTA BITUNG' },
    { id: '7173', nama: 'KOTA TOMOHON' },
    { id: '7174', nama: 'KOTA KOTAMOBAGU' },
    { id: '7102', nama: 'KABUPATEN MINAHASA' },
    { id: '7106', nama: 'KABUPATEN MINAHASA UTARA' },
    { id: '7105', nama: 'KABUPATEN MINAHASA SELATAN' },
    { id: '7109', nama: 'KABUPATEN MINAHASA TENGGARA' }
  ]
};

export const KECAMATAN_MAP: Record<string, WilayahNode[]> = {
  '7171': [
    { id: '7171010', nama: 'WENANG' },
    { id: '7171020', nama: 'TUMINTING' },
    { id: '7171030', nama: 'MALALAYANG' },
    { id: '7171040', nama: 'SARIO' },
    { id: '7171050', nama: 'WANEA' },
    { id: '7171060', nama: 'MAPANGET' },
    { id: '7171070', nama: 'TIKALA' },
    { id: '7171080', nama: 'SINGKIL' },
    { id: '7171100', nama: 'PAAL DUA' }
  ],
  '7173': [
    { id: '7173010', nama: 'TOMOHON UTARA' },
    { id: '7173020', nama: 'TOMOHON SELATAN' },
    { id: '7173030', nama: 'TOMOHON TENGAH' },
    { id: '7173040', nama: 'TOMOHON TIMUR' },
    { id: '7173050', nama: 'TOMOHON BARAT' }
  ],
  '7172': [
    { id: '7172010', nama: 'MADIDIR' },
    { id: '7172020', nama: 'MATUARI' },
    { id: '7172030', nama: 'GIRIAN' },
    { id: '7172040', nama: 'AERTIMBAGA' },
    { id: '7172050', nama: 'RANOWULU' }
  ]
};

export const DESA_MAP: Record<string, WilayahNode[]> = {
  '7171010': [
    { id: '7171010001', nama: 'Bumi Beringin' },
    { id: '7171010002', nama: 'Komo Luar' },
    { id: '7171010003', nama: 'Pinaesaan' },
    { id: '7171010004', nama: 'Teling Bawah' },
    { id: '7171010005', nama: 'Wenang Selatan' },
    { id: '7171010006', nama: 'Wenang Utara' }
  ],
  '7171020': [
    { id: '7171020001', nama: 'Bitung Karangria' },
    { id: '7171020002', nama: 'Islam' },
    { id: '7171020003', nama: 'Maasing' },
    { id: '7171020004', nama: 'Mahawu' },
    { id: '7171020005', nama: 'Sindulang Satu' },
    { id: '7171020006', nama: 'Sindulang Dua' },
    { id: '7171020007', nama: 'Tuminting' },
    { id: '7171020008', nama: 'Tumumpa Satu' },
    { id: '7171020009', nama: 'Tumumpa Dua' }
  ],
  '7171030': [
    { id: '7171030001', nama: 'Bahu' },
    { id: '7171030002', nama: 'Batu Kota' },
    { id: '7171030003', nama: 'Kleak' },
    { id: '7171030004', nama: 'Malalayang Satu' },
    { id: '7171030005', nama: 'Malalayang Satu Barat' },
    { id: '7171030006', nama: 'Malalayang Satu Timur' },
    { id: '7171030007', nama: 'Malalayang Dua' },
    { id: '7171030008', nama: 'Winangun Satu' },
    { id: '7171030009', nama: 'Winangun Dua' }
  ],
  '7171040': [
    { id: '7171040001', nama: 'Ranotana' },
    { id: '7171040002', nama: 'Sario' },
    { id: '7171040003', nama: 'Sario Kotabaru' },
    { id: '7171040004', nama: 'Sario Tumpaan' },
    { id: '7171040005', nama: 'Sario Utara' },
    { id: '7171040006', nama: 'Titiwungen Selatan' },
    { id: '7171040007', nama: 'Titiwungen Utara' }
  ],
  '7171050': [
    { id: '7171050001', nama: 'Bumi Nyiur' },
    { id: '7171050002', nama: 'Karombasan Selatan' },
    { id: '7171050003', nama: 'Karombasan Utara' },
    { id: '7171050004', nama: 'Pakowa' },
    { id: '7171050005', nama: 'Ranotana Weru' },
    { id: '7171050006', nama: 'Tanjung Batu' },
    { id: '7171050007', nama: 'Tingkulu' },
    { id: '7171050008', nama: 'Teling Atas' },
    { id: '7171050009', nama: 'Wanea' }
  ],
  '7171060': [
    { id: '7171060001', nama: 'Bengkol' },
    { id: '7171060002', nama: 'Buha' },
    { id: '7171060003', nama: 'Kairagi Satu' },
    { id: '7171060004', nama: 'Kairagi Dua' },
    { id: '7171060005', nama: 'Kima Atas' },
    { id: '7171060006', nama: 'Lapangan' },
    { id: '7171060007', nama: 'Paniki Bawah' },
    { id: '7171060008', nama: 'Paniki Satu' },
    { id: '7171060009', nama: 'Paniki Dua' }
  ],
  '7171070': [
    { id: '7171070001', nama: 'Banjer' },
    { id: '7171070002', nama: 'Paal IV' },
    { id: '7171070003', nama: 'Taas' },
    { id: '7171070004', nama: 'Tikala Ares' },
    { id: '7171070005', nama: 'Tikala Baru' }
  ],
  '7171080': [
    { id: '7171080001', nama: 'Karame' },
    { id: '7171080002', nama: 'Ketang Baru' },
    { id: '7171080003', nama: 'Kombos Barat' },
    { id: '7171080004', nama: 'Kombos Timur' },
    { id: '7171080005', nama: 'Singkil Satu' },
    { id: '7171080006', nama: 'Singkil Dua' },
    { id: '7171080007', nama: 'Ternate Baru' },
    { id: '7171080008', nama: 'Ternate Tanjung' },
    { id: '7171080009', nama: 'Wawonasa' }
  ],
  '7171100': [
    { id: '7171100001', nama: 'Dendengan Dalam' },
    { id: '7171100002', nama: 'Dendengan Luar' },
    { id: '7171100003', nama: 'Kairagi Weru' },
    { id: '7171100004', nama: 'Malendeng' },
    { id: '7171100005', nama: 'Paal Dua' },
    { id: '7171100006', nama: 'Perkamil' },
    { id: '7171100007', nama: 'Ranomuut' }
  ]
};

export class WilayahService {
  static getProvinsi(): WilayahNode[] {
    return PROVINSI_LIST;
  }

  static getKabupaten(provinsiId: string): WilayahNode[] {
    return KABUPATEN_MAP[provinsiId] || [];
  }

  static getKecamatan(kabupatenId: string): WilayahNode[] {
    return KECAMATAN_MAP[kabupatenId] || [];
  }

  static getDesa(kecamatanId: string): WilayahNode[] {
    return DESA_MAP[kecamatanId] || [];
  }

  static getKabupatenByProvinsiId(provinsiId: string): WilayahNode[] {
    return this.getKabupaten(provinsiId);
  }

  static getKecamatanByKabupatenId(kabupatenId: string): WilayahNode[] {
    return this.getKecamatan(kabupatenId);
  }

  static getDesaByKecamatanId(kecamatanId: string): WilayahNode[] {
    return this.getDesa(kecamatanId);
  }

  static getFormattedName(provinsiId?: string, kabupatenId?: string, kecamatanId?: string, desaId?: string): string {
    const prov = PROVINSI_LIST.find(p => p.id === provinsiId)?.nama || '';
    const kab = kabupatenId && provinsiId ? (KABUPATEN_MAP[provinsiId]?.find(k => k.id === kabupatenId)?.nama || '') : '';
    const kec = kecamatanId && kabupatenId ? (KECAMATAN_MAP[kabupatenId]?.find(k => k.id === kecamatanId)?.nama || '') : '';
    const desa = desaId && kecamatanId ? (DESA_MAP[kecamatanId]?.find(d => d.id === desaId)?.nama || '') : '';

    return [desa, kec, kab, prov].filter(Boolean).join(', ');
  }
}

export const wilayahService = WilayahService;

