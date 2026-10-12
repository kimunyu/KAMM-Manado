import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { User } from '../../../types';
import { 
  JobVacancy, 
  JobApplicant, 
  WilayahPenempatan, 
  MasterPosisiLowongan, 
  WILAYAH_PENEMPATAN_MAPPING, 
  MASTER_POSISI_LIST,
  CvChunk,
  StatusLamaran
} from '../types';

const VACANCIES_COLLECTION = 'job_vacancies';
const APPLICANTS_COLLECTION = 'job_applicants';
const CV_CHUNKS_COLLECTION = 'cv_chunks';

// Helper to sanitize doc IDs
export const getVacancyDocId = (wilayah: WilayahPenempatan, posisi: MasterPosisiLowongan): string => {
  const safePos = posisi.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `${wilayah}_${safePos}`;
};

// Generates registration number: REG-YYYYMM-XXXX
export const generateNomorRegistrasi = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REG-${year}${month}-${randomSuffix}`;
};

// Base64 to Blob helper
export const base64ToBlob = (base64Data: string, contentType: string = 'application/pdf'): Blob => {
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const byteCharacters = atob(cleanBase64);
  const byteArrays: Uint8Array[] = [];

  const sliceSize = 1024;
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays as BlobPart[], { type: contentType });
};

// Convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Compress Photo in Browser
export const compressImage = (file: File, maxWidth = 600, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const RekrutmenService = {
  // -------------------------------------------------------------
  // 1. MANAJEMEN LOWONGAN (JOB VACANCIES)
  // -------------------------------------------------------------
  
  // Real-time listener for vacancies
  subscribeVacancies: (callback: (vacancies: JobVacancy[]) => void): (() => void) => {
    if (!db) {
      callback([]);
      return () => {};
    }

    try {
      const colRef = collection(db, VACANCIES_COLLECTION);
      return onSnapshot(colRef, (snapshot) => {
        const list: JobVacancy[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as JobVacancy), id: docSnap.id });
        });
        callback(list);
      }, (error) => {
        console.warn('[HRD-REKRUTMEN] Gagal subscribe vacancies:', error);
        callback([]);
      });
    } catch (e) {
      console.warn('[HRD-REKRUTMEN] Exception subscribe vacancies:', e);
      callback([]);
      return () => {};
    }
  },

  // Toggle or update status lowongan
  setVacancyStatus: async (
    wilayah: WilayahPenempatan,
    posisi: MasterPosisiLowongan,
    isActive: boolean,
    user: User,
    keterangan?: string
  ): Promise<void> => {
    if (!db) throw new Error('Database Firestore tidak terhubung');

    const mapping = WILAYAH_PENEMPATAN_MAPPING[wilayah];
    const docId = getVacancyDocId(wilayah, posisi);
    const docRef = doc(db, VACANCIES_COLLECTION, docId);

    const payload: JobVacancy = {
      id: docId,
      wilayah,
      posisi,
      kd_cabang: mapping.kd_cabang,
      kd_posko: mapping.kd_posko,
      is_active: isActive,
      keterangan: keterangan || '',
      updated_at: new Date().toISOString(),
      updated_by_uid: user.id,
      updated_by_name: user.nama
    };

    await setDoc(docRef, payload, { merge: true });
  },

  // Ambil daftar posisi yang AKTIF untuk wilayah tertentu (Portal Pelamar)
  getActivePositionsForWilayah: async (wilayah: WilayahPenempatan): Promise<MasterPosisiLowongan[]> => {
    if (!db) return [];
    try {
      const colRef = collection(db, VACANCIES_COLLECTION);
      const q = query(
        colRef, 
        where('wilayah', '==', wilayah),
        where('is_active', '==', true)
      );
      const snap = await getDocs(q);
      const activePositions: MasterPosisiLowongan[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as JobVacancy;
        if (data.is_active && !activePositions.includes(data.posisi)) {
          activePositions.push(data.posisi);
        }
      });
      return activePositions;
    } catch (err) {
      console.warn('[HRD-REKRUTMEN] Gagal getActivePositionsForWilayah:', err);
      return [];
    }
  },

  // Inisialisasi default data lowongan jika masih kosong (Opsional helper)
  ensureDefaultVacancies: async (user: User): Promise<void> => {
    if (!db) return;
    try {
      const colRef = collection(db, VACANCIES_COLLECTION);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        const batch = writeBatch(db);
        const wilayahList: WilayahPenempatan[] = ['RANOTANA', 'TUMINTING', 'BITUNG', 'TONDANO', 'LANGOWAN'];
        
        for (const wil of wilayahList) {
          const mapping = WILAYAH_PENEMPATAN_MAPPING[wil];
          for (const pos of MASTER_POSISI_LIST) {
            const docId = getVacancyDocId(wil, pos);
            const ref = doc(db, VACANCIES_COLLECTION, docId);
            // Default: CMO dan Kolektor dibuka awal
            const defaultOpen = pos === 'CMO (Credit Marketing Officer)' || pos === 'Kolektor/Jasa Penagihan';
            batch.set(ref, {
              id: docId,
              wilayah: wil,
              posisi: pos,
              kd_cabang: mapping.kd_cabang,
              kd_posko: mapping.kd_posko,
              is_active: defaultOpen,
              keterangan: defaultOpen ? 'Dibuka secara default' : 'Belum dibuka',
              updated_at: new Date().toISOString(),
              updated_by_uid: user.id,
              updated_by_name: user.nama
            });
          }
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('[HRD-REKRUTMEN] ensureDefaultVacancies error:', err);
    }
  },

  // -------------------------------------------------------------
  // 2. FORMULIR PELAMAR (APPLICANT SUBMISSION - PUBLIC & ISOLATED)
  // -------------------------------------------------------------

  submitApplicant: async (
    data: Omit<JobApplicant, 'id' | 'nomor_registrasi' | 'tgl_daftar' | 'status'>,
    pdfFile: File
  ): Promise<{ id: string; nomor_registrasi: string }> => {
    if (!db) throw new Error('Koneksi sistem rekrutmen tidak tersedia saat ini.');

    // 1. Validasi File PDF ketat
    if (!pdfFile.name.toLowerCase().endsWith('.pdf') && pdfFile.type !== 'application/pdf') {
      throw new Error('Berkas CV wajib berformat PDF (.pdf)');
    }
    const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
    if (pdfFile.size > maxSizeBytes) {
      throw new Error('Ukuran file CV melebihi batas maksimal 2 MB');
    }

    // 2. Generate applicant doc ref & registration number
    const applicantsCol = collection(db, APPLICANTS_COLLECTION);
    const applicantDocRef = doc(applicantsCol);
    const applicantId = applicantDocRef.id;
    const nomorRegistrasi = generateNomorRegistrasi();
    const nowIso = new Date().toISOString();

    // 3. Baca PDF File ke Base64
    const pdfBase64Raw = await fileToBase64(pdfFile);
    // Simpan string base64 murni
    const pdfBase64Clean = pdfBase64Raw.includes(',') ? pdfBase64Raw.split(',')[1] : pdfBase64Raw;

    // Batas aman ukuran field dalam 1 dokumen Firestore adalah ~650 KB base64 (~480 KB binary).
    // Jika ukuran base64 > 650.000 karakter, pecah menjadi chunks ke subcollection cv_chunks
    const CHUNK_SIZE = 500000; // ~500 KB per chunk
    const needsChunking = pdfBase64Clean.length > CHUNK_SIZE;

    const applicantPayload: JobApplicant = {
      ...data,
      id: applicantId,
      nomor_registrasi: nomorRegistrasi,
      tgl_daftar: nowIso,
      status: 'BARU',
      cv_file_name: pdfFile.name,
      cv_file_size: pdfFile.size,
      cv_mime_type: 'application/pdf',
      cv_has_chunks: needsChunking,
      cv_total_chunks: needsChunking ? Math.ceil(pdfBase64Clean.length / CHUNK_SIZE) : 1,
      // Jika kecil, simpan langsung di dokumen induk
      cv_base64: needsChunking ? '' : pdfBase64Clean
    };

    if (!needsChunking) {
      await setDoc(applicantDocRef, applicantPayload);
    } else {
      // Simpan dokumen utama dulu
      await setDoc(applicantDocRef, applicantPayload);

      // Simpan chunks di subcollection
      const totalChunks = applicantPayload.cv_total_chunks || 1;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunkData = pdfBase64Clean.slice(start, end);

        const chunkDocRef = doc(applicantDocRef, CV_CHUNKS_COLLECTION, String(i));
        const chunkPayload: CvChunk = {
          chunk_index: i,
          total_chunks: totalChunks,
          data: chunkData
        };
        await setDoc(chunkDocRef, chunkPayload);
      }
    }

    return {
      id: applicantId,
      nomor_registrasi: nomorRegistrasi
    };
  },

  // -------------------------------------------------------------
  // 3. MONITORING & PENGELOLAAN PELAMAR (INTERNAL DASHBOARD)
  // -------------------------------------------------------------

  subscribeApplicants: (
    currentUser: User | null,
    callback: (applicants: JobApplicant[]) => void
  ): (() => void) => {
    if (!db || !currentUser) {
      callback([]);
      return () => {};
    }

    try {
      const colRef = collection(db, APPLICANTS_COLLECTION);
      // Urutkan berdasarkan tanggal pendaftaran terbaru
      const q = query(colRef, orderBy('tgl_daftar', 'desc'));

      return onSnapshot(q, (snapshot) => {
        const list: JobApplicant[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...(docSnap.data() as JobApplicant), id: docSnap.id });
        });

        // Filter otoritas wilayah per role (KAOPS & KACAB hanya wilayah cabangnya)
        const isNational = ['SUPER_ADMIN', 'RM', 'ADM_DE'].includes(currentUser.role);
        if (isNational) {
          callback(list);
        } else if (currentUser.kd_cabang) {
          const userCab = currentUser.kd_cabang.trim().toUpperCase();
          const filtered = list.filter((item) => {
            return item.kd_cabang?.trim().toUpperCase() === userCab;
          });
          callback(filtered);
        } else {
          callback(list);
        }
      }, (err) => {
        console.warn('[HRD-REKRUTMEN] Gagal subscribe applicants:', err);
        callback([]);
      });
    } catch (e) {
      console.warn('[HRD-REKRUTMEN] Exception subscribe applicants:', e);
      callback([]);
      return () => {};
    }
  },

  // Download / Ambil file CV PDF lengkap sebagai Blob
  getApplicantCvBlob: async (applicant: JobApplicant): Promise<Blob> => {
    if (!db) throw new Error('Database Firestore tidak terhubung');

    // Jika base64 tersimpan di dokumen utama
    if (applicant.cv_base64 && applicant.cv_base64.length > 0) {
      return base64ToBlob(applicant.cv_base64, 'application/pdf');
    }

    // Jika dipecah dalam chunks di subcollection
    const applicantDocRef = doc(db, APPLICANTS_COLLECTION, applicant.id);
    const chunksColRef = collection(applicantDocRef, CV_CHUNKS_COLLECTION);
    const snap = await getDocs(chunksColRef);

    if (snap.empty) {
      throw new Error('Berkas CV fisik tidak ditemukan atau telah dibersihkan');
    }

    const chunkItems: CvChunk[] = [];
    snap.forEach((docSnap) => {
      chunkItems.push(docSnap.data() as CvChunk);
    });

    // Urutkan berdasarkan chunk_index
    chunkItems.sort((a, b) => a.chunk_index - b.chunk_index);
    const fullBase64 = chunkItems.map(c => c.data).join('');

    return base64ToBlob(fullBase64, 'application/pdf');
  },

  // Buka CV langsung di tab baru browser
  previewCvInNewTab: async (applicant: JobApplicant): Promise<void> => {
    const blob = await RekrutmenService.getApplicantCvBlob(applicant);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  },

  // Update status seleksi pelamar
  updateApplicantStatus: async (
    applicantId: string,
    newStatus: StatusLamaran,
    catatanInterview: string | undefined,
    user: User
  ): Promise<void> => {
    if (!db) throw new Error('Database Firestore tidak terhubung');
    const docRef = doc(db, APPLICANTS_COLLECTION, applicantId);
    
    const updates: Partial<JobApplicant> = {
      status: newStatus,
      reviewed_by_name: user.nama,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (catatanInterview !== undefined) {
      updates.catatan_interview = catatanInterview;
    }

    await updateDoc(docRef, updates);
  },

  // Bersihkan berkas fisik (CV & Foto) dari pelamar untuk menghemat ruang penyimpanan
  purgeApplicantFilesOnly: async (applicantId: string): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, APPLICANTS_COLLECTION, applicantId);
    
    // Hapus chunks di subcollection jika ada
    const chunksColRef = collection(docRef, CV_CHUNKS_COLLECTION);
    const snap = await getDocs(chunksColRef);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    // Kosongkan base64 di doc utama
    await updateDoc(docRef, {
      cv_base64: '',
      pas_foto_base64: '',
      cv_file_name: '[BERKAS DIBERSIHKAN]',
      updated_at: new Date().toISOString()
    });
  },

  // Hapus seluruh data pelamar
  deleteApplicant: async (applicantId: string): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, APPLICANTS_COLLECTION, applicantId);
    
    // Hapus subcollection chunks
    const chunksColRef = collection(docRef, CV_CHUNKS_COLLECTION);
    const snap = await getDocs(chunksColRef);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }

    await deleteDoc(docRef);
  },

  // Generator Link WhatsApp Resmi Rekrutmen KAMM
  createWhatsAppLink: (applicant: JobApplicant, companyName: string = 'KSP Anugrah Mega Mandiri'): string => {
    let cleanPhone = applicant.no_wa.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const pesan = `Halo Sdr/i *${applicant.nama_lengkap}*,\n\nKami dari Tim Rekrutmen *${companyName}* sehubungan dengan lamaran kerja Anda untuk posisi *${applicant.posisi_dilamar}* wilayah penempatan *${applicant.wilayah_penempatan}* (No. Registrasi: ${applicant.nomor_registrasi}).\n\nKami ingin mengundang Anda untuk tahapan seleksi berikutnya.\nMohon konfirmasi ketersediaan Anda. Terima kasih.`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pesan)}`;
  }
};
