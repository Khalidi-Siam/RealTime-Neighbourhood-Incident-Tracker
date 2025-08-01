const express = require('express');
const router = express.Router();
const { 
    createComment, 
    getCommentsByIncident, 
} = require('../controllers/comment-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { createCommentSchema, incidentCommentParamsSchema } = require('../validators/comment-validator');
const validate = require('../middlewares/validate-middleware');
const validateParams = require('../middlewares/validate-params-middleware');

// All comment routes require authentication
router.post('/:incidentId/comments', validateParams(incidentCommentParamsSchema), authenticateToken, validate(createCommentSchema), createComment);
router.get('/:incidentId/comments', validateParams(incidentCommentParamsSchema), getCommentsByIncident);

module.exports = router;

