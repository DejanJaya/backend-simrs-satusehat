import express from 'express';
import satusehatController from '../controller/satusehatController.js';

const router = express.Router();

router.get('/status', (req, res, next) => satusehatController.getStatus(req, res, next));
router.get('/logs', (req, res, next) => satusehatController.getLogs(req, res, next));

export default router;
