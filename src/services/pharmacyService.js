import db from '../config/db.js';
import visitService from './visitService.js';
import satusehatService from './satusehatService.js';
import { buildMedicationDispensePayload } from '../utils/fhirPayload.js';

class PharmacyService {
  /**
   * Mengambil daftar master obat
   */
  async getAllMedicines(search = '') {
    let sql = 'SELECT * FROM medicines WHERE is_active = true';
    const params = [];
    if (search.trim()) {
      sql += ' AND (name ILIKE $1 OR kfa_code ILIKE $1)';
      params.push(`%${search.trim()}%`);
    }
    sql += ' ORDER BY name ASC';
    const result = await db.query(sql, params);
    return result.rows;
  }

  /**
   * Menambah obat baru ke katalog
   */
  async createMedicine(data) {
    const { kfa_code, name, form, unit, stock, unit_price } = data;
    const sql = `
      INSERT INTO medicines (kfa_code, name, form, unit, stock, unit_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await db.query(sql, [
      kfa_code || null,
      name,
      form || 'Tablet',
      unit || 'Tablet',
      parseInt(stock) || 0,
      parseFloat(unit_price) || 0
    ]);
    return res.rows[0];
  }

  /**
   * Daftar resep pasien yang siap diproses di bagian farmasi (Status: FARMASI)
   */
  async getPendingPrescriptions() {
    const sql = `
      SELECT 
        v.id AS visit_id, v.visit_number, v.queue_number, v.visit_date,
        p.full_name AS patient_name, p.mr_number, p.nik, p.satusehat_patient_id,
        d.full_name AS doctor_name,
        pr.id AS prescription_id, pr.status AS prescription_status,
        b.consultation_fee, b.medicine_fee, b.total_amount, b.payment_status
      FROM visits v
      JOIN patients p ON v.patient_id = p.id
      JOIN doctors d ON v.doctor_id = d.id
      JOIN prescriptions pr ON pr.visit_id = v.id
      LEFT JOIN billings b ON b.visit_id = v.id
      WHERE v.status = 'FARMASI'
      ORDER BY v.id ASC
    `;
    const result = await db.query(sql);
    const prescriptions = result.rows;

    // Ambil detail items untuk masing-masing resep
    for (const pr of prescriptions) {
      const itemsRes = await db.query(
        `SELECT pi.*, m.name AS medicine_name, m.unit, m.stock AS current_stock, m.kfa_code
         FROM prescription_items pi
         JOIN medicines m ON pi.medicine_id = m.id
         WHERE pi.prescription_id = $1`,
        [pr.prescription_id]
      );
      pr.items = itemsRes.rows;
    }

    return prescriptions;
  }

  /**
   * Proses penyerahan obat & pelunasan kasir (Ambil Obat ➔ Pulang / Kunjungan Selesai)
   */
  async dispenseAndCompleteVisit(visitId, paymentMethod = 'TUNAI') {
    const visit = await visitService.getVisitById(visitId);
    if (!visit) {
      throw new Error('Kunjungan tidak ditemukan.');
    }

    // Ambil resep dan items
    const prescRes = await db.query('SELECT * FROM prescriptions WHERE visit_id = $1', [visitId]);
    const prescription = prescRes.rows[0];
    if (!prescription) {
      throw new Error('Resep untuk kunjungan ini tidak ditemukan.');
    }

    const itemsRes = await db.query(
      `SELECT pi.*, m.name AS medicine_name, m.kfa_code, m.stock
       FROM prescription_items pi
       JOIN medicines m ON pi.medicine_id = m.id
       WHERE pi.prescription_id = $1`,
      [prescription.id]
    );
    const items = itemsRes.rows;

    // 1. Kurangi stok obat di database
    for (const item of items) {
      const newStock = Math.max(0, item.stock - item.quantity);
      await db.query('UPDATE medicines SET stock = $1 WHERE id = $2', [newStock, item.medicine_id]);
    }

    // 2. Update status resep menjadi SUDAH_DISERAHKAN
    await db.query(
      "UPDATE prescriptions SET status = 'SUDAH_DISERAHKAN' WHERE id = $1",
      [prescription.id]
    );

    // 3. Update status pembayaran Kasir menjadi LUNAS
    await db.query(
      `UPDATE billings
       SET payment_status = 'LUNAS', payment_method = $1, paid_at = CURRENT_TIMESTAMP
       WHERE visit_id = $2`,
      [paymentMethod, visitId]
    );

    // 4. Update status kunjungan menjadi 'SELESAI' (Pasien Pulang)
    const completedVisit = await visitService.updateVisitStatus(visitId, 'SELESAI');

    // 5. Integrasi SATUSEHAT: Kirim MedicationDispense untuk setiap obat
    if (visit.satusehat_encounter_id && visit.satusehat_patient_id) {
      try {
        for (const item of items) {
          const dispensePayload = buildMedicationDispensePayload({
            encounterId: visit.satusehat_encounter_id,
            patientIhs: visit.satusehat_patient_id,
            medicationRequestId: item.satusehat_medication_req_id || 'dummy-req-id',
            kfaCode: item.kfa_code,
            medicineName: item.medicine_name,
            quantity: item.quantity
          });

          const dispRes = await satusehatService.sendMedicationDispense(dispensePayload);
          if (dispRes && dispRes.id) {
            await db.query(
              'UPDATE prescription_items SET satusehat_medication_disp_id = $1 WHERE id = $2',
              [dispRes.id, item.id]
            );
          }
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi MedicationDispense SATUSEHAT:', err.message);
      }
    }

    return completedVisit;
  }
}

const pharmacyService = new PharmacyService();
export default pharmacyService;
export { pharmacyService };
