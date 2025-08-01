const express = require('express');
const router = express.Router();
const { 
    createComment, 
    getCommentsByIncident, 
} = require('../controllers/comment-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { createCommentSchema } = require('../validators/comment-validator');
const validate = require('../middlewares/validate-middleware');

// All comment routes require authentication
router.post('/:incidentId/comments', authenticateToken, validate(createCommentSchema), createComment);
router.get('/:incidentId/comments', getCommentsByIncident);

module.exports = router;

