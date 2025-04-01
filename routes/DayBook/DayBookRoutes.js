const express = require("express");
const router = express.Router();
const DayBookController = require("../../controllers/DayBook/DayBookController");
const ReportController=require("../../controllers/DayBook/CategoryReportController")
// const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
// router.use(authenticateToken);

// Base route: /api/daybook

// Get transactions with filters
router.get("/daybook/transactions", DayBookController.getTransactions);

router.get("/daybook/transactions/:transactionId", DayBookController.getTransaction);
// Get monthly report
router.get(
  "/daybook/monthly-report/:year/:month",
  DayBookController.getMonthlyReport
);

// Add new transaction
router.post("/daybook/transactions", DayBookController.addTransaction);

router.put(
  "/daybook/transactions/:transactionId",
  DayBookController.updateTransaction
);

router.delete(
  "/daybook/transactions/:transactionId",
  DayBookController.deleteTransaction
);

// routes/dayBookRoutes.js
router.post(
  "/daybook/opening-balance",
  DayBookController.setInitialOpeningBalance
);
router.get("/daybook/opening-balance", DayBookController.getOpeningBalance); // Add the controller method
router.post("/close-month/:year/:month", DayBookController.closeMonth);
router.get("/daybook/export", DayBookController.exportToExcel);

router.post('/daybook/category-transactions', ReportController.generateTransactionReport);

module.exports = router;
