import db from '../config/db.js';

class DoctorService {
  async getAllDoctors() {
    const result = await db.query(
      'SELECT id, nik, full_name, sip_number, specialization, satusehat_practitioner_id, is_active FROM doctors WHERE is_active = true ORDER BY full_name ASC'
    );
    return result.rows;
  }

  async getDoctorById(id) {
    const result = await db.query('SELECT * FROM doctors WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getAllLocations() {
    const result = await db.query(
      'SELECT id, name, type, satusehat_location_id, is_active FROM locations WHERE is_active = true ORDER BY id ASC'
    );
    return result.rows;
  }
}

const doctorService = new DoctorService();
export default doctorService;
export { doctorService };
