import express from 'express';
import pharmacyController from '../controller/pharmacyController.js';

const router = express.Router();

router.get('/medicines', (req, res, next) => pharmacyController.getMedicines(req, res, next));
router.post('/medicines', (req, res, next) => pharmacyController.createMedicine(req, res, next));
router.get('/prescriptions/pending', (req, res, next) => pharmacyController.getPendingPrescriptions(req, res, next));
router.post('/dispense', (req, res, next) => pharmacyController.dispenseAndComplete(req, res, next));

export default router;
