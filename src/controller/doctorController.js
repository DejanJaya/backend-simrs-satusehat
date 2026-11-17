import doctorService from '../services/doctorService.js';

class DoctorController {
  async getAllDoctors(req, res, next) {
    try {
      const data = await doctorService.getAllDoctors();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getAllLocations(req, res, next) {
    try {
      const data = await doctorService.getAllLocations();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

const doctorController = new DoctorController();
export default doctorController;
export { doctorController };
