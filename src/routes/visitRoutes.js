import express from 'express';
import visitController from '../controller/visitController.js';

const router = express.Router();

router.get('/today', (req, res, next) => visitController.getToday(req, res, next));
router.get('/dashboard', (req, res, next) => visitController.getDashboard(req, res, next));
router.get('/:id', (req, res, next) => visitController.getById(req, res, next));
router.post('/', (req, res, next) => visitController.create(req, res, next));
router.patch('/:id/status', (req, res, next) => visitController.updateStatus(req, res, next));

export default router;
