import visitService from '../services/visitService.js';

class VisitController {
  async getToday(req, res, next) {
    try {
      const { status, doctor_id } = req.query;
      const data = await visitService.getTodayVisits(status || '', doctor_id || null);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await visitService.getVisitById(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Kunjungan tidak ditemukan.' });
      }
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { patient_id, doctor_id, location_id, notes } = req.body;
      if (!patient_id || !doctor_id || !location_id) {
        return res.status(400).json({
          success: false,
          message: 'Pasien, Dokter, dan Poli/Lokasi wajib dipilih.'
        });
      }

      const visit = await visitService.createVisit({
        patient_id,
        doctor_id,
        location_id,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Pendaftaran kunjungan & antrean berhasil dibuat.',
        data: visit
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'Status baru wajib disertakan.' });
      }
      const data = await visitService.updateVisitStatus(req.params.id, status);
      res.json({ success: true, message: `Status kunjungan diubah menjadi ${status}`, data });
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const data = await visitService.getDashboardStats();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

const visitController = new VisitController();
export default visitController;
export { visitController };
