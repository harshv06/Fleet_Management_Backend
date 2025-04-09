// controllers/FinancialReportController.js
const FinancialReportService = require("../../services/FinancialReportService/FinancialReportService");
const {
  DayBook,
  Category,
  SubGroups,
  sequelize,
} = require("../../models/index");
const { Op } = require("sequelize");
class FinancialReportController {
  static async getFinancialGroupBreakdown(req, res) {
    try {
      const { startDate, endDate } = req.params;

      // Fetch categories with sub-groups
      const categories = await Category.findAll({
        where: { is_active: true },
        include: [
          {
            model: SubGroups,
            as: "subGroups",
            where: { is_active: true },
            required: false,
          },
        ],
        order: [
          ["name", "ASC"],
          [{ model: SubGroups, as: "subGroups" }, "name", "ASC"],
        ],
      });

      // Fetch expenses for each sub-group
      const groupsWithExpenses = await Promise.all(
        categories.map(async (category) => {
          const subGroupsWithExpenses = await Promise.all(
            category.subGroups.map(async (subGroup) => {
              const totalExpense = await DayBook.sum("amount", {
                where: {
                  [Op.and]: [
                    { category: category.name },
                    { sub_group: subGroup.name },
                    { transaction_type: "DEBIT" },
                    sequelize.where(
                      sequelize.fn("DATE", sequelize.col("transaction_date")),
                      ">=",
                      startDate
                    ),
                    sequelize.where(
                      sequelize.fn("DATE", sequelize.col("transaction_date")),
                      "<=",
                      endDate
                    ),
                  ],
                },
              });

              return {
                name: subGroup.name,
                amount: totalExpense || 0,
              };
            })
          );

          // Calculate total for the category
          const categoryTotal = subGroupsWithExpenses.reduce(
            (sum, sg) => sum + sg.amount,
            0
          );

          return {
            name: category.name,
            subGroups: subGroupsWithExpenses.filter((sg) => sg.amount > 0),
            total: categoryTotal,
          };
        })
      );

      // Fetch sales groups for each sub-group
      const groupsWithSales = await Promise.all(
        categories.map(async (category) => {
          const subGroupsWithSales = await Promise.all(
            category.subGroups.map(async (subGroup) => {
              const totalSales = await DayBook.sum("amount", {
                where: {
                  [Op.and]: [
                    { category: category.name },
                    { sub_group: subGroup.name },
                    { transaction_type: "CREDIT" },
                    sequelize.where(
                      sequelize.fn("DATE", sequelize.col("transaction_date")),
                      ">=",
                      startDate
                    ),
                    sequelize.where(
                      sequelize.fn("DATE", sequelize.col("transaction_date")),
                      "<=",
                      endDate
                    ),
                  ],
                },
              });

              return {
                name: subGroup.name,
                amount: totalSales || 0,
              };
            })
          );

          // Calculate total for the category
          const categoryTotal = subGroupsWithSales.reduce(
            (sum, sg) => sum + sg.amount,
            0
          );

          return {
            name: category.name,
            subGroups: subGroupsWithSales.filter((sg) => sg.amount > 0),
            total: categoryTotal,
          };
        })
      );

      // Fetch sales and purchase totals
      const salesTotal = await DayBook.sum("amount", {
        where: {
          [Op.and]: [
            { transaction_type: "CREDIT" },
            sequelize.where(
              sequelize.fn("DATE", sequelize.col("transaction_date")),
              ">=",
              startDate
            ),
            sequelize.where(
              sequelize.fn("DATE", sequelize.col("transaction_date")),
              "<=",
              endDate
            ),
          ],
        },
      });

      const purchaseTotal = await DayBook.sum("amount", {
        where: {
          [Op.and]: [
            { transaction_type: "DEBIT" },
            sequelize.where(
              sequelize.fn("DATE", sequelize.col("transaction_date")),
              ">=",
              startDate
            ),
            sequelize.where(
              sequelize.fn("DATE", sequelize.col("transaction_date")),
              "<=",
              endDate
            ),
          ],
        },
      });

      // Calculate net profit
      const netProfit = salesTotal - purchaseTotal;

      res.json({
        groups: groupsWithExpenses,
        salesGroups: groupsWithSales,
        purchase: {
          accounts: purchaseTotal || 0,
          percentage:
            purchaseTotal > 0 && salesTotal > 0
              ? ((purchaseTotal / salesTotal) * 100).toFixed(2)
              : 0,
        },
        sales: {
          accounts: salesTotal || 0,
          percentage:
            salesTotal > 0 && purchaseTotal > 0
              ? ((salesTotal / purchaseTotal) * 100).toFixed(2)
              : 0,
        },
        netProfit: netProfit || 0,
      });
    } catch (error) {
      console.error("Error fetching financial breakdown:", error);
      res.status(500).json({
        message: "Error fetching financial data",
        error: error.message,
      });
    }
  }
  static async getProfitAndLossStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Convert string dates to Date objects if provided
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      const profitLossStatement =
        await FinancialReportService.generateProfitAndLossStatement({
          startDate: parsedStartDate,
          endDate: parsedEndDate,
        });

      res.status(200).json({
        success: true,
        data: profitLossStatement,
      });
    } catch (error) {
      console.error("Profit and Loss Retrieval Error:", error);
      res.status(500).json({
        success: false,
        message:
          error.message || "Failed to retrieve Profit and Loss statement",
      });
    }
  }

  /**
   * Get Balance Sheet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getBalanceSheet(req, res) {
    try {
      const { asOfDate } = req.query;

      // Convert string date to Date object if provided
      const parsedAsOfDate = asOfDate ? new Date(asOfDate) : undefined;

      const balanceSheet = await FinancialReportService.generateBalanceSheet({
        asOfDate: parsedAsOfDate,
      });

      res.status(200).json({
        success: true,
        data: balanceSheet,
      });
    } catch (error) {
      console.error("Balance Sheet Retrieval Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve Balance Sheet",
      });
    }
  }
}

module.exports = FinancialReportController;
