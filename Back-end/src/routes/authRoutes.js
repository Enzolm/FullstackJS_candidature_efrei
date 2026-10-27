import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Route d'inscription : POST /api/auth/register
router.post('/register', register);

// Route de connexion : POST /api/auth/login
router.post('/login', login);

export default router;