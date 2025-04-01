// routes/financialReportRoutes.js
const express = require("express");
const router = express.Router();
const FinancialReportController = require("../../controllers/FinancialReports/FinancialReportsController");
// const authMiddleware = require('../middleware/authMiddleware'); // Your authentication middleware

router.get(
  "/Profit/financial-breakdown/:startDate/:endDate",
  FinancialReportController.getFinancialGroupBreakdown
);

// Route for Profit and Loss Statement
router.get(
  "/financial/profit-loss",
  //   authMiddleware, // Ensure user is authenticated
  FinancialReportController.getProfitAndLossStatement
);

// Route for Balance Sheet
router.get(
  "/financial/balance-sheet",
  //   authMiddleware, // Ensure user is authenticated
  FinancialReportController.getBalanceSheet
);

module.exports = router;
