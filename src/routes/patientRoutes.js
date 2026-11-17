import express from 'express';
import patientController from '../controller/patientController.js';

const router = express.Router();

router.get('/', (req, res, next) => patientController.getAll(req, res, next));
router.get('/:id', (req, res, next) => patientController.getById(req, res, next));
router.post('/', (req, res, next) => patientController.create(req, res, next));
router.get('/check-satusehat/:nik', (req, res, next) => patientController.checkSatusehatNik(req, res, next));
router.post('/:id/sync-satusehat', (req, res, next) => patientController.syncIhs(req, res, next));

export default router;
