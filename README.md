# 🏥 Backend SIM-Klinik Rawat Jalan Terintegrasi SATUSEHAT Kemenkes RI (HL7 FHIR R4)

Backend RESTful API untuk Sistem Informasi Manajemen Klinik Rawat Jalan (SIMRS) yang terintegrasi secara *real-time* dengan standar rekam medis nasional Kementerian Kesehatan Republik Indonesia (**HL7 FHIR R4 & SATUSEHAT API**).

---

## 🚀 Fitur Utama

- **Alur Rawat Jalan Linear**:
  - `Pendaftaran Pasien ➔ Antrean Dokter ➔ Pemeriksaan & E-Resep ➔ Farmasi & Kasir ➔ Selesai (Pulang)`
- **Integrasi Penuh SATUSEHAT Kemenkes RI**:
  - Otentikasi OAuth2 Client Credentials dengan sistem *token caching*.
  - Lookup NIK ke server SATUSEHAT untuk verifikasi dan pengambilan **Nomor IHS Pasien**.
  - Sinkronisasi otomatis Resource FHIR R4:
    - **`Patient`**: Pencarian NIK & verifikasi IHS Pasien.
    - **`Practitioner`**: Verifikasi identitas dokter / tenaga medis (IHS Dokter).
    - **`Encounter`**: Pencatatan kedatangan (*arrived*) dan kepulangan (*finished*) pasien.
    - **`Observation`**: Pengiriman data tanda vital (Tekanan darah sistolik/diastolik, nadi, suhu, pernapasan).
    - **`Condition`**: Pencatatan diagnosa klinis standar internasional **ICD-10**.
    - **`MedicationRequest`**: Peresepan obat elektronik standar **KFA (Kamus Farmasi dan Alat Kesehatan)**.
    - **`MedicationDispense`**: Bukti penyerahan obat oleh apoteker.
- **Monitoring & Audit Log Integrasi**:
  - Seluruh *payload request* dan *response* dari server Kemenkes tercatat di tabel `satusehat_logs`.
- **Autentikasi Multi-Role**:
  - Akun peran untuk `admin`, `resepsionis`, `dokter`, dan `farmasi`.
- **Standar Kode Modern**:
  - 100% menggunakan **ECMAScript Modules (ESM)** modern (`import` / `export`, `"type": "module"`).

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Express.js (ES Modules)
- **Database**: PostgreSQL
- **Standard**: HL7 FHIR Release 4 (Kemenkes RI Specification)
- **API Client**: Native `fetch` (Node.js) + OAuth2

---

## 📂 Struktur Direktori

```
backend/
├── database/
│   ├── init-db.js         # Migration & Database seeder script
│   ├── schema.sql         # Skema tabel PostgreSQL
│   └── seed.sql           # Data master & akun demo
├── postman/
│   ├── satusehat-workshop-rawat-jalan.postman_collection.json
│   └── satusehat-staging.postman_environment.json
├── src/
│   ├── config/
│   │   ├── db.js          # PostgreSQL Connection Pool
│   │   ├── env.js         # Environment loader
│   │   └── satusehat.js   # Konfigurasi SATUSEHAT Staging
│   ├── controller/        # Request handlers
│   ├── middlewares/       # Error handler middleware
│   ├── routes/            # REST API endpoints
│   ├── services/          # Business logic & FHIR client
│   ├── utils/
│   │   └── fhirPayload.js # Payload builder standar HL7 FHIR R4
│   └── app.js             # Express application entrypoint
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Instalasi & Konfigurasi

### 1. Clone Repository & Install Dependensi
```bash
git clone https://github.com/DejanJaya/backend-simrs-satusehat.git
cd backend-simrs-satusehat
npm install
```

### 2. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi database dan kredensial SATUSEHAT Staging Anda:
```env
PORT=5000
NODE_ENV=development

# Database PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sim_klinik

# SATUSEHAT Staging
SATUSEHAT_ENV=staging
SATUSEHAT_AUTH_URL=https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1
SATUSEHAT_BASE_URL=https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1
SATUSEHAT_ORG_ID=your_org_id
SATUSEHAT_CLIENT_ID=your_client_id
SATUSEHAT_CLIENT_SECRET=your_client_secret
SATUSEHAT_MOCK_MODE=false
```

### 3. Inisialisasi Database
Jalankan skrip migrasi skema dan seed data:
```bash
npm run db:init
```

### 4. Jalankan Server
```bash
# Mode pengembangan (auto-reload)
npm run dev

# Mode produksi
npm start
```
Server akan berjalan di `http://localhost:5000`.

---

## 📬 Koleksi Postman

File koleksi Postman resmi untuk pengujian mandiri telah disertakan di dalam folder [`postman/`](./postman):
1. `satusehat-workshop-rawat-jalan.postman_collection.json`
2. `satusehat-staging.postman_environment.json`

Cukup import kedua file tersebut ke dalam aplikasi **Postman**, pilih environment **SATUSEHAT Staging**, dan seluruh alur REST API siap diuji.

---

## 👥 Akun Demo Bawaan

| Username | Password | Role / Peran |
|---|---|---|
| `admin` | `admin123` | Administrator Klinik |
| `resepsionis` | `pendaftaran123` | Petugas Pendaftaran |
| `dokter` | `dokter123` | Dokter Pemeriksa |
| `farmasi` | `farmasi123` | Petugas Farmasi & Kasir |

---

## 📄 Lisensi
MIT License &bull; Dibuat untuk portofolio implementasi standar HL7 FHIR SATUSEHAT Kemenkes RI.
