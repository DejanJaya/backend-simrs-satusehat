import db from '../config/db.js';
import satusehatService from '../services/satusehatService.js';
import config from '../config/satusehat.js';

class SatusehatController {
  /**
   * Status koneksi & konfigurasi SATUSEHAT
   */
  async getStatus(req, res, next) {
    try {
      let isTokenValid = false;
      let error = null;

      try {
        const token = await satusehatService.getAccessToken();
        isTokenValid = !!token;
      } catch (err) {
        error = err.message;
      }

      res.json({
        success: true,
        data: {
          environment: config.env,
          mockMode: config.mockMode,
          orgId: config.orgId,
          clientIdConfigured: !!config.clientId,
          authConnected: isTokenValid,
          baseUrl: config.baseUrl,
          lastError: error
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Log pengiriman SATUSEHAT
   */
  async getLogs(req, res, next) {
    try {
      const { status, limit = 50 } = req.query;
      let sql = 'SELECT * FROM satusehat_logs';
      const params = [];

      if (status) {
        params.push(status);
        sql += ` WHERE sync_status = $${params.length}`;
      }

      sql += ' ORDER BY id DESC LIMIT $' + (params.length + 1);
      params.push(parseInt(limit));

      const result = await db.query(sql, params);
      res.json({ success: true, data: result.rows });
    } catch (err) {
      next(err);
    }
  }
}

const satusehatController = new SatusehatController();
export default satusehatController;
export { satusehatController };
