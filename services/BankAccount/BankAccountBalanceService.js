// services/BankAccountBalanceService.js
const {
  BankAccount,
  BankTransaction,
  DayBook,
  sequelize,
  BankAccountModel,
  BankTransactionModel,
} = require("../../models/index");
const { Op } = require("sequelize");

class BankAccountBalanceService {
  static async updateAccountBalance(transactionData) {
    const transaction = await sequelize.transaction();
    console.log("Transaction Data:", transactionData);

    try {
      // Validate core required fields
      const requiredFields = ["bank_account_id", "amount", "transaction_type"];
      requiredFields.forEach((field) => {
        if (!transactionData[field]) {
          throw new Error(`${field} is required for balance update`);
        }
      });

      // Find the bank account
      const bankAccount = await this.findBankAccount(
        transactionData.bank_account_id,
        transaction
      );

      // Calculate new balance
      const newBalance = this.calculateNewBalance(
        bankAccount.current_balance,
        transactionData.amount,
        transactionData.transaction_type
      );

      // Validate balance
      this.validateBalance(newBalance);

      // Update bank account balance
      await this.updateBankAccountBalance(bankAccount, newBalance, transaction);

      // Create bank transaction record
      const bankTransaction = await this.createBankTransaction(
        bankAccount,
        {
          ...transactionData,
          description:
            transactionData.description ||
            (transactionData.category
              ? `${transactionData.category} Transaction`
              : "Transaction"),
        },
        newBalance,
        transaction
      );

      await transaction.commit();

      return {
        bankAccount,
        bankTransaction,
        newBalance,
      };
    } catch (error) {
      await transaction.rollback();
      this.handleError(error);
    }
  }

  static async updateAccountBalanceWithComparison(balanceUpdateData) {
    const transaction = await sequelize.transaction();
    console.log("Balance Update Data:", balanceUpdateData);

    try {
      // 1. Comprehensive Validation
      this.validateBalanceUpdateData(balanceUpdateData);

      // 2. Find the primary bank account
      const bankAccount = await this.findBankAccount(
        balanceUpdateData.bank_account_id,
        transaction
      );

      // 3. Handle potential multi-account scenario
      let originalBankAccount = null;
      const isCrossAccountTransaction =
        balanceUpdateData.original_bank_account_id &&
        balanceUpdateData.original_bank_account_id !==
          balanceUpdateData.bank_account_id;

      if (isCrossAccountTransaction) {
        originalBankAccount = await this.findBankAccount(
          balanceUpdateData.original_bank_account_id,
          transaction
        );
      }

      // 5. Find or Create Bank Transaction
      let existingBankTransaction = await this.findBankTransactionByReference(
        balanceUpdateData.reference_number,
        transaction
      );

      if (!existingBankTransaction) {
        existingBankTransaction = await BankTransactionModel.create(
          {
            account_id: balanceUpdateData.bank_account_id,
            transaction_date: new Date(),
            amount: parseFloat(balanceUpdateData.original_amount),
            transaction_type: balanceUpdateData.original_transaction_type,
            reference_number: balanceUpdateData.reference_number,
          },
          { transaction }
        );
      }

      // 6. Advanced Balance Calculation with Detailed Scenarios
      const calculateBalanceAdjustment = (
        currentBalance,
        originalAmount,
        newAmount,
        originalType,
        newType,
        isOriginalAccount = false
      ) => {
        const numCurrentBalance = parseFloat(currentBalance);
        const numOriginalAmount = parseFloat(originalAmount);
        const numNewAmount = parseFloat(newAmount);

        // Scenario for Original Account (Removing Transaction)
        if (isOriginalAccount) {
          if (originalType === "CREDIT") {
            return numCurrentBalance - numOriginalAmount;
          } else {
            return numCurrentBalance + numOriginalAmount;
          }
        }

        // Scenario for New Account (Adding Transaction)
        if (newType === "CREDIT") {
          return numCurrentBalance + numNewAmount;
        } else {
          return numCurrentBalance - numNewAmount;
        }
      };

      // Calculate balances for both accounts
      const newBalance = calculateBalanceAdjustment(
        bankAccount.current_balance,
        balanceUpdateData.original_amount,
        balanceUpdateData.new_amount,
        balanceUpdateData.original_transaction_type,
        balanceUpdateData.new_transaction_type
      );

      // Calculate original account balance if cross-account
      let originalBankAccountBalance = null;
      if (originalBankAccount) {
        originalBankAccountBalance = calculateBalanceAdjustment(
          originalBankAccount.current_balance,
          balanceUpdateData.original_amount,
          balanceUpdateData.new_amount,
          balanceUpdateData.original_transaction_type,
          balanceUpdateData.new_transaction_type,
          true // Indicate this is the original account
        );
      }

      // 7. Comprehensive Balance Validation
      this.validateBalance(newBalance);
      if (originalBankAccountBalance !== null) {
        this.validateBalance(originalBankAccountBalance);
      }

      // 8. Update Primary Bank Account Balance
      await this.updateBankAccountBalance(bankAccount, newBalance, transaction);

      // 9. Update Original Bank Account Balance if Cross-Account
      if (originalBankAccount && originalBankAccountBalance !== null) {
        await this.updateBankAccountBalance(
          originalBankAccount,
          originalBankAccountBalance,
          transaction
        );
      }

      // 10. Update Bank Transaction Details
      const updatedBankTransaction = await existingBankTransaction.update(
        {
          account_id: balanceUpdateData.bank_account_id,
          amount: parseFloat(balanceUpdateData.new_amount),
          transaction_type: balanceUpdateData.new_transaction_type,
          balance_after_transaction: newBalance,
          updated_at: new Date(),
          notes: isCrossAccountTransaction
            ? "Balance adjusted due to cross-account transaction update"
            : "Balance adjusted due to transaction update",
        },
        { transaction }
      );

      // 12. Commit Transaction
      await transaction.commit();

      // 13. Return Comprehensive Result
      return {
        bankAccount,
        originalBankAccount,
        bankTransaction: updatedBankTransaction,
        newBalance,
        originalBankAccountBalance,
        adjustmentTimestamp: new Date(),
      };
    } catch (error) {
      // 14. Robust Error Handling
      await transaction.rollback();

      console.error("Balance Update Error:", {
        message: error.message,
        stack: error.stack,
        data: balanceUpdateData,
      });

      this.handleError(error);
    }
  }

  static validateBalanceUpdateData(data) {
    const requiredFields = [
      "bank_account_id",
      "original_amount",
      "original_transaction_type",
      "new_amount",
      "new_transaction_type",
      "reference_number",
    ];

    // Check for missing required fields
    requiredFields.forEach((field) => {
      if (!data[field]) {
        throw new Error(`${field} is required for balance update`);
      }
    });

    // Validate amounts
    const originalAmount = parseFloat(data.original_amount);
    const newAmount = parseFloat(data.new_amount);

    if (isNaN(originalAmount) || isNaN(newAmount)) {
      throw new Error("Invalid amount format");
    }

    if (originalAmount < 0 || newAmount < 0) {
      throw new Error("Amount cannot be negative");
    }

    // Validate transaction types
    const validTransactionTypes = ["CREDIT", "DEBIT"];
    if (
      !validTransactionTypes.includes(data.original_transaction_type) ||
      !validTransactionTypes.includes(data.new_transaction_type)
    ) {
      throw new Error("Invalid transaction type");
    }
  }

  static validateTransactionData(transactionData) {
    const requiredFields = ["bank_account_id", "amount", "transaction_type"];

    // Check for missing required fields
    requiredFields.forEach((field) => {
      if (!transactionData[field]) {
        throw new Error(`${field} is required`);
      }
    });

    // Validate amount
    const amount = parseFloat(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Validate transaction type
    if (!["CREDIT", "DEBIT"].includes(transactionData.transaction_type)) {
      throw new Error("Invalid transaction type");
    }
  }

  // Enhanced Error Handling
  static handleError(error) {
    // Categorize and handle different types of errors
    if (error.name === "SequelizeValidationError") {
      throw new ValidationError("Invalid balance adjustment data");
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      throw new ConflictError("Duplicate transaction reference");
    }

    // Generic error fallback
    throw new Error(`Balance adjustment failed: ${error.message}`);
  }

  static calculateBalanceAdjustment(
    currentBalance,
    previousAmount,
    newAmount,
    previousTransactionType,
    newTransactionType,
    isOriginalAccount = false // New parameter to differentiate account handling
  ) {
    const numericCurrentBalance = parseFloat(currentBalance);
    const numericPreviousAmount = parseFloat(previousAmount);
    const numericNewAmount = parseFloat(newAmount);

    // Scenario for original account (where the transaction was originally from)
    if (isOriginalAccount) {
      // If the transaction type remains the same
      if (previousTransactionType === newTransactionType) {
        const amountDifference = numericNewAmount - numericPreviousAmount;

        return previousTransactionType === "CREDIT"
          ? numericCurrentBalance - amountDifference // Decrease CREDIT
          : numericCurrentBalance + amountDifference; // Increase DEBIT
      }

      // Changing from CREDIT to DEBIT
      if (
        previousTransactionType === "CREDIT" &&
        newTransactionType === "DEBIT"
      ) {
        return numericCurrentBalance - numericPreviousAmount - numericNewAmount;
      }

      // Changing from DEBIT to CREDIT
      if (
        previousTransactionType === "DEBIT" &&
        newTransactionType === "CREDIT"
      ) {
        return numericCurrentBalance + numericPreviousAmount + numericNewAmount;
      }
    }

    // Scenario for new account (where the transaction is being moved to)
    // Scenario 1: Transaction type remains the same
    if (previousTransactionType === newTransactionType) {
      return newTransactionType === "CREDIT"
        ? numericCurrentBalance + numericNewAmount // Increase for CREDIT
        : numericCurrentBalance - numericNewAmount; // Decrease for DEBIT
    }

    // Scenario 2: Changing from CREDIT to DEBIT
    if (
      previousTransactionType === "CREDIT" &&
      newTransactionType === "DEBIT"
    ) {
      return numericCurrentBalance - numericNewAmount;
    }

    // Scenario 3: Changing from DEBIT to CREDIT
    if (
      previousTransactionType === "DEBIT" &&
      newTransactionType === "CREDIT"
    ) {
      return numericCurrentBalance + numericNewAmount;
    }

    // Fallback
    return numericCurrentBalance;
  }

  /**
   * Find bank account by ID
   * @param {string} bankAccountId
   * @param {Object} transaction
   * @returns {Object} Bank account
   */
  static async findBankAccount(bankAccountId, transaction) {
    const bankAccount = await BankAccountModel.findByPk(bankAccountId, {
      transaction,
    });

    if (!bankAccount) {
      throw new Error("Bank account not found");
    }

    return bankAccount;
  }

  static calculateBalanceAdjustment(
    currentBalance,
    previousAmount,
    newAmount,
    previousTransactionType,
    newTransactionType
  ) {
    const numericCurrentBalance = parseFloat(currentBalance);
    const numericPreviousAmount = parseFloat(previousAmount);
    const numericNewAmount = parseFloat(newAmount);

    // Scenario 1: Transaction type remains the same
    if (previousTransactionType === newTransactionType) {
      const amountDifference = numericNewAmount - numericPreviousAmount;

      return newTransactionType === "CREDIT"
        ? numericCurrentBalance + amountDifference // Increase for CREDIT
        : numericCurrentBalance - amountDifference; // Decrease for DEBIT
    }

    // Scenario 2: Changing from CREDIT to DEBIT
    if (
      previousTransactionType === "CREDIT" &&
      newTransactionType === "DEBIT"
    ) {
      return (
        numericCurrentBalance -
        numericPreviousAmount - // Remove previous CREDIT amount
        numericNewAmount
      ); // Subtract new DEBIT amount
    }

    // Scenario 3: Changing from DEBIT to CREDIT
    if (
      previousTransactionType === "DEBIT" &&
      newTransactionType === "CREDIT"
    ) {
      return (
        numericCurrentBalance +
        numericPreviousAmount + // Add back previous DEBIT amount
        numericNewAmount
      ); // Add new CREDIT amount
    }

    // Fallback (should not happen, but added for safety)
    return numericCurrentBalance;
  }

  /**
   * Calculate new balance based on transaction
   * @param {number} currentBalance
   * @param {number} amount
   * @param {string} transactionType
   * @returns {number} New balance
   */
  static calculateNewBalance(currentBalance, amount, transactionType) {
    const numericCurrentBalance = parseFloat(currentBalance);
    const numericAmount = parseFloat(amount);

    return transactionType === "CREDIT"
      ? numericCurrentBalance + numericAmount // Always increase for CREDIT
      : numericCurrentBalance - numericAmount; // Always decrease for DEBIT
  }

  /**
   * Validate balance to prevent negative balance
   * @param {number} balance
   */
  static validateBalance(balance) {
    if (balance < 0) {
      throw new Error("Insufficient funds");
    }
  }

  static validateTransactionData(transactionData) {
    const requiredFields = ["amount", "transaction_type"];

    // Check for missing required fields
    requiredFields.forEach((field) => {
      if (!transactionData[field]) {
        throw new Error(`${field} is required`);
      }
    });

    // Validate amount
    const amount = parseFloat(transactionData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Validate transaction type
    if (!["CREDIT", "DEBIT"].includes(transactionData.transaction_type)) {
      throw new Error("Invalid transaction type");
    }
  }

  /**
   * Update bank account balance
   * @param {Object} bankAccount
   * @param {number} newBalance
   * @param {Object} transaction
   */
  static async updateBankAccountBalance(bankAccount, newBalance, transaction) {
    await BankAccountModel.update(
      { current_balance: newBalance },
      {
        where: { account_id: bankAccount.account_id },
        transaction,
      }
    );
  }

  static async createBankTransaction(
    bankAccount,
    transactionData,
    newBalance,
    transaction
  ) {
    return BankTransactionModel.create(
      {
        account_id: bankAccount.account_id,
        transaction_date: transactionData.transaction_date || new Date(),
        transaction_type: transactionData.transaction_type,
        amount: parseFloat(transactionData.amount),
        description: transactionData.description || "Transaction",
        balance_after_transaction: newBalance,
        reference_number: transactionData.reference_number,
        category: transactionData.category,
        notes: transactionData.notes,
        is_reconciled: false,
      },
      { transaction }
    );
  }

  static async revertBalanceUpdate(referenceNumber) {
    const transaction = await sequelize.transaction();

    try {
      // Find the bank transaction
      const bankTransaction = await this.findBankTransactionByReference(
        referenceNumber,
        transaction
      );

      // Find the bank account
      const bankAccount = await this.findBankAccount(
        bankTransaction.account_id,
        transaction
      );

      // Calculate revert balance
      const revertedBalance = this.calculateRevertBalance(
        bankAccount.current_balance,
        bankTransaction
      );

      // Update bank account balance
      await this.updateBankAccountBalance(
        bankAccount,
        revertedBalance,
        transaction
      );

      // Delete the bank transaction
      await bankTransaction.destroy({ transaction });

      await transaction.commit();

      return {
        bankAccount,
        newBalance: revertedBalance,
      };
    } catch (error) {
      await transaction.rollback();
      this.handleError(error);
    }
  }

  /**
   * Find bank transaction by reference number
   * @param {string} referenceNumber
   * @param {Object} transaction
   * @returns {Object} Bank transaction
   */
  static async findBankTransactionByReference(referenceNumber, transaction) {
    const bankTransaction = await BankTransactionModel.findOne({
      where: { reference_number: referenceNumber },
      transaction,
    });

    if (!bankTransaction) {
      return null;
      // throw new Error("Bank transaction not found");
    }

    return bankTransaction;
  }

  static validateBalance(balance) {
    if (balance < 0) {
      throw new Error("Insufficient funds");
    }
  }

  static calculateRevertBalance(currentBalance, bankTransaction) {
    const numericCurrentBalance = parseFloat(currentBalance);
    const transactionAmount = parseFloat(bankTransaction.amount);

    return bankTransaction.transaction_type === "CREDIT"
      ? numericCurrentBalance - transactionAmount
      : numericCurrentBalance + transactionAmount;
  }

  /**
   * Update existing bank transaction
   * @param {string} referenceNumber
   * @param {Object} updatedTransactionData
   * @returns {Object} Updated bank transaction details
   */
  static async updateBankTransaction(referenceNumber, updatedTransactionData) {
    const transaction = await sequelize.transaction();

    try {
      // Validate input data
      this.validateTransactionData(updatedTransactionData);

      // Find existing bank transaction
      const existingBankTransaction = await this.findBankTransactionByReference(
        referenceNumber,
        transaction
      );

      // Find the bank account
      const bankAccount = await this.findBankAccount(
        existingBankTransaction.account_id,
        transaction
      );

      // Revert the effect of the existing transaction
      const intermediateBalance = this.revertTransactionEffect(
        bankAccount.current_balance,
        existingBankTransaction
      );

      // Calculate new balance after the updated transaction
      const newBalance = this.calculateNewBalance(
        intermediateBalance,
        updatedTransactionData.amount,
        updatedTransactionData.transaction_type
      );

      // Validate the new balance
      this.validateBalance(newBalance);

      // Update bank account balance
      await this.updateBankAccountBalance(bankAccount, newBalance, transaction);

      // Update bank transaction
      const updatedBankTransaction = await existingBankTransaction.update(
        {
          amount: parseFloat(updatedTransactionData.amount),
          transaction_type: updatedTransactionData.transaction_type,
          description:
            updatedTransactionData.description ||
            existingBankTransaction.description,
          balance_after_transaction: newBalance,
          category: updatedTransactionData.category,
          notes: updatedTransactionData.notes,
          transaction_date:
            updatedTransactionData.transaction_date ||
            existingBankTransaction.transaction_date,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        bankAccount,
        bankTransaction: updatedBankTransaction,
        newBalance,
      };
    } catch (error) {
      await transaction.rollback();
      this.handleError(error);
    }
  }
  /**
   * Handle and log errors
   * @param {Error} error
   */
  static handleError(error) {
    console.error("Bank Account Balance Service Error:", error);
    throw error;
  }

  /**
   * Get bank account statement
   * @param {string} accountId
   * @param {Object} filters
   * @returns {Object} Bank account statement
   */
  static async getBankAccountStatement(accountId, filters = {}) {
    try {
      const { startDate, endDate } = filters;

      // Prepare where conditions
      const whereConditions = { account_id: accountId };
      if (startDate && endDate) {
        whereConditions.transaction_date = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      // Fetch transactions
      const transactions = await BankTransaction.findAll({
        where: whereConditions,
        order: [["transaction_date", "ASC"]],
        include: [
          {
            model: BankAccount,
            as: "account",
          },
        ],
      });

      // Calculate summary
      const summary = this.calculateStatementSummary(transactions);

      return {
        account: transactions[0]?.account,
        transactions,
        summary,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Calculate statement summary
   * @param {Array} transactions
   * @returns {Object} Statement summary
   */
  static calculateStatementSummary(transactions) {
    return transactions.reduce(
      (summary, transaction) => {
        const amount = parseFloat(transaction.amount);

        if (transaction.transaction_type === "CREDIT") {
          summary.totalCredits += amount;
        } else {
          summary.totalDebits += amount;
        }

        summary.closingBalance = parseFloat(
          transaction.balance_after_transaction
        );

        return summary;
      },
      {
        totalCredits: 0,
        totalDebits: 0,
        closingBalance: 0,
      }
    );
  }

  static async deleteBankTransaction(referenceNumber) {
    const transaction = await sequelize.transaction();

    try {
      // Find the bank transaction
      const bankTransaction = await this.findBankTransactionByReference(
        referenceNumber,
        transaction
      );

      // Find the bank account
      const bankAccount = await this.findBankAccount(
        bankTransaction.account_id,
        transaction
      );

      // Calculate the reverted balance
      const revertedBalance = this.revertTransactionEffect(
        bankAccount.current_balance,
        bankTransaction
      );

      // Update bank account balance
      await this.updateBankAccountBalance(
        bankAccount,
        revertedBalance,
        transaction
      );

      // Delete the bank transaction
      await bankTransaction.destroy({ transaction });

      await transaction.commit();

      return {
        bankAccount,
        deletedTransaction: bankTransaction,
        newBalance: revertedBalance,
      };
    } catch (error) {
      await transaction.rollback();
      this.handleError(error);
    }
  }

  static revertTransactionEffect(currentBalance, bankTransaction) {
    const numericCurrentBalance = parseFloat(currentBalance);
    const transactionAmount = parseFloat(bankTransaction.amount);

    // Reverse the transaction effect
    return bankTransaction.transaction_type === "CREDIT"
      ? numericCurrentBalance - transactionAmount // Subtract CREDIT
      : numericCurrentBalance + transactionAmount; // Add back DEBIT
  }

  static calculateRevertedBalanceForDeletion(
    currentBalance,
    transactionAmount,
    transactionType
  ) {
    const numCurrentBalance = parseFloat(currentBalance);
    const numTransactionAmount = parseFloat(transactionAmount);

    // When deleting a CREDIT transaction, subtract the amount from current balance
    if (transactionType === "CREDIT") {
      return numCurrentBalance - numTransactionAmount;
    }

    // When deleting a DEBIT transaction, add the amount back to current balance
    return numCurrentBalance + numTransactionAmount;
  }

  static async revertTransactionBalance(
    balanceRevertData,
    existingTransaction = null
  ) {
    const transaction = existingTransaction || (await sequelize.transaction());
    const shouldCommit = !existingTransaction; // Only commit if we created the transaction

    try {
      // Validate input data
      this.validateBalanceRevertData(balanceRevertData);

      // Find the bank account
      const bankAccount = await this.findBankAccount(
        balanceRevertData.bank_account_id,
        transaction
      );

      // Find the bank transaction
      const bankTransaction = await this.findBankTransactionByReference(
        balanceRevertData.reference_number,
        transaction
      );

      if (!bankTransaction) {
        throw new Error("Bank transaction not found");
      }

      // Calculate reverted balance
      const revertedBalance = this.calculateRevertedBalanceForDeletion(
        bankAccount.current_balance,
        balanceRevertData.amount,
        balanceRevertData.transaction_type
      );

      // Validate the reverted balance
      this.validateBalance(revertedBalance);

      // Update bank account balance
      await this.updateBankAccountBalance(
        bankAccount,
        revertedBalance,
        transaction
      );

      // Delete the bank transaction
      await bankTransaction.destroy({ transaction });

      // Only commit if we created the transaction
      if (shouldCommit) {
        await transaction.commit();
      }

      return {
        bankAccount,
        newBalance: revertedBalance,
        deletedTransaction: bankTransaction,
      };
    } catch (error) {
      // Only rollback if we created the transaction
      if (shouldCommit) {
        await transaction.rollback();
      }

      console.error("Transaction Balance Revert Error:", {
        message: error.message,
        stack: error.stack,
        data: balanceRevertData,
      });

      throw error;
    }
  }

  static calculateRevertedBalanceForDeletion(
    currentBalance,
    transactionAmount,
    transactionType
  ) {
    const numCurrentBalance = parseFloat(currentBalance);
    const numTransactionAmount = parseFloat(transactionAmount);

    // For CREDIT transactions, subtract the amount
    if (transactionType === "CREDIT") {
      return numCurrentBalance - numTransactionAmount;
    }

    // For DEBIT transactions, add the amount back
    return numCurrentBalance + numTransactionAmount;
  }

  static validateBalanceRevertData(data) {
    const requiredFields = [
        "bank_account_id",
        "amount",
        "transaction_type",
        "reference_number"
    ];

    requiredFields.forEach(field => {
        if (!data[field]) {
            throw new Error(`${field} is required for balance reversion`);
        }
    });

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
    }

    if (!["CREDIT", "DEBIT"].includes(data.transaction_type)) {
        throw new Error("Invalid transaction type");
    }
}
}

module.exports = BankAccountBalanceService;
