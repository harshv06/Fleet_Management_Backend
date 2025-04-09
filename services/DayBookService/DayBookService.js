// services/DayBookService.js
const {
  DayBook,
  MonthlyBalance,
  sequelize,
  OpeningBalance,
  TDS,
} = require("../../models/index");
const { Op } = require("sequelize");
const XLSX = require("xlsx");
const moment = require("moment");
const BankAccountService = require("../BankAccount/BankAccountService");

class DayBookService {
  static async addTransaction(transactionData) {
    const transaction = await sequelize.transaction();
    try {
      // console.log("Incoming transaction data:", transactionData);

      const { transaction_date } = transactionData;
      // console.log("Incoming transaction data:", transactionData);
      const processedDate = moment
        .utc(transactionData.transaction_date)
        .toDate();
      console.log("Processed date:", processedDate);
      // Validate required fields
      if (
        !transactionData.transaction_date ||
        !transactionData.amount ||
        !transactionData.transaction_type ||
        !transactionData.description ||
        !transactionData.account_head ||
        !transactionData.voucher_type
      ) {
        throw new Error("Missing required fields");
      }

      // Validate transaction type
      if (!["CREDIT", "DEBIT"].includes(transactionData.transaction_type)) {
        throw new Error("Invalid transaction type");
      }

      // Validate amount
      if (
        isNaN(parseFloat(transactionData.amount)) ||
        parseFloat(transactionData.amount) <= 0
      ) {
        throw new Error("Invalid amount");
      }

      // Handle GST calculations if applicable
      let gstAmount = 0;
      if (transactionData.gst_applicable && transactionData.gst_rate) {
        gstAmount =
          (parseFloat(transactionData.amount) *
            parseFloat(transactionData.gst_rate)) /
          100;
        transactionData.gst_amount = gstAmount;
      }

      // Get the previous balance
      const previousTransaction = await DayBook.findOne({
        where: {
          transaction_date: {
            [Op.lte]: new Date(transactionData.transaction_date),
          },
        },
        order: [
          ["transaction_date", "DESC"],
          ["created_at", "DESC"],
        ],
        transaction,
      });

      const openingBalanceRecord = await OpeningBalance.findOne({
        where: {
          set_date: {
            [Op.lte]: new Date(transactionData.transaction_date),
          },
          is_monthly_set: true,
        },
        order: [["set_date", "DESC"]],
        transaction,
      });

      let previousBalance = 0;
      if (openingBalanceRecord) {
        previousBalance = parseFloat(openingBalanceRecord.amount);
      }

      if (previousTransaction) {
        previousBalance = parseFloat(previousTransaction.balance);
      }

      // Calculate new balance including GST if applicable
      const amount = parseFloat(transactionData.amount);
      const newBalance =
        transactionData.transaction_type === "CREDIT"
          ? previousBalance + amount
          : previousBalance - amount;

      // Format the data
      const formattedData = {
        ...transactionData,
        amount: amount,
        transaction_date: processedDate,
        balance: newBalance,
        gst_amount: gstAmount,
        gst_applicable: Boolean(transactionData.gst_applicable),
        gst_rate: transactionData.gst_rate
          ? parseFloat(transactionData.gst_rate)
          : null,
        company_id:
          transactionData.party_type === "Employee"
            ? null
            : transactionData.company_id,
        car_id:
          transactionData.party_type === "Employee"
            ? transactionData.car_id
            : null,
      };

      Object.keys(formattedData).forEach((key) => {
        if (formattedData[key] === undefined || formattedData[key] === "") {
          delete formattedData[key];
        }
      });

      // console.log("Formatted data before creation:", formattedData);

      // Create the transaction
      const newTransaction = await DayBook.create(formattedData, {
        transaction,
      });

      // Recalculate balances
      await this.recalculateBalances(
        formattedData.transaction_date,
        transaction
      );
      await this.updateMonthlyBalances(
        formattedData.transaction_date,
        transaction
      );

      await transaction.commit();
      return newTransaction;
    } catch (error) {
      console.error("Error in addTransaction:", error);
      await transaction.rollback();
      throw error;
    }
  }
  static async getTransactions(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        type,
        category,
        account_head,
        bank_account_id,
        voucher_type,
        party_type,
        page = 1,
        limit = 20, // Default page size
      } = filters;

      const whereConditions = {};
      const orderConditions = [];

      // Date filtering
      if (startDate && endDate) {
        whereConditions.transaction_date = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      if (bank_account_id) {
        whereConditions.bank_account_id = bank_account_id;
      }

      // Additional filter conditions
      if (type && type !== "all") whereConditions.transaction_type = type;
      if (category && category !== "all") whereConditions.category = category;
      if (account_head && account_head !== "all")
        whereConditions.account_head = account_head;
      if (voucher_type && voucher_type !== "all")
        whereConditions.voucher_type = voucher_type;
      if (party_type && party_type !== "all")
        whereConditions.party_type = party_type;

      // Sorting logic
      orderConditions.push(["transaction_date", "DESC"]);
      orderConditions.push(["created_at", "DESC"]);

      // Pagination
      const offset = (page - 1) * limit;

      // Find and count transactions
      const { count, rows: transactions } = await DayBook.findAndCountAll({
        where: whereConditions,
        order: orderConditions,
        limit: limit,
        offset: offset,
        attributes: [
          "transaction_id",
          "transaction_date",
          "description",
          "transaction_type",
          "amount",
          "category",
          "payment_method",
          "reference_number",
          "balance",
          "notes",
          "account_head",
          "sub_group",
          "voucher_type",
          "voucher_number",
          "gst_applicable",
          "gst_amount",
          "gst_rate",
          "narration",
          "party_name",
          "party_type",
          "created_at",
          "updated_at",
          "company_id",
          "car_id",
          "bank_account_id",
          "tds_applicable",
          "tds_amount",
          "tds_rate",
          "tds_section",
          "tds_percentage",
        ],
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(count / limit);
      // console.log("Total Pages:", transactions);
      return {
        transactions,
        pagination: {
          total: count,
          page: page,
          pageSize: limit,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTransaction(identifier) {
    try {
      return await DayBook.findOne({
        where: {
          transaction_id: identifier,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async getMonthlyBalance(year, month) {
    try {
      return await MonthlyBalance.findOne({
        where: {
          year: parseInt(year),
          month: parseInt(month),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  static async getMonthlyReport(year, month) {
    try {
      const [monthlyBalance, transactions, bankAccounts] = await Promise.all([
        this.getMonthlyBalance(year, month),
        this.getTransactions({
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0, 23, 59, 59),
        }),
        BankAccountService.getAllBankAccounts(), // Add this to fetch all bank accounts
      ]);

      const totalCurrentBalance = bankAccounts.reduce((total, account) => {
        // Remove leading zeros and parse
        const balance =
          parseFloat(
            typeof account.current_balance === "string"
              ? account.current_balance.replace(/^0+/, "")
              : account.current_balance
          ) || 0;
        return total + balance;
      }, 0);
      // console.log("Total Current Balance:", totalCurrentBalance);
      return {
        monthlyBalance: monthlyBalance || {
          opening_balance: 0,
          closing_balance: 0,
          total_credits: 0,
          total_debits: 0,
        },
        transactions,
        bankAccounts, // Include bank accounts in the return
        totalCurrentBalance, // Add total current balance
      };
    } catch (error) {
      throw error;
    }
  }

  static async handleTDSRecordForUpdate(
    transaction,
    updateData,
    sequelizeTransaction
  ) {
    try {
      // Determine financial year
      const currentDate = new Date(transaction.transaction_date);
      const financialYear = this.getFinancialYear(currentDate);

      // Calculate TDS amount
      const tdsAmount =
        updateData.tds_amount ||
        (parseFloat(transaction.amount) *
          parseFloat(updateData.tds_percentage || 0)) /
          100;

      // Check if TDS record already exists for this transaction
      let existingTDSRecord = await TDS.findOne({
        where: {
          transaction_id: transaction.transaction_id,
        },
        transaction: sequelizeTransaction,
      });

      const tdsRecordData = {
        company_id: transaction.company_id,
        transaction_id: transaction.transaction_id,
        financial_year: financialYear,
        tds_amount: tdsAmount,
        tds_rate: parseFloat(updateData.tds_percentage || 0),
        tds_section: updateData.tds_section || null,
        invoice_number: transaction.reference_number,
        invoice_date: currentDate,
        payment_date: currentDate,
        payment_status: "COLLECTED",
        remarks: updateData.tds_remarks || null,
      };

      if (existingTDSRecord) {
        // Update existing TDS record
        await existingTDSRecord.update(tdsRecordData, {
          transaction: sequelizeTransaction,
        });
      } else {
        // Create new TDS record
        await TDS.create(tdsRecordData, {
          transaction: sequelizeTransaction,
        });
      }
    } catch (error) {
      console.error("Error handling TDS record:", error);
      throw error;
    }
  }

  static getFinancialYear(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Financial year starts from April
    if (month >= 3) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  // Method to deposit TDS
  static async depositTDS(tdsRecordId, depositDetails) {
    const transaction = await sequelize.transaction();
    try {
      const tdsRecord = await TDSRecord.findByPk(tdsRecordId, { transaction });

      if (!tdsRecord) {
        throw new Error("TDS Record not found");
      }

      await tdsRecord.update(
        {
          payment_status: "DEPOSITED",
          deposited_date: depositDetails.deposited_date || new Date(),
          remarks: depositDetails.remarks || tdsRecord.remarks,
        },
        { transaction }
      );

      await transaction.commit();
      return tdsRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Method to get TDS records
  static async getTDSRecords(filters = {}) {
    try {
      const {
        company_id,
        financial_year,
        payment_status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = filters;

      const whereConditions = {};

      if (company_id) whereConditions.company_id = company_id;
      if (financial_year) whereConditions.financial_year = financial_year;
      if (payment_status) whereConditions.payment_status = payment_status;

      if (startDate && endDate) {
        whereConditions.payment_date = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      const { count, rows } = await TDSRecord.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Company,
            as: "company",
            attributes: ["company_name"],
          },
        ],
        order: [["payment_date", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });

      return {
        tdsRecords: rows,
        pagination: {
          total: count,
          page,
          pageSize: limit,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateTransaction(identifier, updateData) {
    console.log("update Data:", updateData);
    const transaction = await sequelize.transaction();
    try {
      // Find existing transaction using either transaction_id or reference_number
      let existingTransaction;

      // First, try to find by transaction_id
      if (identifier.includes("-")) {
        // Assuming UUID format
        existingTransaction = await DayBook.findByPk(identifier, {
          transaction,
        });
      }

      // If not found, try to find by reference_number
      if (!existingTransaction) {
        existingTransaction = await DayBook.findOne({
          where: {
            [Op.or]: [{ reference_number: identifier }],
          },
          transaction,
        });
      }

      // Throw error if transaction not found
      if (!existingTransaction) {
        throw new Error("Transaction not found");
      }

      // Validate update data
      if (
        updateData.amount &&
        (isNaN(parseFloat(updateData.amount)) ||
          parseFloat(updateData.amount) <= 0)
      ) {
        throw new Error("Invalid amount");
      }

      if (
        updateData.transaction_type &&
        !["CREDIT", "DEBIT"].includes(updateData.transaction_type)
      ) {
        throw new Error("Invalid transaction type");
      }

      // Format update data
      const formattedUpdateData = {
        ...updateData,
        amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
        transaction_date: updateData.transaction_date
          ? new Date(updateData.transaction_date)
          : undefined,
      };

      // Determine the earliest date affected
      const startDate = new Date(
        Math.min(
          new Date(existingTransaction.transaction_date),
          formattedUpdateData.transaction_date ||
            new Date(existingTransaction.transaction_date)
        )
      );

      const previousTransaction = await DayBook.findOne({
        where: {
          transaction_date: {
            [Op.lt]: existingTransaction.transaction_date,
          },
        },
        order: [
          ["transaction_date", "DESC"],
          ["created_at", "DESC"],
        ],
        transaction,
      });

      // Get the opening balance record
      const openingBalanceRecord = await OpeningBalance.findOne({
        order: [["set_date", "ASC"]],
        transaction,
      });

      let previousBalance = 0;
      if (openingBalanceRecord) {
        previousBalance = parseFloat(openingBalanceRecord.amount);
      }

      if (previousTransaction) {
        previousBalance = parseFloat(previousTransaction.balance);
      }

      // Calculate new balance
      const amount = parseFloat(
        updateData.amount || existingTransaction.amount
      );
      const transactionType =
        updateData.transaction_type || existingTransaction.transaction_type;

      const newBalance =
        transactionType === "CREDIT"
          ? previousBalance + amount
          : previousBalance - amount;

      const updatedTransaction = await existingTransaction.update(
        {
          ...formattedUpdateData,
          balance: newBalance,
        },
        { transaction }
      );

      if (updateData.tds_applicable) {
        await this.handleTDSRecordForUpdate(
          updatedTransaction,
          updateData,
          transaction
        );
      }

      // Recalculate all subsequent balances
      await this.recalculateBalances(startDate, transaction);

      // Update monthly balances
      await this.updateMonthlyBalances(startDate, transaction);

      await transaction.commit();
      return updatedTransaction;
    } catch (error) {
      console.error("Error in updateTransaction:", error);
      await transaction.rollback();
      throw error;
    }
  }

  static async deleteTransaction(transactionId) {
    const transaction = await sequelize.transaction();
    console.log("Deleting transaction:", transactionId);

    try {
      // Transaction identification logic (same as before)
      let existingTransaction;
      if (transactionId.includes("-")) {
        existingTransaction = await DayBook.findOne({
          where: { transaction_id: transactionId },
          transaction,
        });
      } else {
        existingTransaction = await DayBook.findOne({
          where: { reference_number: transactionId },
          transaction,
        });
      }

      if (!existingTransaction) {
        throw new Error("Transaction not found");
      }

      // If this transaction is linked to a bank account, handle bank transaction deletion
      if (existingTransaction.bank_account_id) {
        const bankAccountBalanceService = require("../BankAccount/BankAccountBalanceService");

        await bankAccountBalanceService.revertTransactionBalance(
          {
            bank_account_id: existingTransaction.bank_account_id,
            amount: existingTransaction.amount,
            transaction_type: existingTransaction.transaction_type,
            reference_number: existingTransaction.reference_number,
          },
          transaction
        );
      }

      const affectedDate = new Date(existingTransaction.transaction_date);

      // Get the opening balance record
      const openingBalanceRecord = await OpeningBalance.findOne({
        order: [["set_date", "ASC"]],
        transaction,
      });

      // Get the balance just before the affected date
      const previousTransaction = await DayBook.findOne({
        where: {
          transaction_date: {
            [Op.lt]: affectedDate,
          },
        },
        order: [
          ["transaction_date", "DESC"],
          ["created_at", "DESC"],
        ],
        transaction,
      });

      // Determine initial balance
      let initialBalance = openingBalanceRecord
        ? parseFloat(openingBalanceRecord.amount)
        : 0;

      if (previousTransaction) {
        initialBalance = parseFloat(previousTransaction.balance);
      }

      // Delete the transaction
      await existingTransaction.destroy({ transaction });

      // Get all transactions from the affected date onwards
      const remainingTransactions = await DayBook.findAll({
        where: {
          transaction_date: {
            [Op.gte]: affectedDate,
          },
        },
        order: [
          ["transaction_date", "ASC"],
          ["created_at", "ASC"],
        ],
        transaction,
      });

      // Recalculate balances
      let runningBalance = initialBalance;
      for (const trans of remainingTransactions) {
        runningBalance =
          trans.transaction_type === "CREDIT"
            ? runningBalance + parseFloat(trans.amount)
            : runningBalance - parseFloat(trans.amount);

        await trans.update({ balance: runningBalance }, { transaction });
      }

      // Comprehensive Monthly Balance Update
      const startOfMonth = new Date(
        affectedDate.getFullYear(),
        affectedDate.getMonth(),
        1
      );

      // Find all affected months
      const affectedMonths = await DayBook.findAll({
        attributes: [
          [
            sequelize.fn(
              "DISTINCT",
              sequelize.fn(
                "DATE_TRUNC",
                "month",
                sequelize.col("transaction_date")
              )
            ),
            "month",
          ],
        ],
        where: {
          transaction_date: {
            [Op.gte]: startOfMonth,
          },
        },
        order: [
          [
            sequelize.fn(
              "DATE_TRUNC",
              "month",
              sequelize.col("transaction_date")
            ),
            "ASC",
          ],
        ],
        raw: true,
        transaction,
      });

      // Process each affected month
      for (const { month } of affectedMonths) {
        const monthDate = new Date(month);
        const monthStart = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          1
        );
        const monthEnd = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0,
          23,
          59,
          59
        );

        // Get previous month's balance
        const prevMonthBalance = await MonthlyBalance.findOne({
          where: {
            year:
              monthStart.getMonth() === 0
                ? monthStart.getFullYear() - 1
                : monthStart.getFullYear(),
            month: monthStart.getMonth() === 0 ? 12 : monthStart.getMonth(),
          },
          transaction,
        });

        // Get transactions for the month
        const monthTransactions = await DayBook.findAll({
          where: {
            transaction_date: {
              [Op.between]: [monthStart, monthEnd],
            },
          },
          order: [["transaction_date", "ASC"]],
          transaction,
        });

        // Calculate monthly totals
        const monthlyTotals = monthTransactions.reduce(
          (acc, trans) => {
            const amount = parseFloat(trans.amount);
            if (trans.transaction_type === "CREDIT") {
              acc.credits += amount;
            } else {
              acc.debits += amount;
            }
            return acc;
          },
          { credits: 0, debits: 0 }
        );

        // Determine opening and closing balances
        const openingBalance = prevMonthBalance
          ? prevMonthBalance.closing_balance
          : 0;
        const closingBalance =
          openingBalance + monthlyTotals.credits - monthlyTotals.debits;

        // Update or create monthly balance
        let monthlyBalance = await MonthlyBalance.findOne({
          where: {
            year: monthStart.getFullYear(),
            month: monthStart.getMonth() + 1,
          },
          transaction,
        });

        if (monthlyBalance) {
          await monthlyBalance.update(
            {
              opening_balance: openingBalance,
              closing_balance: closingBalance,
              total_credits: monthlyTotals.credits,
              total_debits: monthlyTotals.debits,
            },
            { transaction }
          );
        } else if (monthTransactions.length > 0) {
          await MonthlyBalance.create(
            {
              year: monthStart.getFullYear(),
              month: monthStart.getMonth() + 1,
              opening_balance: openingBalance,
              closing_balance: closingBalance,
              total_credits: monthlyTotals.credits,
              total_debits: monthlyTotals.debits,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      return existingTransaction;
    } catch (error) {
      console.error("Error in deleteTransaction:", error);
      await transaction.rollback();
      throw error;
    }
  }

  static async setInitialOpeningBalance(amount, date, notes = "") {
    const transaction = await sequelize.transaction();
    try {
      // Check if opening balance already exists
      const existingOpeningBalance = await OpeningBalance.findOne({
        transaction,
      });

      if (existingOpeningBalance) {
        throw new Error("Opening balance has already been set");
      }

      // Create opening balance record
      const openingBalance = await OpeningBalance.create(
        {
          amount,
          set_date: date,
          notes,
        },
        { transaction }
      );

      // Create monthly balance for the initial month
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      await MonthlyBalance.create(
        {
          year,
          month,
          opening_balance: amount,
          closing_balance: amount,
          total_credits: 0,
          total_debits: 0,
        },
        { transaction }
      );

      await transaction.commit();
      return openingBalance;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async closeMonth(year, month) {
    const transaction = await sequelize.transaction();
    try {
      const currentMonthBalance = await MonthlyBalance.findOne({
        where: { year, month },
        transaction,
      });

      if (!currentMonthBalance) {
        throw new Error("Monthly balance not found");
      }

      if (currentMonthBalance.is_closed) {
        throw new Error("Month has already been closed");
      }

      // Calculate next month and year
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      // Check if next month's balance already exists
      const nextMonthBalance = await MonthlyBalance.findOne({
        where: { year: nextYear, month: nextMonth },
        transaction,
      });

      if (nextMonthBalance) {
        throw new Error("Next month balance already exists");
      }

      // Create next month's balance with current month's closing balance
      await MonthlyBalance.create(
        {
          year: nextYear,
          month: nextMonth,
          opening_balance: currentMonthBalance.closing_balance,
          closing_balance: currentMonthBalance.closing_balance,
          total_credits: 0,
          total_debits: 0,
        },
        { transaction }
      );

      // Mark current month as closed
      await currentMonthBalance.update(
        {
          is_closed: true,
          closed_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async getOpeningBalance() {
    try {
      const openingBalance = await OpeningBalance.findOne({
        order: [["set_date", "DESC"]],
        where: {
          set_date: {
            [Op.lte]: new Date(), // Ensure it's not in the future
          },
        },
      });
      return openingBalance;
    } catch (error) {
      throw error;
    }
  }

  static async recalculateBalances(startDate, transaction) {
    try {
      // Get the opening balance or the balance of the last transaction before the start date
      const previousTransaction = await DayBook.findOne({
        where: {
          transaction_date: {
            [Op.lt]: startDate,
          },
        },
        order: [
          ["transaction_date", "DESC"],
          ["created_at", "DESC"],
        ],
        transaction,
      });

      // Get the opening balance record
      const openingBalanceRecord = await OpeningBalance.findOne({
        order: [["set_date", "ASC"]],
        transaction,
      });

      let runningBalance = openingBalanceRecord
        ? parseFloat(openingBalanceRecord.amount)
        : 0;

      if (previousTransaction) {
        runningBalance = parseFloat(previousTransaction.balance);
      }

      // Get all transactions from the start date onwards
      const transactions = await DayBook.findAll({
        where: {
          transaction_date: {
            [Op.gte]: startDate,
          },
        },
        order: [
          ["transaction_date", "ASC"],
          ["created_at", "ASC"],
        ],
        transaction,
      });

      // Recalculate all balances
      for (const trans of transactions) {
        runningBalance =
          trans.transaction_type === "CREDIT"
            ? runningBalance + parseFloat(trans.amount)
            : runningBalance - parseFloat(trans.amount);

        // Only update if the calculated balance is different
        if (parseFloat(trans.balance) !== runningBalance) {
          await trans.update({ balance: runningBalance }, { transaction });
        }
      }

      return runningBalance;
    } catch (error) {
      console.error("Error in recalculateBalances:", error);
      throw error;
    }
  }

  static async updateMonthlyBalances(startDate, transaction) {
    try {
      // Fetch total current bank balance
      const bankAccounts = await BankAccountService.getAllBankAccounts();
      const totalCurrentBalance = bankAccounts.reduce((total, account) => {
        const balance =
          parseFloat(
            typeof account.current_balance === "string"
              ? account.current_balance.replace(/^0+/, "")
              : account.current_balance
          ) || 0;
        return total + balance;
      }, 0);

      // Get all affected months
      const months = await DayBook.findAll({
        attributes: [
          [
            sequelize.fn(
              "DISTINCT",
              sequelize.fn(
                "DATE_TRUNC",
                "month",
                sequelize.col("transaction_date")
              )
            ),
            "month",
          ],
        ],
        where: {
          transaction_date: {
            [Op.gte]: startDate,
          },
        },
        order: [
          [
            sequelize.fn(
              "DATE_TRUNC",
              "month",
              sequelize.col("transaction_date")
            ),
            "ASC",
          ],
        ],
        raw: true,
        transaction,
      });

      // Use total current balance as the initial opening balance
      let previousMonthClosingBalance = totalCurrentBalance;

      for (const { month } of months) {
        const monthStart = new Date(month);
        const monthEnd = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth() + 1,
          0,
          23,
          59,
          59
        );

        // Dynamically calculate previous month
        const prevMonth =
          monthStart.getMonth() === 0 ? 11 : monthStart.getMonth() - 1;
        const prevYear =
          monthStart.getMonth() === 0
            ? monthStart.getFullYear() - 1
            : monthStart.getFullYear();

        // Get previous month's balance
        const prevMonthBalance = await MonthlyBalance.findOne({
          where: {
            year: prevYear,
            month: prevMonth + 1,
          },
          transaction,
        });

        // Determine opening balance
        const openingBalance = prevMonthBalance
          ? prevMonthBalance.closing_balance
          : previousMonthClosingBalance;

        // Calculate monthly totals
        const monthlyTransactions = await DayBook.findAll({
          where: {
            transaction_date: {
              [Op.between]: [monthStart, monthEnd],
            },
          },
          order: [
            ["transaction_date", "ASC"],
            ["created_at", "ASC"],
          ],
          transaction,
        });

        // Calculate totals and closing balance
        const monthlyTotals = monthlyTransactions.reduce(
          (acc, trans) => {
            const amount = parseFloat(trans.amount);
            if (trans.transaction_type === "CREDIT") {
              acc.credits += amount;
              acc.closingBalance += amount;
            } else {
              acc.debits += amount;
              acc.closingBalance -= amount;
            }
            return acc;
          },
          {
            credits: 0,
            debits: 0,
            closingBalance: openingBalance,
          }
        );

        // Get or create monthly balance
        let monthlyBalance = await MonthlyBalance.findOne({
          where: {
            year: monthStart.getFullYear(),
            month: monthStart.getMonth() + 1,
          },
          transaction,
        });

        // Prepare data for monthly balance
        const monthBalanceData = {
          year: monthStart.getFullYear(),
          month: monthStart.getMonth() + 1,
          opening_balance: openingBalance,
          closing_balance: monthlyTotals.closingBalance,
          total_credits: monthlyTotals.credits,
          total_debits: monthlyTotals.debits,
          total_current_balance: totalCurrentBalance, // Add total current balance
        };

        // Create or update monthly balance
        if (!monthlyBalance) {
          await MonthlyBalance.create(monthBalanceData, { transaction });
        } else {
          await monthlyBalance.update(monthBalanceData, { transaction });
        }

        // Update previous month's closing balance for next iteration
        previousMonthClosingBalance = monthlyTotals.closingBalance;
      }

      // Log for debugging
      console.log("Total Current Bank Balance:", totalCurrentBalance);
    } catch (error) {
      console.error("Error in updateMonthlyBalances:", error);
      throw error;
    }
  }
  static async exportToExcel(filters) {
    try {
      const transactions = await this.getTransactions(filters);

      const excelData = transactions.map((transaction) => ({
        Date: new Date(transaction.transaction_date).toLocaleDateString(),
        "Voucher Type": transaction.voucher_type || "-",
        "Voucher Number": transaction.voucher_number || "-",
        Description: transaction.description,
        "Account Head": transaction.account_head || "-",
        "Sub Account": transaction.sub_account || "-",
        "Party Type": transaction.party_type || "-",
        "Party Name": transaction.party_name || "-",
        "Transaction Type": transaction.transaction_type,
        "Amount (Excl. GST)": parseFloat(
          transaction.amount - (transaction.gst_amount || 0)
        ).toFixed(2),
        "GST Rate (%)": transaction.gst_rate || "-",
        "GST Amount": transaction.gst_amount
          ? parseFloat(transaction.gst_amount).toFixed(2)
          : "-",
        "Total Amount": parseFloat(transaction.amount).toFixed(2),
        Category: transaction.category || "-",
        "Payment Method": transaction.payment_method || "-",
        "Reference Number": transaction.reference_number || "-",
        Balance: parseFloat(transaction.balance).toFixed(2),
        Narration: transaction.narration || "-",
        Notes: transaction.notes || "-",
      }));

      // Create summary data with GST details
      const summary = {
        totalCredits: transactions
          .filter((t) => t.transaction_type === "CREDIT")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        totalDebits: transactions
          .filter((t) => t.transaction_type === "DEBIT")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        totalGST: transactions.reduce(
          (sum, t) => sum + (parseFloat(t.gst_amount) || 0),
          0
        ),
        finalBalance:
          transactions.length > 0
            ? parseFloat(transactions[transactions.length - 1].balance)
            : 0,
      };

      const workbook = XLSX.utils.book_new();

      // Add transactions worksheet
      const transactionsWS = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, transactionsWS, "Transactions");

      // Add summary worksheet
      const summaryData = [
        ["Summary"],
        ["Total Credits", summary.totalCredits.toFixed(2)],
        ["Total Debits", summary.totalDebits.toFixed(2)],
        ["Total GST", summary.totalGST.toFixed(2)],
        ["Final Balance", summary.finalBalance.toFixed(2)],
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWS, "Summary");

      // Style the worksheets
      const wsOptions = {
        origin: "A1",
        style: {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } },
        },
      };

      // Set column widths
      const colWidths = [
        { wch: 12 }, // Date
        { wch: 15 }, // Voucher Type
        { wch: 15 }, // Voucher Number
        { wch: 30 }, // Description
        { wch: 15 }, // Account Head
        { wch: 15 }, // Sub Account
        { wch: 15 }, // Party Type
        { wch: 20 }, // Party Name
        { wch: 15 }, // Transaction Type
        { wch: 15 }, // Amount (Excl. GST)
        { wch: 12 }, // GST Rate
        { wch: 12 }, // GST Amount
        { wch: 15 }, // Total Amount
        { wch: 15 }, // Category
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Reference Number
        { wch: 12 }, // Balance
        { wch: 30 }, // Narration
        { wch: 30 }, // Notes
      ];

      transactionsWS["!cols"] = colWidths;

      return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      throw error;
    }
  }

  static async setMonthlyOpeningBalance(year, month) {
    const transaction = await sequelize.transaction();
    try {
      // Create a date for the first day of the specified month
      const startDate = new Date(year, month - 1, 1);
      const monthYearKey = `${year}-${month}`;

      // Check if opening balance is already set for this month
      const existingMonthlyOpeningBalance = await OpeningBalance.findOne({
        where: {
          month_year: monthYearKey,
          is_monthly_set: true,
        },
        transaction,
      });

      // If already set, return existing balance
      if (existingMonthlyOpeningBalance) {
        console.log(`Opening balance already set for ${monthYearKey}`);
        return {
          totalCurrentBalance: existingMonthlyOpeningBalance.amount,
          alreadySet: true,
        };
      }

      // Fetch all bank accounts and calculate total balance
      const bankAccounts = await BankAccountService.getAllBankAccounts();
      const totalCurrentBalance = bankAccounts.reduce((total, account) => {
        const balance =
          parseFloat(
            typeof account.current_balance === "string"
              ? account.current_balance.replace(/^0+/, "")
              : account.current_balance
          ) || 0;
        return total + balance;
      }, 0);

      // Create or update opening balance
      const [openingBalance, created] = await OpeningBalance.findOrCreate({
        where: {
          month_year: monthYearKey,
        },
        defaults: {
          amount: totalCurrentBalance,
          set_date: startDate,
          is_monthly_set: true,
          month_year: monthYearKey,
          notes: `Monthly opening balance for ${monthYearKey}`,
        },
        transaction,
      });

      // If not created (already exists), update
      if (!created) {
        await openingBalance.update(
          {
            amount: totalCurrentBalance,
            is_monthly_set: true,
            notes: `Monthly opening balance for ${monthYearKey}`,
          },
          { transaction }
        );
      }

      // Update monthly balance record
      const [monthlyBalance] = await MonthlyBalance.findOrCreate({
        where: {
          year: year,
          month: month,
        },
        defaults: {
          opening_balance: totalCurrentBalance,
          total_current_balance: totalCurrentBalance,
        },
        transaction,
      });

      await monthlyBalance.update(
        {
          opening_balance: totalCurrentBalance,
          total_current_balance: totalCurrentBalance,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        totalCurrentBalance,
        created: created,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error setting monthly opening balance:", error);
      throw error;
    }
  }

  // Cron job or scheduled method to run at the start of each month
  static async runMonthlyOpeningBalanceUpdate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

    try {
      const result = await this.setMonthlyOpeningBalance(year, month);
      console.log(
        `Monthly opening balance set: ${result.totalCurrentBalance} on ${result.date}`
      );
    } catch (error) {
      console.error("Failed to set monthly opening balance:", error);
    }
  }
}

module.exports = DayBookService;
