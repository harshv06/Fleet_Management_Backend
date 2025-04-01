// routes/bankAccountRoutes.js
const express = require("express");
const BankAccountController = require("../../controllers/BankAccount/BankAccountController");
// const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// router.use(authMiddleware); // Apply authentication middleware

router.get("/accounts/:accountId", BankAccountController.getBankAccountDetails);
router.get("/bank/accounts", BankAccountController.getAllBankAccounts);

router.post("/bank/accounts", BankAccountController.createBankAccount);
router.post("/transactions", BankAccountController.recordBankTransaction);
router.post("/reconcile", BankAccountController.reconcileBankTransactions);

router.put(
  "/bank/accounts/:accountId/balance",
  BankAccountController.updateAccountBalance
);

router.put(
  "/bank/accounts/balance-adjustment",
  BankAccountController.adjustBalance
);

module.exports = router;
