import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat file .env secara native (didukung Node.js v20+) atau parsing manual tanpa dependensi
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  } else {
    // Fallback parser sederhana untuk .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.replace(/(^['"]|['"]$)/g, '').trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
}

async function initializeDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'sim_klinik'
  });

  try {
    console.log('🔄 Menghubungkan ke PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Terhubung ke database PostgreSQL.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('🔄 Mengeksekusi schema.sql...');
    await client.query(schemaSql);
    console.log('✅ Skema tabel berhasil dibuat.');

    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      console.log('🔄 Mengeksekusi seed.sql...');
      await client.query(seedSql);
      console.log('✅ Data awal (seed) berhasil dimasukkan.');
    }

    client.release();
    await pool.end();
    console.log('🎉 Inisialisasi database selesai dengan sukses!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat inisialisasi database:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('👉 Pastikan service PostgreSQL Anda sudah berjalan (running) di port 5432.');
    } else if (err.code === '3D000') {
      console.error(`👉 Database '${process.env.DB_NAME || 'sim_klinik'}' belum dibuat. Silakan buat database terlebih dahulu di pgAdmin atau jalankan: createdb -U postgres sim_klinik`);
    } else if (err.code === '28P01') {
      console.error('👉 Password atau username PostgreSQL di backend/.env tidak cocok.');
    }
    process.exit(1);
  }
}

initializeDatabase();
