import patientService from '../services/patientService.js';
import satusehatService from '../services/satusehatService.js';

class PatientController {
  async getAll(req, res, next) {
    try {
      const { search } = req.query;
      const data = await patientService.getAllPatients(search || '');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await patientService.getPatientById(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Pasien tidak ditemukan' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { nik, full_name, birth_date, gender, address, phone_number } = req.body;
      if (!nik || !full_name || !birth_date || !gender) {
        return res.status(400).json({
          success: false,
          message: 'NIK, Nama Lengkap, Tanggal Lahir, dan Jenis Kelamin wajib diisi.'
        });
      }

      const patient = await patientService.createPatient(req.body);
      res.status(201).json({
        success: true,
        message: 'Pasien berhasil didaftarkan.',
        data: patient
      });
    } catch (err) {
      next(err);
    }
  }

  async checkSatusehatNik(req, res, next) {
    try {
      const { nik } = req.params;
      if (!nik) {
        return res.status(400).json({ success: false, message: 'NIK wajib disertakan' });
      }
      const result = await satusehatService.lookupPatientByNik(nik);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'NIK tidak ditemukan di server SATUSEHAT Kemenkes.'
        });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async syncIhs(req, res, next) {
    try {
      const patient = await patientService.syncPatientIhs(req.params.id);
      res.json({
        success: true,
        message: 'IHS SATUSEHAT Pasien berhasil disinkronkan.',
        data: patient
      });
    } catch (err) {
      next(err);
    }
  }
}

const patientController = new PatientController();
export default patientController;
export { patientController };
