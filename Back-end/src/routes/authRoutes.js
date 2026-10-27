import express from 'express';
import { register, login, resetPassword, changePassword, completeOnboarding, updateProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route d'inscription : POST /api/auth/register
router.post('/register', register);

// Route de connexion : POST /api/auth/login
router.post('/login', login);

// Route de réinitialisation de démonstration : POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

router.put('/password', protect, changePassword);
router.put('/onboarding', protect, completeOnboarding);
router.put('/profile', protect, updateProfile);

export default router;