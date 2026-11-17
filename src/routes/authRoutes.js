import express from 'express';
import authController from '../controller/authController.js';

const router = express.Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', (req, res, next) => authController.me(req, res, next));

export default router;
