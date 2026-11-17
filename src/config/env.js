import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../backend/.env');

if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(envPath); } catch (e) {}
  }
  try { dotenv.config({ path: envPath }); } catch (e) {}
} else {
  // Coba current working directory .env
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(); } catch (e) {}
  }
  try { dotenv.config(); } catch (e) {}
}
