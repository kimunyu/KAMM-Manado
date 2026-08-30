# LAPORAN LENGKAP AUDIT KEAMANAN, AUTENTIKASI & OTORISASI (P0-1)
**Project**: KAMM-Manado  
**Platform**: React + TypeScript + Vite + Firebase Firestore  
**Tanggal Audit**: 29 Agustus 2026  
**Status**: AUDIT ONLY (Tidak ada modifikasi file/database pada tahap ini)

---

## DAFTAR ISI
1. [A. Executive Summary](#a-executive-summary)
2. [B. Audit Authentication Architecture](#b-audit-authentication-architecture)
3. [C. Audit User Data & Data Model](#c-audit-user-data--data-model)
4. [D. Audit Role & RBAC Architecture](#d-audit-role--rbac-architecture)
5. [E. Audit Authorization (Cabang, Posko, CMO / KD AO, RM / Area)](#e-audit-authorization)
6. [F. Audit Firestore Rules](#f-audit-firestore-rules)
7. [G. Audit Client-Side Security](#g-audit-client-side-security)
8. [H. Audit Data Access & Collection Matrix](#h-audit-data-access--collection-matrix)
9. [I. Role Access Matrix](#i-role-access-matrix)
10. [J. Security Gap Analysis (P0, P1, P2, P3)](#j-security-gap-analysis)
11. [K. Recommended P0 Fix Plan](#k-recommended-p0-fix-plan)
12. [L. Files That Need Modification](#l-files-that-need-modification)

---

## A. Executive Summary

1. **Firestore Rules Terbuka Penuh (Public Read/Write)**: File `firestore.rules` disetel ke `allow read, update, write: if true;` untuk seluruh dokumen (`/{document=**}`). Siapapun di internet dapat membaca, memodifikasi, dan menghapus seluruh isi database tanpa autentikasi.
2. **Ketiadaan Firebase Authentication Resmi**: Aplikasi saat ini tidak menggunakan Firebase Authentication (`firebase/auth`). Tidak ada token JWT, tidak ada `request.auth`, dan tidak ada verifikasi sesi server-side.
3. **Autentikasi Bersifat Client-Side Custom**: Proses login hanya mencocokkan string `username` dan `password` di memori browser/LocalStorage dari dokumen yang diunduh dari koleksi `users`.
4. **Penyimpanan Password Plain Text**: Seluruh password pengguna (termasuk Super Admin) disimpan dalam bentuk **teks biasa (plain text)** di Firestore (`users/{id}.password`) dan di `localStorage` browser tanpa enkripsi/hashing.
5. **Privilege Escalation Instan (Role Spoofing)**: Siapapun dapat mengambil alih hak akses `SUPER_ADMIN` hanya dengan mengubah data di Chrome DevTools Console (`localStorage.setItem('med_control_auth_user_v2', ...)`).
6. **Data Leakage ke Seluruh Perangkat Client**: Seluruh koleksi Firestore (`users`, `mediators`, `fu_logs`, `ex_customers`, `ex_customer_fu_logs`) disinkronkan secara real-time ke browser setiap pengguna melalui `onSnapshot(collection(db, ...))`. Akun CMO dapat melihat seluruh data nasabah dan mediator cabang lain melalui LocalStorage/RAM browser.
7. **Otorisasi dan Scope 100% di Frontend**: Pembatasan cabang, posko, KD AO, batas waktu edit 48 jam BPKB, dan kuota drip feeding hanya dilakukan melalui React `useMemo`/filter UI. Tidak ada enforcement di backend atau database rules.
8. **Role RM Belum Memiliki Pembatasan Area**: Entitas `Area`/`Wilayah` belum terintegrasi pada model data pengguna `User`. Role `RM` saat ini dibaca sebagai National Scope (setara Super Admin untuk pembacaan seluruh cabang).
9. **Inkonsistensi Skema Data**: Terdapat inkonsistensi penamaan field pada modul Mediator (`kd_cabang`, `kd_posko`) dengan modul Ex-Customer (`kd_cab`, `kd_pos`).
10. **Tidak Ada Backend Server**: Aplikasi berjalan murni sebagai Single Page Application (SPA) React dengan koneksi langsung ke Firestore SDK publik.

---

## B. Audit Authentication Architecture

* **File Terkait**:
  - `src/context/AuthContext.tsx` (baris 36–135)
  - `src/components/LoginModal.tsx` (baris 15–40)
  - `src/services/storage.ts` (baris 576–660)
  - `src/services/firebase.ts` (baris 1–34)

### Hasil Audit Rinci:
* **Apakah menggunakan Firebase Authentication?**: TIDAK.
* **Apakah menggunakan custom authentication?**: YA, custom client-side validation.
* **Bagaimana username/email disimpan?**: Disimpan di dokumen Firestore `users/{id}` dan di-cache di LocalStorage `med_control_users_v2`.
* **Bagaimana password ditangani?**: Disimpan apa adanya dalam format teks biasa (plain text) tanpa salt, hash, atau enkripsi.
* **Apakah password disimpan di Firestore?**: YA (`users/{id}/password`).
* **Apakah password disimpan di localStorage/sessionStorage?**: YA (`localStorage.getItem('med_control_users_v2')`).
* **Bagaimana session user dipertahankan setelah refresh?**: Membaca string JSON dari `localStorage.getItem('med_control_auth_user_v2')`.
* **Bagaimana aplikasi menentukan user sedang login atau tidak?**: Berdasarkan keberadaan objek `currentUser` di React state yang diinisialisasi dari `localStorage`.
* **Apakah user dapat memanipulasi status login dari browser?**: YA, sangat mudah dengan mengetik di console browser atau mengubah Application Storage.
* **Apakah ada token Firebase Authentication?**: TIDAK ADA. `request.auth` selalu bernilai `null`.
* **Apakah ada penggunaan `onAuthStateChanged`?**: TIDAK ADA.
* **Apakah ada penggunaan `signInWithEmailAndPassword`?**: TIDAK ADA.

---

## C. Audit User Data & Data Model

### Struktur Data Aktual (`src/types.ts`):

```typescript
export interface User {
  id: string;
  nama: string;
  username: string;
  password?: string;
  role: UserRole;
  kd_cabang?: string;
  kd_posko?: string;
  kd_ao?: string;
  status: 'AKTIF' | 'NONAKTIF';
  created_at: string;
}
```

### Identifikasi Field & POTENSI INKONSISTENSI:

1. **User ID**: Menggunakan `id` (string UUID / nanoid / manual ID seperti `usr-sa-01`).
2. **Username**: Menggunakan `username` (huruf kecil).
3. **Email**: **BELUM DIGUNAKAN** (Aplikasi hanya menggunakan `username`).
4. **Password**: Menggunakan `password` (string plain text).
5. **Nama**: Menggunakan `nama`.
6. **Role**: Menggunakan `role` bertipe enum `UserRole`.
7. **Cabang**:
   - `User`, `Cabang`, `Posko`, `MediatorKontrak`, `FULog`: **`kd_cabang`**
   - `ExCustomer`, `ExCustomerFULog`: **`kd_cab`**  
   👉 **[POTENSI INKONSISTENSI]**
8. **Posko**:
   - `User`, `Posko`, `MediatorKontrak`, `FULog`: **`kd_posko`**
   - `ExCustomer`, `ExCustomerFULog`: **`kd_pos`**  
   👉 **[POTENSI INKONSISTENSI]**
9. **Area / Wilayah**:
   - `Cabang`: memiliki field `wilayah` (contoh: "Wilayah 1").
   - `User` (termasuk role `RM`): **TIDAK MEMILIKI FIELD `area` / `wilayah` / `areaId`**.  
   👉 **[POTENSI INKONSISTENSI & SECURITY GAP]**
10. **KD AO**:
   - `User`, `MediatorKontrak`, `FULog`: **`kd_ao`**
   - `ExCustomer`: `assigned_to_cmo_id` (berisi User ID / Nama CMO).

---

## D. Audit Role & RBAC Architecture

### 1. Daftar Role Aktual di Kode (`src/types.ts`):
1. `SUPER_ADMIN`
2. `RM`
3. `KAOPS`
4. `KACAB`
5. `KAPOS`
6. `ADM`
7. `CMO`
8. `ADMIN_BPKB`

### 2. Bagaimana Role Ditentukan & Disimpan:
* Role ditentukan saat pembuatan akun di `src/components/UserControl.tsx`.
* Role disimpan pada dokumen `users/{id}.role`.
* Di sisi client, role disimpan pada objek `localStorage.getItem('med_control_auth_user_v2')`.

### 3. Penggunaan Role:
* **Hanya untuk UI Control**: Role saat ini hanya digunakan untuk menyembunyikan/menampilkan menu, tab, dan tombol aksi di antarmuka React.
* **Pembatasan Query**: **TIDAK ADA**. Tidak ada query `where()` berbasis role di Firestore.
* **Pembatasan Operasi Firestore**: **TIDAK ADA**. Firestore Rules mengizinkan write/delete dari siapapun.
* **Manipulasi dari Client**: **SANGAT BISA**. Mengubah `user.role` di localStorage langsung memberikan akses UI ke fitur Super Admin.

---

## E. Audit Authorization

### 1. Audit Cabang
* **Aturan Bisnis**: `SUPER_ADMIN` = Seluruh Cabang; `KAOPS` & `KACAB` = Hanya Cabangnya.
* **Implementasi**:
  - `User` memiliki field `kd_cabang`.
  - `Mediator` memiliki `kd_cabang`.
  - `ExCustomer` memiliki `kd_cab`.
  - Filtering cabang dilakukan melalui `useMemo` di frontend (`m.kd_cabang === currentUser.kd_cabang`).
  - **Firestore Rules**: **TIDAK MEMBATASI CABANG**.

### 2. Audit Posko
* **Aturan Bisnis**: `KAPOS` & `ADM` = Hanya Poskonya.
* **Implementasi**:
  - `User` memiliki field `kd_posko`.
  - `Mediator` memiliki `kd_posko`.
  - `ExCustomer` memiliki `kd_pos`.
  - Filtering posko dilakukan di frontend (`m.kd_posko === currentUser.kd_posko`).
  - **Firestore Rules**: **TIDAK MEMBATASI POSKO**.

### 3. Audit CMO / KD AO
* **Aturan Bisnis**: CMO hanya boleh mengakses data yang memiliki KD AO yang sama dengan miliknya.
* **Implementasi**:
  - `User` CMO memiliki field `kd_ao`.
  - `Mediator` memiliki `kd_ao`.
  - Filter di `DaftarMediator.tsx`: `m.kd_ao === userAo || m.created_by_user_id === currentUser.id`.
  - CMO tidak bisa mengedit KD AO dari UI registrasi, tetapi seluruh data mediator CMO lain tetap diunduh ke browser CMO tersebut.
  - **Firestore Rules**: **TIDAK MEMBATASI KD AO**.

### 4. Audit RM / Area
* **Aturan Bisnis**: RM dapat mengakses seluruh cabang dan posko dalam area tanggung jawabnya.
* **Implementasi**:
  - Status: **BELUM TERIMPLEMENTASI PADA MODEL USER**.
  - Pada `src/context/AuthContext.tsx` baris 209:
    `const canViewAllBranches = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'RM';`
  - Akibatnya, role `RM` saat ini dapat melihat seluruh cabang nasional tanpa pembatasan area.
  - **Firestore Rules**: **TIDAK MEMBATASI AREA**.

---

## F. Audit Firestore Rules

### Isi file `/firestore.rules` saat ini:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
       allow read, update, write: if true; // Sesuaikan dengan sistem login/auth Anda
    }
  }
}
```

### Analisis Keamanan:
* `request.auth`: Tidak digunakan.
* `request.auth.uid`: Tidak digunakan.
* `get()` / `exists()`: Tidak digunakan.
* **Status**: 100% PUBLIC READ, PUBLIC WRITE, PUBLIC DELETE.

---

## G. Audit Client-Side Security

Semua parameter otorisasi berikut dapat dimanipulasi melalui browser DevTools:
1. **`role`**: Dapat diubah menjadi `SUPER_ADMIN` via `localStorage.setItem('med_control_auth_user_v2', ...)`.
2. **`kd_cabang` & `kd_posko`**: Dapat diubah untuk membuka akses filter data wilayah lain di UI.
3. **`kd_ao`**: Dapat diubah untuk melihat dan mengedit mediator milik AO lain.
4. **`user ID`**: Dapat dimanipulasi untuk memalsukan identitas pembuat data / penginput FU.
5. **Authentication State**: Tidak ada validasi signature kriptografis dari server.

---

## H. Audit Data Access & Collection Matrix

| Collection | Digunakan Untuk | Field Otorisasi | Security Saat Ini |
| :--- | :--- | :--- | :--- |
| `users` | Akun, data login, kredensial, role | `id`, `role`, `kd_cabang`, `kd_posko`, `kd_ao` | **Public Read, Write, Delete** |
| `mediators` | Master data mediator kontrak | `kd_cabang`, `kd_posko`, `kd_ao`, `status` | **Public Read, Write, Delete** |
| `fu_logs` | Riwayat follow up mediator | `kd_cabang`, `kd_posko`, `kd_ao`, `user_fu` | **Public Read, Write, Delete** |
| `ex_customers` | Data jaminan BPKB & nasabah lunas | `kd_cab`, `kd_pos`, `assigned_to_cmo_id` | **Public Read, Write, Delete** |
| `ex_customer_fu_logs` | Riwayat follow up nasabah | `kd_cab`, `kd_pos`, `kd_ao`, `user_id` | **Public Read, Write, Delete** |
| `cabang` | Master data cabang operasional | `kd_cabang`, `wilayah` | **Public Read, Write, Delete** |
| `posko` | Master data posko unit | `kd_posko`, `kd_cabang` | **Public Read, Write, Delete** |

---

## I. Role Access Matrix

| Role | Read | Create | Update | Delete | Scope | Status Implementasi |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ | Semua Cabang | Full Access di UI & DB |
| **RM** | ✅ | ❌ | ❌ | ❌ | Area *(Saat ini: Nasional)* | Read Only (Scope Area belum terisolasi) |
| **KAOPS** | ✅ | ✅ | ✅ | ❌ | Cabang miliknya | Validasi KD MED & Approval Cabang |
| **KACAB** | ✅ | ❌ | ❌ | ❌ | Cabang miliknya | Monitoring Dashboard & Laporan |
| **KAPOS** | ✅ | ✅ | ✅ | ❌ | Posko miliknya | Validasi KD MED, Input FU, Assign CMO |
| **ADM** | ✅ | ✅ | ✅ | ❌ | Posko miliknya | Review Berkas, Input FU |
| **CMO** | ✅ | ✅ | ✅ | ❌ | KD AO miliknya | Registrasi Mediator, Input FU |
| **ADMIN_BPKB** | ✅ | ✅ | ✅ | ❌ | Semua Cabang (48 Jam) | Input BPKB, Edit dalam 2x24 Jam |

*Catatan: Hak Create/Update/Delete di atas saat ini hanya dibatasi pada UI layer. Di level database, semua role memiliki izin Write/Delete penuh.*

---

## J. Security Gap Analysis

### 🔴 P0 — CRITICAL
1. **VULN-01: Public Open Firestore Security Rules** (`/firestore.rules`)
   - *Masalah*: Aturan `allow read, write: if true;` mengizinkan akses tanpa login.
   - *Dampak*: Kebocoran seluruh basis data dan risiko penghapusan data masal.
2. **VULN-02: Plain Text Passwords in Firestore & LocalStorage** (`src/services/storage.ts`)
   - *Masalah*: Password pengguna disimpan dalam format teks biasa.
   - *Dampak*: Password Super Admin dan seluruh staf dapat dilihat oleh siapa saja yang membuka console browser.
3. **VULN-03: Client-Side Authentication & Session Spoofing** (`src/context/AuthContext.tsx`)
   - *Masalah*: Sesi login dan hak role disimpan di LocalStorage tanpa token server.
   - *Dampak*: Pengguna biasa dapat mengubah role menjadi Super Admin dalam hitungan detik.
4. **VULN-04: Full Real-Time Database Leakage** (`src/services/storage.ts`)
   - *Masalah*: Listener Firestore mengunduh seluruh isi tabel ke browser setiap client.
   - *Dampak*: Data nasabah dan mediator seluruh cabang bocor ke memori browser CMO di posko manapun.

---

### 🟠 P1 — HIGH
1. **VULN-05: Ketiadaan Pembatasan Wilayah untuk Role RM** (`src/types.ts`)
   - *Masalah*: Model user tidak memiliki relasi `area`/`wilayah`, sehingga RM disamakan dengan Super Admin.
   - *Dampak*: Pelanggaran batas wilayah kerja RM.
2. **VULN-06: Window Waktu Edit 48 Jam BPKB Tanpa Proteksi Server** (`src/services/storage.ts`)
   - *Masalah*: Pembatasan edit 48 jam hanya dicek di frontend.
   - *Dampak*: Data BPKB kadaluarsa dapat diubah kembali dengan memanggil fungsi database secara langsung.
3. **VULN-07: Batasan Drip Feeding 25 Data/Hari Tanpa Enforcement Backend** (`src/services/storage.ts`)
   - *Masalah*: Kuota drip harian hanya dihitung di frontend.
   - *Dampak*: Batasan dapat ditembus dengan manipulasi state/request.

---

### 🟡 P2 — MEDIUM
1. **VULN-08: Inkonsistensi Skema Field (`kd_cabang` vs `kd_cab`)**
   - *Masalah*: Penamaan field tidak seragam antara modul Mediator dan Ex-Customer.
   - *Dampak*: Menyulitkan penulisan aturan keamanan Firestore yang konsisten.
2. **VULN-09: Password Default Terbuka ("1234")**
   - *Masalah*: Fitur reset password otomatis menyetel ke `1234` tanpa verifikasi email/OTP.
   - *Dampak*: Rentan terhadap penebakan password massal.

---

### 🔵 P3 — LOW
1. **VULN-10: Ketiadaan Immutable Audit Logs**
   - *Masalah*: Riwayat perubahan data disimpan dalam koleksi yang dapat ditimpa/dihapus.
   - *Dampak*: Ketiadaan jejak audit forensik jika terjadi kecurangan internal.

---

## K. Recommended P0 Fix Plan

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ TAHAP 1: STANDARISASI MODEL DATA & INKONSISTENSI FIELD                  │
│ • Menyelaraskan kd_cabang & kd_posko di seluruh skema                   │
│ • Menambahkan field wilayah/area pada User model untuk RM               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 2: PROVISIONING & AKTIVASI FIREBASE AUTHENTICATION                │
│ • Mendaftarkan akun user resmi ke Firebase Authentication Auth Service │
│ • Menghubungkan Firebase Auth UID dengan dokumen di Firestore (users)   │
│ • Menghentikan penyimpanan plain text password                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 3: REFACTOR AUTH CONTEXT & CLIENT LOGIN FLOW                      │
│ • Mengganti custom login dengan signInWithEmailAndPassword              │
│ • Menggunakan onAuthStateChanged untuk mengunci sesi valid              │
│ • Mengambil data role & scope langsung dari Firestore terverifikasi    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 4: IMPLEMENTASI & DEPLOY FIRESTORE SECURITY RULES                 │
│ • Mengunci /{document=**} dari akses publik tanpa login                 │
│ • Menulis rule spesifik per role: SUPER_ADMIN, RM, KAOPS, KACAB,        │
│   KAPOS, ADM, CMO, ADMIN_BPKB                                           │
│ • Menegakkan isolasi data KD AO untuk CMO dan Posko untuk KAPOS/ADM     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ TAHAP 5: OPTIMASI QUERY SCOPING (PREVENT DATA LEAKAGE)                  │
│ • Mengganti full-collection onSnapshot dengan query scoped (where)      │
│ • Memastikan performa offline fallback tetap stabil dan aman            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## L. Files That Need Modification

Daftar file yang akan dimodifikasi pada tahap eksekusi:

1. **`/firestore.rules`**: Mengganti rules publik dengan aturan RBAC ketat berbasis `request.auth` dan lookup dokumen user/role/cabang/posko/KD AO.
2. **`/src/types.ts`**: Menstandarkan penamaan field (`kd_cabang`, `kd_posko`), menambahkan field `area` pada User untuk RM, dan menghapus field `password` dari interface User.
3. **`/src/services/firebase.ts`**: Menginisialisasi dan mengekspor `getAuth()` dari `firebase/auth`.
4. **`/src/context/AuthContext.tsx`**: Mengganti login client-side tiruan dengan Firebase Auth SDK (`signInWithEmailAndPassword`, `signOut`, `onAuthStateChanged`), dan mengunci token sesi.
5. **`/src/services/storage.ts`**: Menghentikan penyimpanan password plain text ke Firestore, dan menerapkan query scoping berbasis role/posko/KD AO.
6. **`/src/components/LoginModal.tsx`**: Menghubungkan form input dengan Firebase Auth login asynchronous.
7. **`/src/components/UserControl.tsx`**: Memperbarui pembuatan user baru agar mendaftarkan akun di Firebase Auth tanpa menyimpan password terbuka.
8. **`/src/components/ExCustomerControl.tsx` & `/src/data/seedExCustomers.ts`**: Menyesuaikan properti objek dari `kd_cab`/`kd_pos` ke `kd_cabang`/`kd_posko`.
