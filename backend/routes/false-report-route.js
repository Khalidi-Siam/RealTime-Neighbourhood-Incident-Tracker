const express = require('express');
const router = express.Router();
const { 
    createFalseReport,
    getUserReportOnIncident,
    acceptFalseReport,
    rejectFalseReport,
    getAllReportedIncidents
} = require('../controllers/false-report-controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-middleware');
const { createFalseReportSchema, falseReportParamsSchema } = require('../validators/false-report-validator');
const validate = require('../middlewares/validate-middleware');
const validateParams = require('../middlewares/validate-params-middleware');
const { falseReportLimiter } = require('../middlewares/rate-limit-middleware');

// Report an incident as false (requires authentication) - with strict rate limiting
router.post('/:incidentId/report-false', 
    validateParams(falseReportParamsSchema), 
    authenticateToken,
    falseReportLimiter,
    validate(createFalseReportSchema), 
    createFalseReport
);

// Get user's false report status on a specific incident (requires authentication)
router.get('/:incidentId/user-report', 
    validateParams(falseReportParamsSchema), 
    authenticateToken, 
    getUserReportOnIncident
);

// Admin accepts a false report (requires authentication and admin role)
router.put('/:incidentId/accept', 
    validateParams(falseReportParamsSchema), 
    authenticateToken,
    authorizeRoles('admin'), 
    acceptFalseReport
);

// Admin rejects a false report (requires authentication and admin role)
router.put('/:incidentId/reject', 
    validateParams(falseReportParamsSchema), 
    authenticateToken,
    authorizeRoles('admin'), 
    rejectFalseReport
);

// Admin gets all reported incidents (requires authentication and admin role)
router.get('/admin/reported-incidents', 
    authenticateToken,
    authorizeRoles('admin'), 
    getAllReportedIncidents
);

module.exports = router;
