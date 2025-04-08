// controllers/BankAccountController.js
const BankAccountBalanceService = require("../../services/BankAccount/BankAccountBalanceService");
const BankAccountService = require("../../services/BankAccount/BankAccountService");

class BankAccountController {
  // Create Bank Account
  async createBankAccount(req, res) {
    console.log("Creating bank account");
    try {
      const accountData = req.body;
      const bankAccount = await BankAccountService.createBankAccount(
        accountData
      );
      res.status(201).json({
        status: "success",
        data: bankAccount,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async adjustBalance(req, res) {
    try {
      const balanceUpdateData = req.body;
      console.log("Adjusting balance", balanceUpdateData);
      const result =
        await BankAccountBalanceService.updateAccountBalanceWithComparison(
          balanceUpdateData
        );

      res.status(200).json({
        success: true,
        message: "Balance adjusted successfully",
        data: result,
      });
    } catch (error) {
      console.error("Balance Adjustment Error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to adjust balance",
      });
    }
  }

  // Get All Bank Accounts
  async getAllBankAccounts(req, res) {
    try {
      const bankAccounts = await BankAccountService.getAllBankAccounts();
      res.status(200).json({
        status: "success",
        data: bankAccounts,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  // Get Bank Account Details
  async getBankAccountDetails(req, res) {
    try {
      const { accountId } = req.params;
      const filters = req.query;
      const accountDetails = await BankAccountService.getBankAccountDetails(
        accountId,
        filters
      );
      res.status(200).json({
        status: "success",
        data: accountDetails,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  // Record Bank Transaction
  async recordBankTransaction(req, res) {
    try {
      const transactionData = req.body;
      const bankTransaction = await BankAccountService.recordBankTransaction(
        transactionData
      );
      res.status(201).json({
        status: "success",
        data: bankTransaction,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }

  // Reconcile Bank Transactions
  async reconcileBankTransactions(req, res) {
    try {
      const { transactionIds } = req.body;
      const result = await BankAccountService.reconcileBankTransactions(
        transactionIds
      );
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async updateAccountBalance(req, res) {
    try {
      const { accountId } = req.params;
      const balanceData = req.body;
      console.log("Updating account balance");
      console.log(req.body);
      console.log(req.params);

      const updatedAccount =
        await BankAccountBalanceService.updateAccountBalance({
          bank_account_id: accountId,
          ...balanceData,
        });

      res.status(200).json({
        status: "success",
        data: updatedAccount,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getBankAccountStatement(req, res) {
    try {
      const { accountId } = req.params;
      const filters = req.query;
      const statement = await BankAccountBalanceService.getBankAccountStatement(
        accountId,
        filters
      );
      res.status(200).json({
        status: "success",
        data: statement,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getAllBankBalances(req, res) {
    try {
      const bankBalances = await BankAccountService.getBankAllAccountBalance();
      res.status(200).json({
        status: "success",
        data: bankBalances,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
}

module.exports = new BankAccountController();
