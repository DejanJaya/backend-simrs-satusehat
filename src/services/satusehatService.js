import config from '../config/satusehat.js';
import db from '../config/db.js';

class SatusehatService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Mendapatkan OAuth2 Access Token dari SATUSEHAT Kemenkes RI
   */
  async getAccessToken() {
    if (config.mockMode) {
      return 'mock_satusehat_token_bearer_12345';
    }

    const now = Date.now();
    // Gunakan token cache jika masih berlaku (dengan buffer 60 detik)
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    try {
      const params = new URLSearchParams();
      params.append('client_id', config.clientId);
      params.append('client_secret', config.clientSecret);

      const response = await fetch(`${config.authUrl}/accesstoken?grant_type=client_credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Gagal autentikasi SATUSEHAT (HTTP ${response.status})`);
      }

      this.accessToken = data.access_token;
      // Expires_in biasanya dalam satuan detik
      this.tokenExpiresAt = now + (parseInt(data.expires_in || 3600) * 1000);
      return this.accessToken;
    } catch (error) {
      console.warn('⚠️ Gagal mengambil token SATUSEHAT:', error.message);
      throw error;
    }
  }

  /**
   * Catat log pengiriman FHIR ke database
   */
  async logSync(resourceType, resourceId, endpoint, requestPayload, responsePayload, httpStatus, syncStatus, errorMessage) {
    try {
      await db.query(
        `INSERT INTO satusehat_logs 
          (resource_type, resource_id, endpoint, request_payload, response_payload, http_status, sync_status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          resourceType,
          resourceId ? String(resourceId) : null,
          endpoint,
          JSON.stringify(requestPayload || {}),
          JSON.stringify(responsePayload || {}),
          httpStatus || 200,
          syncStatus,
          errorMessage || null
        ]
      );
    } catch (err) {
      console.warn('Gagal mencatat satusehat_log ke DB:', err.message);
    }
  }

  /**
   * Lookup IHS Number Pasien berdasarkan NIK
   */
  async lookupPatientByNik(nik) {
    if (config.mockMode) {
      // Mock deterministic IHS Patient number based on NIK
      const mockIhs = `P${nik.slice(0, 10)}`;
      return {
        ihsNumber: mockIhs,
        name: 'Pasien Terverifikasi (Mode Simulasi)',
        nik: nik
      };
    }

    try {
      const token = await this.getAccessToken();
      const endpoint = `${config.baseUrl}/Patient?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      const data = await response.json();
      const isSuccess = response.ok && data.total > 0;
      const patientResource = isSuccess ? data.entry[0].resource : null;
      const ihsNumber = patientResource ? patientResource.id : null;

      await this.logSync(
        'Patient',
        ihsNumber,
        endpoint,
        { nik },
        data,
        response.status,
        isSuccess ? 'SUCCESS' : 'FAILED',
        isSuccess ? null : 'NIK tidak ditemukan di SATUSEHAT'
      );

      if (!isSuccess || !ihsNumber) {
        return null;
      }

      return {
        ihsNumber,
        name: patientResource.name?.[0]?.text || '',
        gender: patientResource.gender || null,
        birthDate: patientResource.birthDate || null,
        nik
      };
    } catch (err) {
      console.warn(`Error lookupPatientByNik (${nik}):`, err.message);
      await this.logSync('Patient', null, '/Patient', { nik }, null, 500, 'FAILED', err.message);
      return null;
    }
  }

  /**
   * Lookup IHS Number Dokter / Nakes berdasarkan NIK
   */
  async lookupPractitionerByNik(nik) {
    if (config.mockMode) {
      return {
        ihsNumber: `1000${nik.slice(0, 7)}`,
        name: 'Dokter Terverifikasi (Mode Simulasi)'
      };
    }

    try {
      const token = await this.getAccessToken();
      const endpoint = `${config.baseUrl}/Practitioner?identifier=https://fhir.kemkes.go.id/id/nik|${nik}`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      });

      const data = await response.json();
      const isSuccess = response.ok && data.total > 0;
      const resource = isSuccess ? data.entry[0].resource : null;
      const ihsNumber = resource ? resource.id : null;

      return isSuccess ? { ihsNumber, name: resource.name?.[0]?.text || '' } : null;
    } catch (err) {
      console.warn(`Error lookupPractitionerByNik (${nik}):`, err.message);
      return null;
    }
  }

  /**
   * Kirim Encounter (Kunjungan) ke SATUSEHAT
   */
  async sendEncounter(payload) {
    if (config.mockMode) {
      const mockId = payload.id || `ENC-${Date.now()}`;
      await this.logSync('Encounter', mockId, '/Encounter', payload, { id: mockId, status: payload.status }, 201, 'SUCCESS', null);
      return { id: mockId, status: payload.status };
    }

    try {
      const token = await this.getAccessToken();
      const isUpdate = !!payload.id;
      const endpoint = isUpdate ? `${config.baseUrl}/Encounter/${payload.id}` : `${config.baseUrl}/Encounter`;
      const method = isUpdate ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const isSuccess = response.status === 200 || response.status === 201;

      await this.logSync('Encounter', data.id || payload.id, endpoint, payload, data, response.status, isSuccess ? 'SUCCESS' : 'FAILED', isSuccess ? null : JSON.stringify(data));
      return isSuccess ? data : null;
    } catch (err) {
      console.warn('Error sendEncounter:', err.message);
      await this.logSync('Encounter', payload.id, '/Encounter', payload, null, 500, 'FAILED', err.message);
      return null;
    }
  }

  /**
   * Kirim Observation (Tanda Vital) ke SATUSEHAT
   */
  async sendObservation(payload) {
    if (config.mockMode) {
      const mockId = `OBS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await this.logSync('Observation', mockId, '/Observation', payload, { id: mockId }, 201, 'SUCCESS', null);
      return { id: mockId };
    }

    try {
      const token = await this.getAccessToken();
      const endpoint = `${config.baseUrl}/Observation`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const isSuccess = response.status === 200 || response.status === 201;

      await this.logSync('Observation', data.id, endpoint, payload, data, response.status, isSuccess ? 'SUCCESS' : 'FAILED', isSuccess ? null : JSON.stringify(data));
      return isSuccess ? data : null;
    } catch (err) {
      console.warn('Error sendObservation:', err.message);
      await this.logSync('Observation', null, '/Observation', payload, null, 500, 'FAILED', err.message);
      return null;
    }
  }

  /**
   * Kirim Condition (Diagnosa ICD-10) ke SATUSEHAT
   */
  async sendCondition(payload) {
    if (config.mockMode) {
      const mockId = `COND-${Date.now()}`;
      await this.logSync('Condition', mockId, '/Condition', payload, { id: mockId }, 201, 'SUCCESS', null);
      return { id: mockId };
    }

    try {
      const token = await this.getAccessToken();
      const endpoint = `${config.baseUrl}/Condition`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const isSuccess = response.status === 200 || response.status === 201;

      await this.logSync('Condition', data.id, endpoint, payload, data, response.status, isSuccess ? 'SUCCESS' : 'FAILED', isSuccess ? null : JSON.stringify(data));
      return isSuccess ? data : null;
    } catch (err) {
      console.warn('Error sendCondition:', err.message);
      await this.logSync('Condition', null, '/Condition', payload, null, 500, 'FAILED', err.message);
      return null;
    }
  }

  /**
   * Kirim MedicationRequest (Resep Obat) ke SATUSEHAT
   */
  async sendMedicationRequest(payload) {
    if (config.mockMode) {
      const mockId = `MEDREQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await this.logSync('MedicationRequest', mockId, '/MedicationRequest', payload, { id: mockId }, 201, 'SUCCESS', null);
      return { id: mockId };
    }

    try {
      const token = await this.getAccessToken();
      const endpoint = `${config.baseUrl}/MedicationRequest`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const isSuccess = response.status === 200 || response.status === 201;

      await this.logSync('MedicationRequest', data.id, endpoint, payload, data, response.status, isSuccess ? 'SUCCESS' : 'FAILED', isSuccess ? null : JSON.stringify(data));
      return isSuccess ? data : null;
    } catch (err) {
      console.warn('Error sendMedicationRequest:', err.message);
      await this.logSync('MedicationRequest', null, '/MedicationRequest', payload, null, 500, 'FAILED', err.message);
      return null;
    }
  }

  /**
   * Kirim MedicationDispense (Penyerahan Obat Farmasi) ke SATUSEHAT
   */
  async sendMedicationDispense(payload) {
    if (config.mockMode) {
      const mockId = `MEDDISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await this.logSync('MedicationDispense', mockId, '/MedicationDispense', payload, { id: mockId }, 201, 'SUCCESS', null);
      return { id: mockId };
    }

    try {
      const token = await this.getAccessToken();
      const endpoint = `${config.baseUrl}/MedicationDispense`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const isSuccess = response.status === 200 || response.status === 201;

      await this.logSync('MedicationDispense', data.id, endpoint, payload, data, response.status, isSuccess ? 'SUCCESS' : 'FAILED', isSuccess ? null : JSON.stringify(data));
      return isSuccess ? data : null;
    } catch (err) {
      console.warn('Error sendMedicationDispense:', err.message);
      await this.logSync('MedicationDispense', null, '/MedicationDispense', payload, null, 500, 'FAILED', err.message);
      return null;
    }
  }
}

const satusehatService = new SatusehatService();
export default satusehatService;
export { satusehatService };
