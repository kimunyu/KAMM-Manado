# KETETAPAN DAN PEDOMAN PENGEMBANGAN SISTEM (KAMM MANADO)

Dokumen ini merupakan ketetapan resmi dan standar baku pengembangan untuk aplikasi **KAMM Manado (Kredit Pintar / Mega Auto Finance / Mediator & Sales Management System)**.

---

## 1. Larangan Mutlak Redesign Mandiri (*No Unsolicited Redesign*)
- **DILARANG KERAS** melakukan perombakan tata letak, penyederhanaan fitur (*dumbing down / mock fallback*), atau penggantian komponen antarmuka secara mandiri.
- Seluruh tata visual, tema warna (`#0c0e12`, `#13151c`, `#1e2230`, aksen cyan/indigo/emerald), tipografi, status badges, struktur tabel, pipeline Kanban, kartu metrik, serta modal form **HARUS SELALU DIPERTAHANKAN** sesuai standar desain resmi yang ada di repositori GitHub.
- Tidak diperkenankan menghapus atau menyusutkan fitur yang sudah ada demi mempercepat kompilasi.

---

## 2. Repositori GitHub Sebagai Sumber Kebenaran Tunggal (*Source of Truth*)
- Referensi utama arsitektur dan fungsionalitas sistem adalah repositori GitHub **`kimunyu/KAMM-Manado`**.
- Setiap modifikasi hanya boleh berupa:
  1. Perbaikan bug spesifik (*targeted bug fixing*).
  2. Implementasi fitur atau logika baru yang **diminta secara eksplisit** oleh pengguna.
  3. Pemeliharaan integrasi backend/database (Firestore, LocalStorage fallback, RBAC) tanpa merusak skema yang sudah ada.

---

## 3. Preservasi Modul Fungsional Utuh
Aplikasi KAMM Manado terdiri atas ekosistem modul terintegrasi yang harus selalu aktif dan utuh:
1. **Sales Acquisition Module**:
   - Tampilan Pipeline Board (Kanban interaktif dengan stage: New Lead, Contacted, Visit / Survey, Appraisal, Pengajuan, Approval, Cair, Tolak / Batal).
   - Tampilan Tabel Prospek dengan filtering cabang, posko, AO/CMO, search, pagination, export, dan quick actions.
   - Quick Entry Modal dengan validasi wilayah cascade dan status jaminan.
   - Modal Konversi Cair, Reassign CMO, Tolak/Batal, dan Detail Riwayat Prospek.
2. **Kontrol Sales Module**:
   - Dashboard Rekap, Input Sales, Validasi Sales Adm DE, Tabel Data Konsumen, dan Pelacakan SLA Hold Dana.
3. **Kontrol Mediator Module**:
   - Dashboard Metrik & Grafik Performa Mediator.
   - Daftar Mediator Kontrak lengkap dengan filter dan paginasi.
   - Registrasi Mediator dengan validasi duplikasi NIK/No Rekening/No Telepon.
   - Validasi Kode Mediator (KD MED).
   - Follow-Up Mediator & Riwayat Interaksi.
4. **Ex-Customer Control**:
   - Monitoring data BPKB nasabah lunas.
   - Pengaturan penugasan follow-up harian posko & CMO.
   - Input hasil kontak dan pencatatan log FU.
   - Import CSV BPKB dengan parser validasi format.
5. **Master Wilayah & Administrasi**:
   - Master Wilayah Indonesia (Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa, Kode Pos).
   - User Management (RBAC: Super Admin, Branch Manager, Pos Manager, ADM DE, ADM BPKB, CMO).
   - Audit Trail & Activity Logging.

---

## 4. Prinsip Perbaikan Berbasis Bedah Mikro (*Targeted Surgical Fixes*)
- Jika ditemukan kendala kompilasi TypeScript atau Rollup/Vite, penanganan wajib dilakukan secara presisi:
  - Perbaiki tipe data (*type narrowing* atau anotasi) tanpa mengubah fungsionalitas.
  - Jangan pernah menghapus method pada `DatabaseService` / `StorageService`.
  - Jangan pernah menghapus enum, union type, atau interface pada `src/types.ts`.
- Jalankan verifikasi menyeluruh (`npm run lint` dan `npm run build`) sebelum menyelesaikan tugas untuk memastikan aplikasi berjalan tanpa cacat kode.

---
*Ditetapkan untuk ditaati pada setiap iterasi pengembangan KAMM Manado.*
