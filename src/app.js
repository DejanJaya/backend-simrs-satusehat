import './config/env.js';
import express from 'express';
import cors from 'cors';

import patientRoutes from './routes/patientRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import medicalRecordRoutes from './routes/medicalRecordRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import satusehatRoutes from './routes/satusehatRoutes.js';
import authRoutes from './routes/authRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import db from './config/db.js';

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(); } catch (e) {}
}
try { dotenv.config(); } catch (e) {}

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await db.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'SIMRS Klinik Rawat Jalan API',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Route Registrations
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/satusehat', satusehatRoutes);
app.use('/api/auth', authRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Jalankan Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 SIM Klinik Rawat Jalan Backend berjalan di port ${PORT}`);
    console.log(`📡 URL API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

export default app;
