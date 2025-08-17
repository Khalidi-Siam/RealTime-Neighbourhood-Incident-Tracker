const express = require('express');
const router = express.Router();

const { createIncident, getAllIncidents, getIncidentById, deleteIncident } = require('../controllers/incident-controller');
const { authenticateToken, authorizeRoles, optionalAuthentication } = require('../middlewares/auth-middleware');
const { createIncidentSchema, getIncidentParamsSchema } = require('../validators/incident-validator');
const validate = require('../middlewares/validate-middleware');
const validateParams = require('../middlewares/validate-params-middleware');
// const multer = require('multer');
// const path = require('path');


// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });
// const upload = multer({ storage });

router.post('/submit', authenticateToken, validate(createIncidentSchema), createIncident);
router.get('/', optionalAuthentication, getAllIncidents);
router.get('/:id', optionalAuthentication, validateParams(getIncidentParamsSchema), getIncidentById);
router.delete('/:id', authenticateToken, validateParams(getIncidentParamsSchema), deleteIncident);
// router.post('/submit', verifyToken, upload.single('image'), createIncident);

module.exports = router;