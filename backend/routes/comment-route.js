const express = require('express');
const router = express.Router();
const { 
    updateComment,
    deleteComment,
    createReply
} = require('../controllers/comment-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { updateCommentSchema, commentParamsSchema, createReplySchema, replyParamsSchema } = require('../validators/comment-validator');
const validate = require('../middlewares/validate-middleware');
const validateParams = require('../middlewares/validate-params-middleware');

// All comment routes require authentication
router.put('/:id', validateParams(commentParamsSchema), authenticateToken, validate(updateCommentSchema), updateComment);
router.delete('/:id', validateParams(commentParamsSchema), authenticateToken, deleteComment);
router.post('/:commentId/reply', validateParams(replyParamsSchema), authenticateToken, validate(createReplySchema), createReply);

module.exports = router;

