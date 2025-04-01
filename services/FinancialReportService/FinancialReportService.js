// services/FinancialReportService.js
const {
  sequelize,
  DayBook,
  Invoice,
  PurchaseInvoice,
  CarExpenseStats,
  BankTransactionModel,
  CarPayments,
} = require("../../models/index");
const { Op } = require("sequelize");
const { CompanyStats } = require("../../models/index");
// const CarAdvancePayments = require("../../models/CarAdvancePayments");

class FinancialReportService {
  /**
   * Generate Profit and Loss Statement
   * @param {Object} options - Date range and other filters
   * @returns {Object} Profit and Loss details
   */
  static async generateProfitAndLossStatement(options = {}) {
    const {
      startDate = new Date(new Date().getFullYear(), 0, 1),
      endDate = new Date(),
    } = options;

    try {
      // Revenue Calculation (Sales Invoices)
      const revenueQuery = await Invoice.findAll({
        where: {
          invoice_date: {
            [Op.between]: [startDate, endDate],
          },
          status: "paid",
        },
        attributes: [
          [sequelize.fn("SUM", sequelize.col("total_amount")), "total_revenue"],
        ],
        raw: true,
      });

      console.log("Revenue Query:", revenueQuery);
      // Expense Calculation
      const expensesQuery = await DayBook.findAll({
        where: {
          transaction_date: {
            [Op.between]: [startDate, endDate],
          },
          transaction_type: "DEBIT",
        },
        group: ["category"],
        attributes: [
          "category",
          [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
        ],
        raw: true,
      });

      console.log("Expenses Query:", expensesQuery);
      // Purchase Costs
      const purchaseCostsQuery = await PurchaseInvoice.findAll({
        where: {
          invoice_date: {
            [Op.between]: [startDate, endDate],
          },
          status: "paid",
        },
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("total_amount")),
            "total_purchase_cost",
          ],
        ],
        raw: true,
      });

      console.log("Purchase Costs Query:", purchaseCostsQuery);

      console.log(startDate, endDate);
      // Additional Income (Bank Credits)
      const additionalIncomeQuery = await BankTransactionModel.findAll({
        where: {
          transaction_date: {
            [Op.between]: [startDate, endDate],
          },
          transaction_type: "CREDIT",
        },
        group: ["category"],
        attributes: [
          "category",
          [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
        ],
        raw: true,
      });

      console.log("Additional Income Query:", additionalIncomeQuery);

      // Prepare final report
      const totalRevenue = parseFloat(revenueQuery[0]?.total_revenue || 0);
      const totalPurchaseCost = parseFloat(
        purchaseCostsQuery[0]?.total_purchase_cost || 0
      );

      const expenses = expensesQuery.map((expense) => ({
        category: expense.category,
        amount: parseFloat(expense.total_amount),
      }));

      const additionalIncome = additionalIncomeQuery.map((income) => ({
        category: income.category,
        amount: parseFloat(income.total_amount),
      }));

      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const totalAdditionalIncome = additionalIncome.reduce(
        (sum, income) => sum + income.amount,
        0
      );

      const netProfit =
        totalRevenue +
        totalAdditionalIncome -
        totalExpenses -
        totalPurchaseCost;

      return {
        revenue: totalRevenue,
        additionalIncome,
        expenses,
        purchaseCosts: totalPurchaseCost,
        totalIncome: totalRevenue + totalAdditionalIncome,
        totalExpenses: totalExpenses + totalPurchaseCost,
        netProfit,
      };
    } catch (error) {
      console.error("Profit and Loss Generation Error:", error);
      throw new Error("Failed to generate Profit and Loss statement");
    }
  }

  /**
   * Generate Balance Sheet
   * @param {Object} options - Date and other filters
   * @returns {Object} Balance Sheet details
   */
  static async generateBalanceSheet(options = {}) {
    const { asOfDate = new Date() } = options;

    try {
      // Assets Calculation
      const assetsQueries = {
        cashAndBank: await this.calculateCashAndBankBalances(asOfDate),
        accountsReceivable: await this.calculateAccountsReceivable(asOfDate),
        inventoryValue: await this.calculateInventoryValue(asOfDate),
        fixedAssets: await this.calculateFixedAssets(asOfDate),
      };

      // Liabilities Calculation
      const liabilitiesQueries = {
        accountsPayable: await this.calculateAccountsPayable(asOfDate),
        loans: await this.calculateOutstandingLoans(asOfDate),
        taxLiabilities: await this.calculateTaxLiabilities(asOfDate),
      };

      // Calculate Totals
      const totalAssets = Object.values(assetsQueries).reduce(
        (sum, asset) => sum + asset,
        0
      );
      const totalLiabilities = Object.values(liabilitiesQueries).reduce(
        (sum, liability) => sum + liability,
        0
      );

      const netWorth = totalAssets - totalLiabilities;

      return {
        assets: [
          { category: "Cash and Bank", amount: assetsQueries.cashAndBank },
          {
            category: "Accounts Receivable",
            amount: assetsQueries.accountsReceivable,
          },
          { category: "Inventory", amount: assetsQueries.inventoryValue },
          { category: "Fixed Assets", amount: assetsQueries.fixedAssets },
        ],
        liabilities: [
          {
            category: "Accounts Payable",
            amount: liabilitiesQueries.accountsPayable,
          },
          { category: "Loans", amount: liabilitiesQueries.loans },
          {
            category: "Tax Liabilities",
            amount: liabilitiesQueries.taxLiabilities,
          },
        ],
        totalAssets,
        totalLiabilities,
        netWorth,
      };
    } catch (error) {
      console.error("Balance Sheet Generation Error:", error);
      throw new Error("Failed to generate Balance Sheet");
    }
  }

  // Helper methods for detailed calculations
  static async calculateCashAndBankBalances(asOfDate) {
    const bankBalances = await BankTransactionModel.findAll({
      where: { transaction_date: { [Op.lte]: asOfDate } },
      attributes: [
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE -amount END`
            )
          ),
          "total_balance",
        ],
      ],
      raw: true,
    });

    return parseFloat(bankBalances[0]?.total_balance || 0);
  }

  static async calculateAccountsReceivable(asOfDate) {
    const receivables = await Invoice.findAll({
      where: {
        invoice_date: { [Op.lte]: asOfDate },
        status: "paid",
      },
      attributes: [
        [
          sequelize.fn("SUM", sequelize.col("total_amount")),
          "total_receivable",
        ],
      ],
      raw: true,
    });

    return parseFloat(receivables[0]?.total_receivable || 0);
  }

  static async calculateInventoryValue(asOfDate) {
    // Implement inventory valuation logic based on your inventory tracking
    return 0; // Placeholder
  }

  static async calculateFixedAssets(asOfDate) {
    // Implement fixed assets valuation logic
    return 0; // Placeholder
  }

  static async calculateAccountsPayable(asOfDate) {
    const payables = await PurchaseInvoice.findAll({
      where: {
        invoice_date: { [Op.lte]: asOfDate },
        status: "pending",
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total_payable"],
      ],
      raw: true,
    });

    return parseFloat(payables[0]?.total_payable || 0);
  }

  static async calculateOutstandingLoans(asOfDate) {
    // Implement loan calculation logic
    return 0; // Placeholder
  }

  static async calculateTaxLiabilities(asOfDate) {
    // Implement tax liability calculation logic
    return 0; // Placeholder
  }
}

module.exports = FinancialReportService;
