import db from '../config/db.js';
import satusehatService from './satusehatService.js';

class PatientService {
  /**
   * Mengambil daftar pasien dengan pencarian nama, NIK, atau No. RM
   */
  async getAllPatients(query = '') {
    let sql = 'SELECT * FROM patients';
    const params = [];

    if (query.trim()) {
      sql += ' WHERE full_name ILIKE $1 OR nik ILIKE $1 OR mr_number ILIKE $1';
      params.push(`%${query.trim()}%`);
    }

    sql += ' ORDER BY id DESC LIMIT 50';
    const result = await db.query(sql, params);
    return result.rows;
  }

  /**
   * Detail pasien berdasarkan ID
   */
  async getPatientById(id) {
    const result = await db.query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Detail pasien berdasarkan NIK
   */
  async getPatientByNik(nik) {
    const result = await db.query('SELECT * FROM patients WHERE nik = $1', [nik]);
    return result.rows[0] || null;
  }

  /**
   * Mendaftarkan pasien baru & otomatis lookup IHS ke SATUSEHAT
   */
  async createPatient(data) {
    const { nik, full_name, birth_date, gender, address, phone_number } = data;

    // Cek apakah NIK sudah terdaftar
    const existing = await this.getPatientByNik(nik);
    if (existing) {
      throw new Error(`Pasien dengan NIK ${nik} sudah terdaftar (No. RM: ${existing.mr_number}).`);
    }

    // Generate No. Rekam Medis (RM) baru
    const year = new Date().getFullYear();
    const countRes = await db.query('SELECT COUNT(*) FROM patients');
    const seq = String(parseInt(countRes.rows[0].count) + 1).padStart(4, '0');
    const mr_number = `RM-${year}-${seq}`;

    // Otomatis lookup IHS Pasien ke SATUSEHAT
    let satusehat_patient_id = null;
    try {
      const satusehatResult = await satusehatService.lookupPatientByNik(nik);
      if (satusehatResult && satusehatResult.ihsNumber) {
        satusehat_patient_id = satusehatResult.ihsNumber;
      }
    } catch (err) {
      console.warn('Lookup IHS SATUSEHAT dilewati:', err.message);
    }

    const insertSql = `
      INSERT INTO patients (mr_number, nik, full_name, birth_date, gender, address, phone_number, satusehat_patient_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(insertSql, [
      mr_number,
      nik,
      full_name,
      birth_date,
      gender,
      address || '',
      phone_number || '',
      satusehat_patient_id
    ]);

    return result.rows[0];
  }

  /**
   * Sinkronisasi ulang IHS Pasien dengan SATUSEHAT jika sebelumnya belum ada
   */
  async syncPatientIhs(patientId) {
    const patient = await this.getPatientById(patientId);
    if (!patient) {
      throw new Error('Pasien tidak ditemukan.');
    }

    const satusehatResult = await satusehatService.lookupPatientByNik(patient.nik);
    if (!satusehatResult || !satusehatResult.ihsNumber) {
      throw new Error('IHS Pasien belum ditemukan di basis data SATUSEHAT Kemenkes.');
    }

    const updateRes = await db.query(
      'UPDATE patients SET satusehat_patient_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [satusehatResult.ihsNumber, patientId]
    );

    return updateRes.rows[0];
  }
}

const patientService = new PatientService();
export default patientService;
export { patientService };
