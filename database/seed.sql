-- Data Awal (Seed Data) untuk SIM Klinik Rawat Jalan

-- 0. Master Pengguna Sistem (Akun Demo)
INSERT INTO users (id, username, password, full_name, role, is_active) VALUES
(1, 'admin', 'admin123', 'Administrator Klinik', 'admin', true),
(2, 'resepsionis', 'pendaftaran123', 'Petugas Pendaftaran', 'resepsionis', true),
(3, 'dokter', 'dokter123', 'dr. Budi Santoso, Sp.PD', 'dokter', true),
(4, 'farmasi', 'farmasi123', 'Apt. Siti Nurhaliza, S.Farm', 'farmasi', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));

-- 1. Master Poli / Lokasi
INSERT INTO locations (id, name, type, satusehat_location_id, is_active) VALUES
(1, 'Poli Umum', 'poli', 'b017aa54-f1df-4329-88bc-10f3994a2c3e', true),
(2, 'Poli Gigi & Mulut', 'poli', 'c128bb65-e2ef-4439-99cd-21f4005b3d4f', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Master Dokter
INSERT INTO doctors (id, nik, full_name, sip_number, specialization, satusehat_practitioner_id, is_active) VALUES
(1, '3201010101850001', 'dr. Budi Santoso, Sp.PD', 'SIP/DINKES/2023/001', 'Penyakit Dalam / Dokter Umum', '10001987654', true),
(2, '3201010202900002', 'dr. Siti Rahmawati', 'SIP/DINKES/2023/002', 'Dokter Umum', '10002345678', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Master Obat
INSERT INTO medicines (id, kfa_code, name, form, unit, stock, unit_price, is_active) VALUES
(1, '93000123', 'Paracetamol 500 mg', 'Tablet', 'Tablet', 500, 1500.00, true),
(2, '93000456', 'Amoxicillin 500 mg', 'Kapsul', 'Kapsul', 300, 3000.00, true),
(3, '93000789', 'Antasida Doen', 'Tablet Kunyah', 'Tablet', 250, 1000.00, true),
(4, '93000912', 'Cetirizine 10 mg', 'Tablet', 'Tablet', 400, 2000.00, true),
(5, '93001034', 'Ibuprofen 400 mg', 'Tablet', 'Tablet', 350, 2500.00, true),
(6, '93001156', 'Omeprazole 20 mg', 'Kapsul', 'Kapsul', 200, 4500.00, true),
(7, '93001278', 'Ambroxol 30 mg', 'Tablet', 'Tablet', 300, 1500.00, true),
(8, '93001390', 'Vitamin C 500 mg', 'Tablet', 'Tablet', 600, 1200.00, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Pasien Terdaftar
INSERT INTO patients (id, mr_number, nik, full_name, birth_date, gender, address, phone_number, satusehat_patient_id) VALUES
(1, 'RM-2026-0001', '3271012304950001', 'Ahmad Fadillah', '1995-04-23', 'male', 'Jl. Merdeka No. 45, Kota Bogor', '081234567890', 'P10000123456'),
(2, 'RM-2026-0002', '3271025508880002', 'Dewi Lestari', '1988-08-15', 'female', 'Jl. Pajajaran No. 12, Kota Bogor', '081398765432', 'P10000234567'),
(3, 'RM-2026-0003', '3271031012780003', 'Bambang Sugeng', '1978-12-10', 'male', 'Jl. Sudirman No. 88, Kota Bogor', '081122334455', 'P10000345678')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence serial ID PostgreSQL
SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations));
SELECT setval('doctors_id_seq', (SELECT MAX(id) FROM doctors));
SELECT setval('medicines_id_seq', (SELECT MAX(id) FROM medicines));
SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));
