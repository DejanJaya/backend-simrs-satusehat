import medicalRecordService from '../services/medicalRecordService.js';

class MedicalRecordController {
  async getByVisitId(req, res, next) {
    try {
      const data = await medicalRecordService.getMedicalRecordByVisitId(req.params.visitId);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Rekam medis untuk kunjungan ini belum ada.' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const { visit_id, chief_complaint, icd10_code, icd10_display } = req.body;
      if (!visit_id || !chief_complaint || !icd10_code || !icd10_display) {
        return res.status(400).json({
          success: false,
          message: 'Kunjungan, Keluhan Utama, dan Kode/Nama Diagnosa ICD-10 wajib diisi.'
        });
      }

      const record = await medicalRecordService.createMedicalRecord(req.body);
      res.status(201).json({
        success: true,
        message: 'Pemeriksaan dokter dan e-resep berhasil disimpan, pasien diteruskan ke Farmasi.',
        data: record
      });
    } catch (err) {
      next(err);
    }
  }
}

const medicalRecordController = new MedicalRecordController();
export default medicalRecordController;
export { medicalRecordController };
