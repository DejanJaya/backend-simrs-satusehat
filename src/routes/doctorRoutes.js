import express from 'express';
import doctorController from '../controller/doctorController.js';

const router = express.Router();

router.get('/', (req, res, next) => doctorController.getAllDoctors(req, res, next));
router.get('/locations', (req, res, next) => doctorController.getAllLocations(req, res, next));

export default router;
