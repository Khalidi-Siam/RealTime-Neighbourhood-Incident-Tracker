const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { registerSchema, loginSchema, updateProfileSchema } = require('../validators/auth-validator');
const validate = require('../middlewares/validate-middleware');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-middleware');
const { authLimiter, profileUpdateLimiter } = require('../middlewares/rate-limit-middleware');

// Public routes - with strict rate limiting for auth attempts
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, profileUpdateLimiter, validate(updateProfileSchema), authController.updateProfile);
router.delete('/profile', authenticateToken, authController.deleteProfile);

// Admin only routes
router.get('/admin/users', authenticateToken, authorizeRoles('admin'), authController.getAllUsers);
router.get('/admin/users-count', authenticateToken, authorizeRoles('admin'), authController.getUsersCount);
router.delete('/admin/users/:userId', authenticateToken, authorizeRoles('admin'), authController.adminDeleteUser);

module.exports = router;