// services/BankAccountService.js
const {
  BankAccountModel,
  BankTransactionModel,
  sequelize
} = require("../../models/index");
const { Op } = require("sequelize");

class BankAccountService {
  // Create a new bank account
  static async createBankAccount(accountData) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!accountData.bank_name || !accountData.account_number) {
        throw new Error("Bank name and account number are required");
      }

      // Check if account already exists
      const existingAccount = await BankAccountModel.findOne({
        where: { account_number: accountData.account_number },
      });

      if (existingAccount) {
        throw new Error("Account number already exists");
      }

      // Create bank account
      const bankAccount = await BankAccountModel.create(
        {
          ...accountData,
          current_balance: accountData.initial_balance || 0,
          opening_date: accountData.opening_date || new Date(),
        },
        { transaction }
      );

      // Create initial transaction if initial balance is provided
      if (accountData.initial_balance > 0) {
        await BankTransactionModel.create(
          {
            account_id: bankAccount.account_id,
            transaction_date: bankAccount.opening_date,
            transaction_type: "CREDIT",
            amount: accountData.initial_balance,
            description: "Initial Account Opening Balance",
            balance_after_transaction: accountData.initial_balance,
            is_reconciled: true,
          },
          { transaction }
        );
      }
      console.log("Bank account created successfully: ", bankAccount);
      await transaction.commit();
      return bankAccount;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get all bank accounts
  static async getAllBankAccounts() {
    return BankAccountModel.findAll({
      where: { is_active: true },
      order: [["createdAt", "DESC"]],
    });
  }

  // Get bank account details with transactions
  static async getBankAccountDetails(accountId, filters = {}) {
    const { startDate, endDate } = filters;

    const whereConditions = { account_id: accountId };

    if (startDate && endDate) {
      whereConditions.transaction_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    return BankAccountModel.findOne({
      where: { account_id: accountId },
      include: [
        {
          model: BankTransactionModel,
          as: "transactions",
          where: whereConditions,
          order: [["transaction_date", "DESC"]],
          required: false,
        },
      ],
    });
  }

  // Record bank transaction
  static async recordBankTransaction(transactionData) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!transactionData.account_id || !transactionData.amount) {
        throw new Error("Account ID and amount are required");
      }

      // Find the bank account
      const bankAccount = await BankAccountModel.findByPk(
        transactionData.account_id
      );
      if (!bankAccount) {
        throw new Error("Bank account not found");
      }

      // Calculate new balance
      const currentBalance = parseFloat(bankAccount.current_balance);
      const transactionAmount = parseFloat(transactionData.amount);

      let newBalance;
      if (transactionData.transaction_type === "CREDIT") {
        newBalance = currentBalance + transactionAmount;
      } else {
        newBalance = currentBalance - transactionAmount;
      }

      // Create bank transaction
      const bankTransaction = await BankTransactionModel.create(
        {
          ...transactionData,
          balance_after_transaction: newBalance,
        },
        { transaction }
      );

      // Update bank account balance
      await BankAccountModel.update(
        {
          current_balance: newBalance,
        },
        { transaction }
      );

      await transaction.commit();
      return bankTransaction;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Reconcile bank transactions
  static async reconcileBankTransactions(transactionIds) {
    return BankTransactionModel.update(
      { is_reconciled: true },
      {
        where: {
          transaction_id: {
            [Op.in]: transactionIds,
          },
        },
      }
    );
  }
}

module.exports = BankAccountService;
