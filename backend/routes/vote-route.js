const express = require('express');
const router = express.Router();
const { 
    voteIncident,
    getIncidentVotes,
    getUserVoteOnIncident
} = require('../controllers/vote-controller');
const { authenticateToken, optionalAuthentication } = require('../middlewares/auth-middleware');
const { voteSchema, voteParamsSchema } = require('../validators/vote-validator');
const validate = require('../middlewares/validate-middleware');
const validateParams = require('../middlewares/validate-params-middleware');
const { actionLimiter } = require('../middlewares/rate-limit-middleware');

// Vote on an incident (requires authentication) - with action rate limiting
router.post('/:incidentId/vote', validateParams(voteParamsSchema), authenticateToken, actionLimiter, validate(voteSchema), voteIncident);

// Get vote counts for an incident (public, but user vote only if authenticated)
router.get('/:incidentId/votes', validateParams(voteParamsSchema), optionalAuthentication, getIncidentVotes);

// Get user's vote on a specific incident (requires authentication)
router.get('/:incidentId/user-vote', validateParams(voteParamsSchema), authenticateToken, getUserVoteOnIncident);

module.exports = router;
