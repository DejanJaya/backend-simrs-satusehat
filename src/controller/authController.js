import db from '../config/db.js';
import crypto from 'crypto';

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username dan password wajib diisi.'
        });
      }

      // Cari user di database
      let user = null;
      try {
        const result = await db.query(
          'SELECT id, username, password, full_name, role, is_active FROM users WHERE username = $1',
          [username]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (dbErr) {
        console.warn('Database user query warning:', dbErr.message);
      }

      // Fallback demo users jika database belum di-seed
      const demoAccounts = {
        'admin': { id: 1, username: 'admin', password: 'admin123', full_name: 'Administrator Klinik', role: 'admin' },
        'resepsionis': { id: 2, username: 'resepsionis', password: 'pendaftaran123', full_name: 'Petugas Pendaftaran', role: 'resepsionis' },
        'dokter': { id: 3, username: 'dokter', password: 'dokter123', full_name: 'dr. Budi Santoso, Sp.PD', role: 'dokter' },
        'farmasi': { id: 4, username: 'farmasi', password: 'farmasi123', full_name: 'Apt. Siti Nurhaliza, S.Farm', role: 'farmasi' }
      };

      if (!user && demoAccounts[username]) {
        user = demoAccounts[username];
      }

      if (!user || user.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah.'
        });
      }

      // Generate random session token
      const token = 'simrs_' + crypto.randomBytes(24).toString('hex');

      res.json({
        success: true,
        message: 'Login berhasil.',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          authenticated: true
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

const authController = new AuthController();
export default authController;
export { authController };
