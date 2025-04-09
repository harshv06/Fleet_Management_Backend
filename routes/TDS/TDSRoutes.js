const express = require('express');
const TDSController = require('../../controllers/TDS/TDSController');
const router = express.Router();

router.get('/TDS/tds-report/current-month', TDSController.getTDSReport);
router.post('/deposit', TDSController.depositTDS);
router.get('/sections', TDSController.getTDSSections);
router.get('/summary', TDSController.getTDSSummary);
router.get('/records', TDSController.getTDSRecords);

module.exports = router;