const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');
const { registerSchema, loginSchema } = require('../validators/auth-validator');
const validate = require('../middlewares/validate-middleware');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-middleware');

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
module.exports = router;