const express = require("express");
const router = express.Router();

const SalaryCalculationsController = require("../../controllers/SalaryCalculation/SalaryCalculation");

router.post('/salary/salary-calculations', SalaryCalculationsController.create);
router.get('/salary/salary-calculations', SalaryCalculationsController.getAll);
router.put('/salary-calculations/:id/toggle-status', SalaryCalculationsController.toggleStatus);
router.get('/salary-calculations/:id/download', SalaryCalculationsController.downloadExcel);

module.exports = router;
