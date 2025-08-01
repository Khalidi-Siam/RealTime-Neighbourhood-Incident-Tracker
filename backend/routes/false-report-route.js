const express = require('express');
const router = express.Router();
const { 
    createFalseReport,
    getUserReportOnIncident,
    acceptFalseReport,
    rejectFalseReport
} = require('../controllers/false-report-controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-middleware');
const { createFalseReportSchema, falseReportParamsSchema } = require('../validators/false-report-validator');
const validate = require('../middlewares/validate-middleware');
const validateParams = require('../middlewares/validate-params-middleware');

// Report an incident as false (requires authentication)
router.post('/:incidentId/report-false', 
    validateParams(falseReportParamsSchema), 
    authenticateToken,
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

module.exports = router;
