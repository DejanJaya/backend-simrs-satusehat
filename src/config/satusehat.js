import './env.js';

export const satusehatConfig = {
  get env() {
    return process.env.SATUSEHAT_ENV || 'staging';
  },
  get authUrl() {
    return process.env.SATUSEHAT_AUTH_URL || 'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1';
  },
  get baseUrl() {
    return process.env.SATUSEHAT_BASE_URL || 'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1';
  },
  get orgId() {
    return process.env.SATUSEHAT_ORG_ID || '18f72a06-417c-4467-b397-ba58a1dfff37';
  },
  get clientId() {
    return process.env.SATUSEHAT_CLIENT_ID || '';
  },
  get clientSecret() {
    return process.env.SATUSEHAT_CLIENT_SECRET || '';
  },
  get mockMode() {
    return process.env.SATUSEHAT_MOCK_MODE === 'true' || !process.env.SATUSEHAT_CLIENT_ID;
  },
};

export default satusehatConfig;
