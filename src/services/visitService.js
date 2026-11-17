import db from '../config/db.js';
import satusehatService from './satusehatService.js';
import { buildEncounterPayload } from '../utils/fhirPayload.js';
import config from '../config/satusehat.js';

class VisitService {
  /**
   * Pendaftaran Kunjungan Baru (Pasien Datang ➔ Antrean Dibuat)
   */
  async createVisit({ patient_id, doctor_id, location_id, notes }) {
    const today = new Date().toISOString().slice(0, 10);
    const dateCode = today.replace(/-/g, '');

    // 1. Generate Nomor Kunjungan & Antrean Harian
    const countRes = await db.query(
      'SELECT COUNT(*) FROM visits WHERE visit_date = CURRENT_DATE'
    );
    const queueSeq = parseInt(countRes.rows[0].count) + 1;
    const queue_number = `A-${String(queueSeq).padStart(3, '0')}`;
    const visit_number = `VST-${dateCode}-${String(queueSeq).padStart(4, '0')}`;

    // 2. Ambil detail Pasien, Dokter, dan Lokasi untuk Encounter SATUSEHAT
    const pRes = await db.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    const dRes = await db.query('SELECT * FROM doctors WHERE id = $1', [doctor_id]);
    const lRes = await db.query('SELECT * FROM locations WHERE id = $1', [location_id]);

    const patient = pRes.rows[0];
    const doctor = dRes.rows[0];
    const location = lRes.rows[0];

    if (!patient || !doctor || !location) {
      throw new Error('Data Pasien, Dokter, atau Poli tidak valid.');
    }

    // 3. Simpan Kunjungan ke Database
    const visitInsertSql = `
      INSERT INTO visits (visit_number, queue_number, patient_id, doctor_id, location_id, visit_date, status, notes)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'MENUNGGU', $6)
      RETURNING *
    `;
    const visitRes = await db.query(visitInsertSql, [
      visit_number,
      queue_number,
      patient_id,
      doctor_id,
      location_id,
      notes || ''
    ]);
    const visit = visitRes.rows[0];

    // 4. Buat Tagihan Kasir Awal
    await db.query(
      `INSERT INTO billings (visit_id, consultation_fee, medicine_fee, total_amount, payment_status)
       VALUES ($1, 35000, 0, 35000, 'BELUM_LUNAS')`,
      [visit.id]
    );

    // 5. Integrasi SATUSEHAT: Kirim Encounter awal (status 'arrived')
    if (patient.satusehat_patient_id && doctor.satusehat_practitioner_id) {
      try {
        const encounterPayload = buildEncounterPayload({
          status: 'arrived',
          patientIhs: patient.satusehat_patient_id,
          patientName: patient.full_name,
          doctorIhs: doctor.satusehat_practitioner_id,
          doctorName: doctor.full_name,
          locationId: location.satusehat_location_id || 'b017aa54-f1df-4329-88bc-10f3994a2c3e',
          locationName: location.name,
          orgId: config.orgId,
          periodStart: new Date().toISOString()
        });

        const satusehatRes = await satusehatService.sendEncounter(encounterPayload);
        if (satusehatRes && satusehatRes.id) {
          await db.query(
            'UPDATE visits SET satusehat_encounter_id = $1, satusehat_status = $2 WHERE id = $3',
            [satusehatRes.id, 'arrived', visit.id]
          );
          visit.satusehat_encounter_id = satusehatRes.id;
          visit.satusehat_status = 'arrived';
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi Encounter awal SATUSEHAT:', err.message);
      }
    }

    return visit;
  }

  /**
   * Mengambil daftar kunjungan harian dengan filter
   */
  async getTodayVisits(status = '', doctorId = null) {
    let sql = `
      SELECT 
        v.*,
        p.mr_number, p.nik, p.full_name AS patient_name, p.gender, p.birth_date, p.satusehat_patient_id,
        d.full_name AS doctor_name, d.specialization, d.satusehat_practitioner_id,
        l.name AS location_name,
        b.total_amount, b.payment_status
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN doctors d ON v.doctor_id = d.id
      JOIN locations l ON v.location_id = l.id
      LEFT JOIN billings b ON b.visit_id = v.id
      WHERE v.visit_date = CURRENT_DATE
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND v.status = $${params.length}`;
    }

    if (doctorId) {
      params.push(doctorId);
      sql += ` AND v.doctor_id = $${params.length}`;
    }

    sql += ' ORDER BY v.id ASC';

    const result = await db.query(sql, params);
    return result.rows;
  }

  /**
   * Mengambil detail lengkap kunjungan berdasarkan ID
   */
  async getVisitById(id) {
    const sql = `
      SELECT 
        v.*,
        p.mr_number, p.nik, p.full_name AS patient_name, p.gender, p.birth_date, p.address, p.phone_number, p.satusehat_patient_id,
        d.full_name AS doctor_name, d.specialization, d.sip_number, d.satusehat_practitioner_id,
        l.name AS location_name, l.satusehat_location_id,
        b.consultation_fee, b.medicine_fee, b.total_amount, b.payment_status, b.payment_method
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN doctors d ON v.doctor_id = d.id
      JOIN locations l ON v.location_id = l.id
      LEFT JOIN billings b ON b.visit_id = v.id
      WHERE v.id = $1
    `;
    const result = await db.query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update status kunjungan (misal: DIPERIKSA, FARMASI, SELESAI, BATAL)
   */
  async updateVisitStatus(id, newStatus) {
    const visit = await this.getVisitById(id);
    if (!visit) {
      throw new Error('Kunjungan tidak ditemukan.');
    }

    const result = await db.query(
      'UPDATE visits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    // Update status Encounter di SATUSEHAT jika ada Encounter ID
    if (visit.satusehat_encounter_id) {
      const fhirStatusMap = {
        'MENUNGGU': 'arrived',
        'DIPERIKSA': 'in-progress',
        'FARMASI': 'in-progress',
        'SELESAI': 'finished',
        'BATAL': 'cancelled'
      };
      const fhirStatus = fhirStatusMap[newStatus] || 'in-progress';

      try {
        const payload = buildEncounterPayload({
          encounterId: visit.satusehat_encounter_id,
          status: fhirStatus,
          patientIhs: visit.satusehat_patient_id,
          patientName: visit.patient_name,
          doctorIhs: visit.satusehat_practitioner_id,
          doctorName: visit.doctor_name,
          locationId: visit.satusehat_location_id || 'b017aa54-f1df-4329-88bc-10f3994a2c3e',
          locationName: visit.location_name,
          orgId: config.orgId,
          periodEnd: newStatus === 'SELESAI' ? new Date().toISOString() : undefined
        });

        await satusehatService.sendEncounter(payload);
        await db.query(
          'UPDATE visits SET satusehat_status = $1 WHERE id = $2',
          [fhirStatus, id]
        );
      } catch (err) {
        console.warn('Gagal memperbarui status Encounter SATUSEHAT:', err.message);
      }
    }

    return result.rows[0];
  }

  /**
   * Statistik Dashboard untuk metrik operasional harian klinik
   */
  async getDashboardStats() {
    const statsSql = `
      SELECT
        COUNT(*) AS total_today,
        COUNT(CASE WHEN status = 'MENUNGGU' THEN 1 END) AS waiting,
        COUNT(CASE WHEN status = 'DIPERIKSA' THEN 1 END) AS in_examination,
        COUNT(CASE WHEN status = 'FARMASI' THEN 1 END) AS in_pharmacy,
        COUNT(CASE WHEN status = 'SELESAI' THEN 1 END) AS finished
      FROM visits
      WHERE visit_date = CURRENT_DATE
    `;
    const res = await db.query(statsSql);
    return res.rows[0];
  }
}

const visitService = new VisitService();
export default visitService;
export { visitService };
