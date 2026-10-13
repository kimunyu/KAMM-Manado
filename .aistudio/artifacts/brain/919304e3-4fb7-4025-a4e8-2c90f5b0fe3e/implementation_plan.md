# Rencana Implementasi: Diinput Pertama Oleh [KD AO] - [Nama AO] & Ditugaskan Ke [KD AO] - [Nama AO]

Dokumen ini merinci rencana teknis penataan alur dan penayangan identitas petugas pada modul Prospek Sales (Sales Acquisition) sesuai aturan bisnis KAMM Manado:
1. **Dua Pilar Identitas Petugas**:
   - **Diinput Pertama Oleh**: `[KD AO] - [Nama AO]` (user yang mendaftarkan prospek pertama kali).
   - **Ditugaskan Ke**: `[KD AO] - [Nama AO]` (petugas lapangan yang bertanggung jawab memproses prospek saat ini).
2. **Aturan Penugasan Otomatis Saat Input**:
   - Jika user yang menginput memiliki peran **CMO**: Prospek otomatis **ditugaskan ke dirinya sendiri** (`assigned = creator`).
   - Jika user yang menginput adalah non-CMO (KAPOS, KACAB, KAOPS, ADM, Super Admin): Dapat memilih petugas CMO/AO penanggung jawab di wilayahnya.
3. **Kewenangan Pemindahan Tugas (*Reassign*)**:
   - Petugas penugasan dapat diubah sewaktu-waktu oleh **KAPOS** (lingkup poskonya), **KACAB** & **KAOPS** (lingkup cabangnya), serta **SUPER_ADMIN** (lingkup nasional).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Struktur Identitas Baku**:
> - Kolom / Info 1: **Diinput Pertama Oleh**: `[KD AO] - [Nama AO]` (misal: `AO-01 - Budi Pangemanan`).
> - Kolom / Info 2: **Ditugaskan Ke**: `[KD AO] - [Nama AO]` (misal: `AO-02 - Ronald Sumual`).
> - Jika CMO menginput sendiri, maka secara default *Diinput Pertama Oleh* dan *Ditugaskan Ke* bernilai sama (`AO-01 - Budi Pangemanan`), namun dapat dialihkan oleh pimpinan jika diperlukan.

- **Keputusan 1 (Aturan Input Quick Entry)**:
  - User role **CMO**: Kolom penugasan otomatis terisi akun CMO penginput dan dikunci agar prospek langsung masuk ke pipeline miliknya.
  - User role **KAPOS / KACAB / KAOPS / ADM / Super Admin**: Memiliki selector untuk memilih CMO/AO penanggung jawab dari daftar user di posko/cabangnya.
- **Keputusan 2 (Penayangan di Tabel Prospek)**:
  - **Kolom "Ditugaskan Ke"**:
    - Baris 1: `[KD AO]` (teks tebal putih).
    - Baris 2: `[Nama AO]` (nama lengkap petugas penugasan).
  - **Kolom "Diinput Pertama Oleh"**:
    - Baris 1: `[KD AO] - [Nama AO]` (nama penginput awal).
    - Baris 2: Tanggal & Jam input awal.
- **Keputusan 3 (Penayangan di Modal Detail Prospek)**:
  - Menampilkan dua kartu informasi berdampingan/berurutan:
    1. **Diinput Pertama Oleh**: `[KD AO] - [Nama AO]` beserta tanggal/jam pembuatan.
    2. **Ditugaskan Ke**: `[KD AO] - [Nama AO]` (Posko / Cabang).
- **Keputusan 4 (Penayangan di Kartu Kanban Pipeline)**:
  - Footer kartu Kanban menampilkan: `Ditugaskan: [KD AO] • [Nama AO]`.
- **Keputusan 5 (Zero Dummy Data)**:
  - Tanpa injeksi data dummy/mock. Seluruh pengujian fungsional dilakukan mandiri oleh pengguna dengan data riil operasional.

---

## 1. Overview & Core Concept

- **Tujuan**: Memisahkan secara tegas dan transparan antara pencatat awal lead (*attribution creator*) dan penanggung jawab tindak lanjut (*action assignee*).
- **Manfaat**:
  - Pimpinan (Kapos/Kacab/Kaops) dapat memantau kontribusi pencarian lead (siapa yang rajin membawa prospek).
  - Pimpinan dapat melakukan delegasi beban kerja atau reassign ke CMO lain jika CMO pertama berhalangan atau berpindah wilayah.

---

## 2. User Experience & Visual Design

### 1. Form Input Prospek Baru (`QuickEntryModal.tsx`)
- Jika login sebagai **CMO**:
  - Field penugasan menampilkan info badge: *"Ditugaskan ke Anda: [KD AO] - [Nama CMO]"* (otomatis terkunci).
- Jika login sebagai **Pimpinan / Admin** (KAPOS, KACAB, KAOPS, ADM, Super Admin):
  - Menampilkan dropdown *"Tugaskan ke Petugas AO"* yang memuat daftar CMO aktif di wilayah yang bersangkutan dengan format `[KD AO] - [Nama CMO]`.

### 2. Tabel Prospek (`TableProspek.tsx`)
- **Kolom Ditugaskan Ke**:
  - Baris 1: `item.kd_ao` (misal `AO-01`)
  - Baris 2: `Nama AO Penugasan` (misal `Ronald Pangemanan`)
- **Kolom Diinput Pertama Oleh**:
  - Baris 1: `[KD AO] - [Nama Penginput]` (misal `AO-03 - Budi Santoso`)
  - Baris 2: Timestamp tanggal & jam pembuatan.

### 3. Modal Detail Prospek (`ProspekDetailModal.tsx`)
- Kotak profil atas:
  - Menampilkan badge "Diinput Pertama Oleh: `[KD AO] - [Nama Penginput]`"
  - Menampilkan badge "Ditugaskan Ke: `[KD AO] - [Nama AO]`"
  - Tombol "Reassign AO" aktif untuk KAPOS, KACAB, KAOPS, dan Super Admin sesuai wilayahnya.

### 4. Kanban Pipeline Board (`PipelineBoard.tsx`)
- Footer kartu:
  - `Ditugaskan: [KD AO] • [Nama AO]` (ikon User berwarna ungu/slate).

---

## 3. Key Product Decisions & Trade-Offs

- **Resolusi Data Historis**:
  - Untuk record lama yang belum memiliki string nama tersimpan, sistem menggunakan helper:
    - `getAssignedOfficerDisplay(record, allUsers)` &rarr; mencari dari `allUsers` berdasarkan `assigned_user_id` & `kd_ao`.
    - `getCreatorDisplay(record, allUsers)` &rarr; mencari dari `allUsers` berdasarkan `created_by_user_id`.
  - Hal ini menjamin data prospek lama yang sudah ada di sistem langsung menampilkan format `[KD AO] - [Nama AO]` secara sempurna tanpa perubahan skema database yang merusak.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QUICK ENTRY SUBMISSION                          │
│                                                                        │
│   Apakah currentUser.role === 'CMO'?                                   │
│   ├── YA:  assigned_user_id = currentUser.id                           │
│   │        assigned_user_nama = currentUser.nama                       │
│   │        kd_ao = currentUser.kd_ao                                   │
│   │                                                                    │
│   └── TDK: assigned_user_id = selectedUser.id                          │
│            assigned_user_nama = selectedUser.nama                      │
│            kd_ao = selectedUser.kd_ao                                  │
│                                                                        │
│   Data Pembuat Pertama Kali (Keduanya Sama):                           │
│   created_by_user_id = currentUser.id                                  │
│   created_by_nama    = currentUser.nama                                │
│   created_by_kd_ao   = currentUser.kd_ao || ''                         │
│   created_by_role    = currentUser.role                                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PENAYANGAN ANTARMUKA                            │
│                                                                        │
│  1. TableProspek:                                                      │
│     - Kolom Ditugaskan Ke:       [KD AO] \n [Nama AO]                  │
│     - Kolom Diinput Pertama Oleh: [KD AO] - [Nama AO] \n [Timestamp]   │
│                                                                        │
│  2. PipelineBoard:                                                     │
│     - Footer Kartu: Ditugaskan:  [KD AO] • [Nama AO]                   │
│                                                                        │
│  3. ProspekDetailModal:                                                │
│     - Diinput Pertama Oleh:      [KD AO] - [Nama AO]                   │
│     - Ditugaskan Ke:             [KD AO] - [Nama AO]                   │
│                                                                        │
│  4. ReassignModal (KAPOS, KACAB, KAOPS, Super Admin):                  │
│     - Mengalihkan penugasan ke CMO lain di wilayahnya                  │
│     - Mengubah field "Ditugaskan Ke", tetapi "Diinput Pertama Oleh"   │
│       TETAP UTUH SELAMANYA.                                            │
└────────────────────────────────────────────────────────────────────────┘
```

### Langkah Perubahan Komponen
1. **`src/types.ts` & `src/modules/sales-acquisition/types.ts`**:
   - Menambahkan field:
     `assigned_user_nama?: string;`
     `created_by_nama?: string;`
     `created_by_kd_ao?: string;`
     `created_by_role?: UserRole;`
2. **`src/modules/sales-acquisition/services/salesAcquisitionService.ts`**:
   - Menyimpan `assigned_user_nama` dan data `created_by_*`.
   - Pada `reassignLead`: memperbarui `assigned_user_id`, `kd_ao`, dan `assigned_user_nama`, tanpa mengubah data `created_by_*`.
3. **`src/modules/sales-acquisition/components/QuickEntryModal.tsx`**:
   - Jika CMO: penugasan otomatis terkunci ke diri sendiri.
   - Jika non-CMO: pilihan penugasan AO tersedia.
4. **`src/modules/sales-acquisition/components/TableProspek.tsx`**:
   - Menerima `allUsers: User[]`.
   - Menampilkan kolom "Ditugaskan Ke" (`[KD AO]` dan `[Nama AO]`).
   - Menampilkan kolom "Diinput Pertama Oleh" (`[KD AO] - [Nama AO]`).
5. **`src/modules/sales-acquisition/components/PipelineBoard.tsx`**:
   - Menerima `allUsers: User[]`.
   - Menampilkan `Ditugaskan: [KD AO] • [Nama AO]`.
6. **`src/modules/sales-acquisition/components/ProspekDetailModal.tsx`**:
   - Menerima `allUsers: User[]`.
   - Menampilkan dua pilar identitas secara terpisah dan jelas.
7. **`src/modules/sales-acquisition/components/SalesAcquisitionModule.tsx`**:
   - Memastikan `allUsers` diteruskan ke seluruh subkomponen.

---

## Verifikasi Teknis Pengembang
1. Menjalankan `compile_applet` untuk memastikan tidak ada kesalahan tipe TypeScript.
2. Menjalankan `lint_applet` untuk memastikan sintaks bersih.
3. Zero dummy data: tidak ada penambahan data palsu ke database.
