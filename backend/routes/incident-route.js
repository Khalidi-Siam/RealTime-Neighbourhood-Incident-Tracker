const express = require('express');
const router = express.Router();

const { createIncident } = require('../controllers/incident-controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth-middleware');
const { createIncidentSchema } = require('../validators/incident-validator');
const validate = require('../middlewares/validate-middleware');
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
// router.post('/submit', verifyToken, upload.single('image'), createIncident);

module.exports = router;