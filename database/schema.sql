-- Skema Database PostgreSQL SIM Klinik Rawat Jalan Terintegrasi SATUSEHAT

-- 0. Tabel Pengguna / Akun Sistem (Auth)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',     -- 'admin', 'resepsionis', 'dokter', 'farmasi'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Tabel Pasien
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    mr_number VARCHAR(20) UNIQUE NOT NULL,         -- Nomor Rekam Medis (RM)
    nik VARCHAR(16) UNIQUE NOT NULL,               -- Nomor Induk Kependudukan
    full_name VARCHAR(150) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,                   -- 'male' / 'female'
    address TEXT,
    phone_number VARCHAR(20),
    satusehat_patient_id VARCHAR(50),              -- IHS Number Pasien dari SATUSEHAT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Dokter
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(16) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    sip_number VARCHAR(50),                        -- Surat Izin Praktik
    specialization VARCHAR(100) DEFAULT 'Umum',
    satusehat_practitioner_id VARCHAR(50),         -- IHS Number Dokter dari SATUSEHAT
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Poli / Lokasi Layanan
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                    -- Contoh: Poli Umum, Poli Gigi
    type VARCHAR(50) DEFAULT 'poli',
    satusehat_location_id VARCHAR(50),             -- Location ID dari SATUSEHAT
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Kunjungan & Antrean
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    visit_number VARCHAR(30) UNIQUE NOT NULL,      -- Format: VST-YYYYMMDD-XXXX
    queue_number VARCHAR(10) NOT NULL,             -- Contoh: A-001, A-002
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU', -- MENUNGGU, DIPERIKSA, FARMASI, SELESAI, BATAL
    satusehat_encounter_id VARCHAR(50),            -- Encounter ID dari SATUSEHAT
    satusehat_status VARCHAR(20) DEFAULT 'unregistered', -- unregistered, arrived, in-progress, finished, failed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Pemeriksaan Medis (Rekam Medis Dokter)
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    chief_complaint TEXT NOT NULL,                 -- Anamnesis / Keluhan Utama
    physical_exam TEXT,                            -- Pemeriksaan Fisik
    systolic INT,                                  -- Tekanan Darah Sistolik (mmHg)
    diastolic INT,                                 -- Tekanan Darah Diastolik (mmHg)
    heart_rate INT,                                -- Denyut Nadi (bpm)
    temperature NUMERIC(4, 1),                     -- Suhu Tubuh (Celcius)
    respiratory_rate INT,                          -- Laju Napas (per menit)
    icd10_code VARCHAR(10) NOT NULL,               -- Kode ICD-10 (misal: A09, J00)
    icd10_display VARCHAR(255) NOT NULL,           -- Nama Penyakit ICD-10
    diagnosis_notes TEXT,
    treatment_notes TEXT,                          -- Tindakan Medis
    satusehat_condition_id VARCHAR(50),            -- Resource Condition SATUSEHAT
    satusehat_obs_bp_id VARCHAR(50),               -- Resource Observation Tekanan Darah
    satusehat_obs_hr_id VARCHAR(50),               -- Resource Observation Nadi
    satusehat_obs_temp_id VARCHAR(50),             -- Resource Observation Suhu
    satusehat_obs_rr_id VARCHAR(50),               -- Resource Observation Pernapasan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Master Obat
CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    kfa_code VARCHAR(50),                          -- Kode KFA Kemenkes
    name VARCHAR(150) NOT NULL,
    form VARCHAR(50) DEFAULT 'Tablet',             -- Tablet, Kapsul, Sirup, Salep
    unit VARCHAR(20) DEFAULT 'Tablet',             -- Tablet, Botol, Tube
    stock INT NOT NULL DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Resep Dokter
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU_OBAT', -- MENUNGGU_OBAT, SUDAH_DISERAHKAN
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Detail Resep Obat
CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    prescription_id INT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id INT NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    dosage_instruction VARCHAR(100) NOT NULL,      -- Contoh: 3 x 1 tablet sesudah makan
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    satusehat_medication_req_id VARCHAR(50),       -- Resource MedicationRequest SATUSEHAT
    satusehat_medication_disp_id VARCHAR(50),      -- Resource MedicationDispense SATUSEHAT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Tagihan & Pembayaran (Kasir)
CREATE TABLE IF NOT EXISTS billings (
    id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    consultation_fee NUMERIC(12, 2) NOT NULL DEFAULT 35000,
    medicine_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 35000,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'BELUM_LUNAS', -- BELUM_LUNAS, LUNAS
    payment_method VARCHAR(50) DEFAULT 'TUNAI',    -- TUNAI, QRIS, TRANSFER
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabel Log Sinkronisasi SATUSEHAT
CREATE TABLE IF NOT EXISTS satusehat_logs (
    id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,            -- Patient, Encounter, Condition, Observation, etc.
    resource_id VARCHAR(50),                       -- ID referensi internal / ID SATUSEHAT
    endpoint VARCHAR(255) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    http_status INT,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILED, PENDING
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indeks untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_patients_nik ON patients(nik);
CREATE INDEX IF NOT EXISTS idx_patients_mr_number ON patients(mr_number);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_satusehat_logs_status ON satusehat_logs(sync_status);
