const express = require('express');
const router = express.Router();
const { 
    createFalseReport,
    getUserReportOnIncident
} = require('../controllers/false-report-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
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

module.exports = router;
