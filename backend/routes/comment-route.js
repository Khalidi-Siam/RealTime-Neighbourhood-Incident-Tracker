const express = require('express');
const router = express.Router();
const { 
    updateComment,
    deleteComment, 
} = require('../controllers/comment-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { updateCommentSchema } = require('../validators/comment-validator');
const validate = require('../middlewares/validate-middleware');

// All comment routes require authentication
router.put('/:id', authenticateToken, validate(updateCommentSchema), updateComment);
router.delete('/:id', authenticateToken, deleteComment);

module.exports = router;

