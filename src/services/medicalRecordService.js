import db from '../config/db.js';
import visitService from './visitService.js';
import satusehatService from './satusehatService.js';
import {
  buildConditionPayload,
  buildBloodPressureObservation,
  buildVitalSignObservation,
  buildMedicationRequestPayload
} from '../utils/fhirPayload.js';

class MedicalRecordService {
  /**
   * Simpan Pemeriksaan Dokter, Tanda Vital, Diagnosa ICD-10, & E-Resep Obat
   */
  async createMedicalRecord(data) {
    const {
      visit_id,
      chief_complaint,
      physical_exam,
      systolic,
      diastolic,
      heart_rate,
      temperature,
      respiratory_rate,
      icd10_code,
      icd10_display,
      diagnosis_notes,
      treatment_notes,
      prescriptions = [] // Array of { medicine_id, quantity, dosage_instruction }
    } = data;

    const visit = await visitService.getVisitById(visit_id);
    if (!visit) {
      throw new Error('Kunjungan tidak ditemukan.');
    }

    // 1. Simpan Rekam Medis ke Database
    const insertMedRecordSql = `
      INSERT INTO medical_records (
        visit_id, patient_id, doctor_id, chief_complaint, physical_exam,
        systolic, diastolic, heart_rate, temperature, respiratory_rate,
        icd10_code, icd10_display, diagnosis_notes, treatment_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (visit_id) DO UPDATE SET
        chief_complaint = EXCLUDED.chief_complaint,
        physical_exam = EXCLUDED.physical_exam,
        systolic = EXCLUDED.systolic,
        diastolic = EXCLUDED.diastolic,
        heart_rate = EXCLUDED.heart_rate,
        temperature = EXCLUDED.temperature,
        respiratory_rate = EXCLUDED.respiratory_rate,
        icd10_code = EXCLUDED.icd10_code,
        icd10_display = EXCLUDED.icd10_display,
        diagnosis_notes = EXCLUDED.diagnosis_notes,
        treatment_notes = EXCLUDED.treatment_notes
      RETURNING *
    `;

    const medRecordRes = await db.query(insertMedRecordSql, [
      visit_id,
      visit.patient_id,
      visit.doctor_id,
      chief_complaint,
      physical_exam || '',
      systolic ? parseInt(systolic) : null,
      diastolic ? parseInt(diastolic) : null,
      heart_rate ? parseInt(heart_rate) : null,
      temperature ? parseFloat(temperature) : null,
      respiratory_rate ? parseInt(respiratory_rate) : null,
      icd10_code,
      icd10_display,
      diagnosis_notes || '',
      treatment_notes || ''
    ]);

    const medRecord = medRecordRes.rows[0];

    // 2. Simpan E-Resep & Resep Items
    let totalMedicineFee = 0;
    let prescriptionRecord = null;

    if (prescriptions && prescriptions.length > 0) {
      const prescRes = await db.query(
        `INSERT INTO prescriptions (visit_id, doctor_id, status)
         VALUES ($1, $2, 'MENUNGGU_OBAT')
         ON CONFLICT (visit_id) DO UPDATE SET status = 'MENUNGGU_OBAT'
         RETURNING *`,
        [visit_id, visit.doctor_id]
      );
      prescriptionRecord = prescRes.rows[0];

      // Hapus item resep lama jika ada (agar tidak duplicate saat update)
      await db.query('DELETE FROM prescription_items WHERE prescription_id = $1', [prescriptionRecord.id]);

      for (const item of prescriptions) {
        const medRes = await db.query('SELECT * FROM medicines WHERE id = $1', [item.medicine_id]);
        const medicine = medRes.rows[0];
        if (medicine) {
          const qty = parseInt(item.quantity) || 1;
          const unitPrice = parseFloat(medicine.unit_price) || 0;
          const subtotal = qty * unitPrice;
          totalMedicineFee += subtotal;

          const itemRes = await db.query(
            `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage_instruction, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [prescriptionRecord.id, medicine.id, qty, item.dosage_instruction, unitPrice, subtotal]
          );

          // Simpan objek item sementara untuk SATUSEHAT sync
          item.saved_item_id = itemRes.rows[0].id;
          item.medicine = medicine;
        }
      }
    }

    // 3. Update Tagihan Kasir dengan Biaya Obat Baru
    await db.query(
      `UPDATE billings 
       SET medicine_fee = $1, total_amount = consultation_fee + $1
       WHERE visit_id = $2`,
      [totalMedicineFee, visit_id]
    );

    // 4. Ubah status kunjungan menjadi 'FARMASI' (Tahap 3)
    await visitService.updateVisitStatus(visit_id, 'FARMASI');

    // 5. Integrasi SATUSEHAT: Kirim Diagnosa (Condition), Tanda Vital (Observation), dan Resep (MedicationRequest)
    if (visit.satusehat_encounter_id && visit.satusehat_patient_id) {
      try {
        // Kirim Diagnosa (Condition)
        const condPayload = buildConditionPayload({
          encounterId: visit.satusehat_encounter_id,
          patientIhs: visit.satusehat_patient_id,
          icd10Code: icd10_code,
          icd10Display: icd10_display
        });
        const condRes = await satusehatService.sendCondition(condPayload);
        if (condRes && condRes.id) {
          await db.query('UPDATE medical_records SET satusehat_condition_id = $1 WHERE id = $2', [condRes.id, medRecord.id]);
        }

        // Kirim Observasi Tekanan Darah
        if (systolic && diastolic) {
          const bpPayload = buildBloodPressureObservation({
            encounterId: visit.satusehat_encounter_id,
            patientIhs: visit.satusehat_patient_id,
            systolic,
            diastolic
          });
          const bpRes = await satusehatService.sendObservation(bpPayload);
          if (bpRes && bpRes.id) {
            await db.query('UPDATE medical_records SET satusehat_obs_bp_id = $1 WHERE id = $2', [bpRes.id, medRecord.id]);
          }
        }

        // Kirim Observasi Suhu Tubuh
        if (temperature) {
          const tempPayload = buildVitalSignObservation({
            encounterId: visit.satusehat_encounter_id,
            patientIhs: visit.satusehat_patient_id,
            code: '8310-5',
            display: 'Body temperature',
            value: temperature,
            unit: 'C',
            unitCode: 'Cel'
          });
          const tempRes = await satusehatService.sendObservation(tempPayload);
          if (tempRes && tempRes.id) {
            await db.query('UPDATE medical_records SET satusehat_obs_temp_id = $1 WHERE id = $2', [tempRes.id, medRecord.id]);
          }
        }

        // Kirim MedicationRequest untuk setiap obat yang diresepkan
        if (prescriptions && prescriptions.length > 0) {
          for (const item of prescriptions) {
            if (item.medicine && item.saved_item_id) {
              const medReqPayload = buildMedicationRequestPayload({
                encounterId: visit.satusehat_encounter_id,
                patientIhs: visit.satusehat_patient_id,
                doctorIhs: visit.satusehat_practitioner_id,
                kfaCode: item.medicine.kfa_code,
                medicineName: item.medicine.name,
                dosageInstruction: item.dosage_instruction,
                quantity: item.quantity
              });
              const medReqRes = await satusehatService.sendMedicationRequest(medReqPayload);
              if (medReqRes && medReqRes.id) {
                await db.query(
                  'UPDATE prescription_items SET satusehat_medication_req_id = $1 WHERE id = $2',
                  [medReqRes.id, item.saved_item_id]
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi data pemeriksaan ke SATUSEHAT:', err.message);
      }
    }

    return medRecord;
  }

  /**
   * Mengambil rekam medis dan resep obat berdasarkan visit_id
   */
  async getMedicalRecordByVisitId(visitId) {
    const medRes = await db.query('SELECT * FROM medical_records WHERE visit_id = $1', [visitId]);
    const record = medRes.rows[0] || null;

    if (!record) return null;

    // Ambil resep obat terkait
    const prescRes = await db.query(
      `SELECT p.id AS prescription_id, p.status AS prescription_status,
              pi.id AS item_id, pi.medicine_id, pi.quantity, pi.dosage_instruction, pi.unit_price, pi.subtotal,
              m.name AS medicine_name, m.unit, m.kfa_code
       FROM prescriptions p
       JOIN prescription_items pi ON pi.prescription_id = p.id
       JOIN medicines m ON pi.medicine_id = m.id
       WHERE p.visit_id = $1`,
      [visitId]
    );

    record.prescriptions = prescRes.rows;
    return record;
  }
}

const medicalRecordService = new MedicalRecordService();
export default medicalRecordService;
export { medicalRecordService };
