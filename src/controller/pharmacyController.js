import pharmacyService from '../services/pharmacyService.js';

class PharmacyController {
  async getMedicines(req, res, next) {
    try {
      const { search } = req.query;
      const data = await pharmacyService.getAllMedicines(search || '');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createMedicine(req, res, next) {
    try {
      const { name, stock, unit_price } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Nama obat wajib diisi.' });
      }
      const data = await pharmacyService.createMedicine(req.body);
      res.status(201).json({ success: true, message: 'Obat berhasil ditambahkan ke katalog.', data });
    } catch (err) {
      next(err);
    }
  }

  async getPendingPrescriptions(req, res, next) {
    try {
      const data = await pharmacyService.getPendingPrescriptions();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async dispenseAndComplete(req, res, next) {
    try {
      const { visit_id, payment_method } = req.body;
      if (!visit_id) {
        return res.status(400).json({ success: false, message: 'ID Kunjungan wajib disertakan.' });
      }

      const data = await pharmacyService.dispenseAndCompleteVisit(visit_id, payment_method || 'TUNAI');
      res.json({
        success: true,
        message: 'Obat telah diserahkan, tagihan lunas, dan kunjungan pasien telah SELESAI (Pulang).',
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

const pharmacyController = new PharmacyController();
export default pharmacyController;
export { pharmacyController };
