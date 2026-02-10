import express from 'express';
import { getMe, login, register } from '../controllers/authController.js';
import { protect } from '../middlewares/authMIddleware.js';
const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get("/me", protect, getMe);

export default router;
