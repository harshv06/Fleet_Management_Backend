// services/DayBookService.js
const {
  DayBook,
  MonthlyBalance,
  sequelize,
  OpeningBalance,
} = require("../../models/index");
const { Op } = require("sequelize");
const XLSX = require("xlsx");

class DayBookService {
  static async addTransaction(transactionData) {
    const transaction = await sequelize.transaction();
    try {
      console.log("Incoming transaction data:", transactionData);

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

      let previousBalance = previousTransaction
        ? parseFloat(previousTransaction.balance)
        : 0;

      // Calculate new balance including GST if applicable
      const amount = parseFloat(transactionData.amount) + gstAmount;
      const newBalance =
        transactionData.transaction_type === "CREDIT"
          ? previousBalance + amount
          : previousBalance - amount;

      // Format the data
      const formattedData = {
        ...transactionData,
        amount: amount,
        transaction_date: new Date(transactionData.transaction_date),
        balance: newBalance,
        gst_amount: gstAmount,
        gst_applicable: Boolean(transactionData.gst_applicable),
        gst_rate: transactionData.gst_rate
          ? parseFloat(transactionData.gst_rate)
          : null,
      };

      console.log("Formatted data before creation:", formattedData);

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
        voucher_type,
        party_type,
      } = filters;
      const where = {};

      if (startDate && endDate) {
        where.transaction_date = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      if (type && type !== "all") where.transaction_type = type;
      if (category && category !== "all") where.category = category;
      if (account_head && account_head !== "all")
        where.account_head = account_head;
      if (voucher_type && voucher_type !== "all")
        where.voucher_type = voucher_type;
      if (party_type && party_type !== "all") where.party_type = party_type;

      return await DayBook.findAll({
        where,
        order: [["transaction_date", "DESC"]],
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
          "sub_account",
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
        ],
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
      const [monthlyBalance, transactions] = await Promise.all([
        this.getMonthlyBalance(year, month),
        this.getTransactions({
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0, 23, 59, 59),
        }),
      ]);

      return {
        monthlyBalance: monthlyBalance || {
          opening_balance: 0,
          closing_balance: 0,
          total_credits: 0,
          total_debits: 0,
        },
        transactions,
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateTransaction(transactionId, updateData) {
    console.log(transactionId);
    const transaction = await sequelize.transaction();
    try {
      // Find existing transaction
      const existingTransaction = await DayBook.findByPk(transactionId, {
        transaction,
      });
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

      // Get the previous transaction's balance
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

      let previousBalance = previousTransaction
        ? parseFloat(previousTransaction.balance)
        : 0;

      // Calculate new balance
      const amount = formattedUpdateData.amount || existingTransaction.amount;
      const transactionType =
        formattedUpdateData.transaction_type ||
        existingTransaction.transaction_type;

      // Update the transaction with new balance
      await existingTransaction.update(
        {
          ...formattedUpdateData,
          balance:
            transactionType === "CREDIT"
              ? previousBalance + amount
              : previousBalance - amount,
        },
        { transaction }
      );

      // Recalculate all subsequent balances
      await this.recalculateBalances(startDate, transaction);

      // Update monthly balances
      await this.updateMonthlyBalances(startDate, transaction);

      await transaction.commit();
      return existingTransaction;
    } catch (error) {
      console.error("Error in updateTransaction:", error);
      await transaction.rollback();
      throw error;
    }
  }

  static async deleteTransaction(transactionId) {
    const transaction = await sequelize.transaction();
    try {
      // Find existing transaction
      const existingTransaction = await DayBook.findByPk(transactionId, {
        transaction,
      });
      if (!existingTransaction) {
        throw new Error("Transaction not found");
      }

      // Store the date before deleting
      const affectedDate = new Date(existingTransaction.transaction_date);

      // Get all transactions from the affected date onwards
      const allTransactions = await DayBook.findAll({
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

      // Delete the transaction
      await existingTransaction.destroy({ transaction });

      // Recalculate balances for all remaining transactions
      let runningBalance = previousTransaction
        ? parseFloat(previousTransaction.balance)
        : 0;

      for (const trans of allTransactions) {
        // Skip the deleted transaction
        if (trans.transaction_id === transactionId) continue;

        // Update running balance
        if (trans.transaction_type === "CREDIT") {
          runningBalance += parseFloat(trans.amount);
        } else {
          runningBalance -= parseFloat(trans.amount);
        }

        // Update transaction balance
        await trans.update(
          {
            balance: runningBalance,
          },
          { transaction }
        );
      }

      // Update monthly balances for all affected months
      const startOfMonth = new Date(
        affectedDate.getFullYear(),
        affectedDate.getMonth(),
        1
      );
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

        // Calculate monthly totals
        const monthTransactions = await DayBook.findAll({
          where: {
            transaction_date: {
              [Op.between]: [monthStart, monthEnd],
            },
          },
          order: [["transaction_date", "ASC"]],
          transaction,
        });

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

        // Get or create monthly balance
        let monthlyBalance = await MonthlyBalance.findOne({
          where: {
            year: monthStart.getFullYear(),
            month: monthStart.getMonth() + 1,
          },
          transaction,
        });

        const openingBalance = prevMonthBalance
          ? prevMonthBalance.closing_balance
          : 0;
        const closingBalance =
          openingBalance + monthlyTotals.credits - monthlyTotals.debits;

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
        } else {
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
      return true;
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
      });
      return openingBalance;
    } catch (error) {
      throw error;
    }
  }

  static async recalculateBalances(startDate, transaction) {
    try {
      // Get all transactions from the start date
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

      // Get the balance just before the start date
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

      let runningBalance = previousTransaction
        ? parseFloat(previousTransaction.balance)
        : 0;

      // Recalculate all balances
      for (const trans of transactions) {
        runningBalance =
          trans.transaction_type === "CREDIT"
            ? runningBalance + parseFloat(trans.amount)
            : runningBalance - parseFloat(trans.amount);

        await trans.update(
          {
            balance: runningBalance,
          },
          { transaction }
        );
      }

      return runningBalance;
    } catch (error) {
      throw error;
    }
  }

  static async updateMonthlyBalances(startDate, transaction) {
    try {
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

      let previousMonthClosingBalance = 0;

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

        // Get previous month's balance first
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

        // Set opening balance from previous month's closing balance
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

        let runningBalance = openingBalance;
        let totalCredits = 0;
        let totalDebits = 0;

        // Calculate running balance and totals
        for (const trans of monthlyTransactions) {
          const amount = parseFloat(trans.amount);
          if (trans.transaction_type === "CREDIT") {
            runningBalance += amount;
            totalCredits += amount;
          } else {
            runningBalance -= amount;
            totalDebits += amount;
          }
        }

        // Get or create monthly balance
        let monthlyBalance = await MonthlyBalance.findOne({
          where: {
            year: monthStart.getFullYear(),
            month: monthStart.getMonth() + 1,
          },
          transaction,
        });

        if (!monthlyBalance) {
          monthlyBalance = await MonthlyBalance.create(
            {
              year: monthStart.getFullYear(),
              month: monthStart.getMonth() + 1,
              opening_balance: openingBalance,
              closing_balance: runningBalance,
              total_credits: totalCredits,
              total_debits: totalDebits,
            },
            { transaction }
          );
        } else {
          await monthlyBalance.update(
            {
              opening_balance: openingBalance,
              closing_balance: runningBalance,
              total_credits: totalCredits,
              total_debits: totalDebits,
            },
            { transaction }
          );
        }

        // Store this month's closing balance for next iteration
        previousMonthClosingBalance = runningBalance;
      }
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
}

module.exports = DayBookService;
