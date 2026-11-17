import express from 'express';
import medicalRecordController from '../controller/medicalRecordController.js';

const router = express.Router();

router.get('/visit/:visitId', (req, res, next) => medicalRecordController.getByVisitId(req, res, next));
router.post('/', (req, res, next) => medicalRecordController.save(req, res, next));

export default router;
