const moment = require("moment");
const {
  Company,
  Payment,
  sequelize,
  CarPayments,
  CompanyStats,
  PaymentHistory,
  Invoice,
} = require("../models/index");
const { Op, fn, col, literal } = require("sequelize");

class InventoryService {
  static async getCompanyStats() {
    try {
      // Ensure CompanyStats row exists
      await CompanyStats.initialize();

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Debugging: Log raw data
      console.log("Fetching stats for year:", currentYear);

      // Monthly Expenses Query
      const monthlyExpenses = await CarPayments.findAll({
        attributes: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("MONTH FROM payment_date")
            ),
            "month",
          ],
          [sequelize.fn("SUM", sequelize.col("amount")), "total_expense"],
        ],
        where: {
          payment_date: {
            [Op.between]: [
              moment().startOf("year").format("YYYY-01-01"),
              moment().endOf("year").format("YYYY-12-31"),
            ],
          },
          payment_type: "advance", // Ensure only advance payments are counted
        },
        group: [
          sequelize.fn("EXTRACT", sequelize.literal("MONTH FROM payment_date")),
        ],
        order: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("MONTH FROM payment_date")
            ),
            "ASC",
          ],
        ],
        raw: true,
      });

      // Monthly Revenues Query
      const monthlyRevenues = await Payment.findAll({
        attributes: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("MONTH FROM payment_date")
            ),
            "month",
          ],
          [sequelize.fn("SUM", sequelize.col("amount")), "total_revenue"],
        ],
        where: {
          payment_date: {
            [Op.between]: [
              moment().startOf("year").format("YYYY-01-01"),
              moment().endOf("year").format("YYYY-12-31"),
            ],
          },
          status: "completed", // Ensure only completed payments are counted
        },
        group: [
          sequelize.fn("EXTRACT", sequelize.literal("MONTH FROM payment_date")),
        ],
        order: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("MONTH FROM payment_date")
            ),
            "ASC",
          ],
        ],
        raw: true,
      });

      // Debugging: Log raw results
      console.log("Monthly Expenses:", monthlyExpenses);
      console.log("Monthly Revenues:", monthlyRevenues);

      // Normalize Monthly Expenses
      const normalizedMonthlyExpenses = Array.from({ length: 12 }, (_, i) => {
        const existingMonth = monthlyExpenses.find(
          (m) => parseInt(m.month) === i + 1
        );
        return {
          month: i + 1,
          total_expense: existingMonth
            ? parseFloat(existingMonth.total_expense)
            : 0,
        };
      });

      // Normalize Monthly Revenues
      const normalizedMonthlyRevenues = Array.from({ length: 12 }, (_, i) => {
        const existingMonth = monthlyRevenues.find(
          (m) => parseInt(m.month) === i + 1
        );
        return {
          month: i + 1,
          total_revenue: existingMonth
            ? parseFloat(existingMonth.total_revenue)
            : 0,
        };
      });

      // Fetch Overall Stats
      const overallStats = (await CompanyStats.findOne({
        attributes: ["total_revenue", "total_expenses"],
        raw: true,
      })) || {
        total_revenue: 0,
        total_expenses: 0,
      };
      console.log("Overall Stats:", overallStats);
      return {
        monthly_expenses: normalizedMonthlyExpenses,
        monthly_revenues: normalizedMonthlyRevenues,
        overall_stats: overallStats,
        current_month: {
          total_expense:
            normalizedMonthlyExpenses[currentMonth - 1]?.total_expense || 0,
          total_revenue:
            normalizedMonthlyRevenues[currentMonth - 1]?.total_revenue || 0,
        },
      };
    } catch (error) {
      console.error("Error in getCompanyStats:", error);
      throw error;
    }
  }

  static getDateRange(timeframe) {
    const now = new Date();
    let startDate, endDate;

    switch (timeframe) {
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case "quarterly":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case "monthly":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  }

  // Get comprehensive financial dashboard data
  static async getFinancialDashboard(timeframe = "monthly") {
    try {
      // Use Promise.allSettled for more resilient parallel execution
      const results = await Promise.allSettled([
        this.getRevenueTrends(timeframe),
        this.getExpenseTrends(timeframe),
        this.getInvoiceStatistics(),
        this.getCompanyRevenueBreakdown(),
        this.getPaymentMethodBreakdown(),
        this.getTopPerformingCompanies(),
        this.getTotalRevenue(),
        this.calculateProfitMargin(),
        this.getCashFlowTrend(timeframe),
      ]);

      // Process results, providing default values for failed promises
      return {
        monthlyRevenue: this.getSettledValue(results[0], []),
        monthlyExpenses: this.getSettledValue(results[1], []),
        invoiceStats: this.getSettledValue(results[2], {
          total: 0,
          paid: 0,
          pending: 0,
          overdue: 0,
        }),
        companyBreakdown: this.getSettledValue(results[3], []),
        paymentMethodBreakdown: this.getSettledValue(results[4], []),
        topPerformingCompanies: this.getSettledValue(results[5], []),
        totalRevenue: this.getSettledValue(results[6], 0),
        profitMargin: this.getSettledValue(results[7], 0),
        cashFlow: this.getSettledValue(results[8], []),
      };
    } catch (error) {
      console.error("Financial Dashboard Compilation Error:", error);

      // Return a skeleton object with default values
      return this.getDefaultDashboardData();
    }
  }

  static getSettledValue(result, defaultValue) {
    return result.status === "fulfilled" ? result.value : defaultValue;
  }

  static getDefaultDashboardData() {
    return {
      monthlyRevenue: [],
      monthlyExpenses: [],
      invoiceStats: {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
      },
      companyBreakdown: [],
      paymentMethodBreakdown: [],
      topPerformingCompanies: [],
      totalRevenue: 0,
      profitMargin: 0,
      cashFlow: [],
    };
  }

  // Revenue Trends
  static async getRevenueTrends(timeframe) {
    const groupBy = {
      yearly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('YEAR FROM "transaction_date"')
      ),
      quarterly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('QUARTER FROM "transaction_date"')
      ),
      monthly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('MONTH FROM "transaction_date"')
      ),
    }[timeframe];

    return PaymentHistory.findAll({
      attributes: [
        [groupBy, "month"],
        [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
      ],
      where: {
        transaction_type: "REVENUE",
        transaction_date: {
          [Op.between]: [
            this.getDateRange(timeframe).startDate,
            this.getDateRange(timeframe).endDate,
          ],
        },
      },
      group: ["month"],
      order: [["month", "ASC"]],
      raw: true,
    });
  }

  // Expense Trends
  static async getExpenseTrends(timeframe) {
    const groupBy = {
      yearly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('YEAR FROM "transaction_date"')
      ),
      quarterly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('QUARTER FROM "transaction_date"')
      ),
      monthly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('MONTH FROM "transaction_date"')
      ),
    }[timeframe];

    return PaymentHistory.findAll({
      attributes: [
        [groupBy, "month"],
        [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
      ],
      where: {
        transaction_type: {
          [Op.in]: [
            "EXPENSE",
            "CAR_ADVANCE_PAYMENT",
            "CAR_FUEL_PAYMENT",
            "CAR_OTHERS_PAYMENT",
          ],
        },
        transaction_date: {
          [Op.between]: [
            this.getDateRange(timeframe).startDate,
            this.getDateRange(timeframe).endDate,
          ],
        },
      },
      group: ["month"],
      order: [["month", "ASC"]],
      raw: true,
    });
  }

  // Invoice Statistics
  static async getInvoiceStatistics() {
    const stats = await Invoice.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("invoice_id")), "total"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(`CASE WHEN status = 'paid' THEN 1 ELSE 0 END`)
          ),
          "paid",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(`CASE WHEN status = 'pending' THEN 1 ELSE 0 END`)
          ),
          "pending",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(`CASE WHEN status = 'overdue' THEN 1 ELSE 0 END`)
          ),
          "overdue",
        ],
      ],
      raw: true,
    });

    return stats;
  }

  // Company Revenue Breakdown
  static async getCompanyRevenueBreakdown() {
    try {
      // Method 1: Direct Sequelize query with explicit column referencing
      const result = await sequelize.query(
        `
        SELECT 
          cs.company_id, 
          c.company_name, 
          COALESCE(SUM(cs."total_revenue"), 0) AS revenue
        FROM 
          "CompanyStats" cs
        LEFT JOIN 
          "companies" c ON cs.company_id = c.company_id
        GROUP BY 
          cs.company_id, 
          c.company_name
        ORDER BY 
          revenue DESC
        LIMIT 5
      `,
        {
          type: sequelize.QueryTypes.SELECT,
          raw: true,
        }
      );

      // Transform result
      return result.map((item) => ({
        company_id: item.company_id,
        company_name: item.company_name || "Unknown",
        revenue: parseFloat(item.revenue || 0),
      }));
    } catch (error) {
      console.error("Company Revenue Breakdown Error:", error);

      // Fallback method
      try {
        // Method 2: Alternative raw query
        const fallbackResult = await sequelize.query(
          `
          SELECT 
            company_id, 
            company_name, 
            COALESCE(SUM(total_revenue), 0) AS revenue
          FROM (
            SELECT 
              c.company_id, 
              c.company_name, 
              COALESCE(cs.total_revenue, 0) AS total_revenue
            FROM 
              companies c
            LEFT JOIN 
              "CompanyStats" cs ON c.company_id = cs.company_id
          ) subquery
          GROUP BY 
            company_id, 
            company_name
          ORDER BY 
            revenue DESC
          LIMIT 5
        `,
          {
            type: sequelize.QueryTypes.SELECT,
            raw: true,
          }
        );

        return fallbackResult.map((item) => ({
          company_id: item.company_id,
          company_name: item.company_name || "Unknown",
          revenue: parseFloat(item.revenue || 0),
        }));
      } catch (fallbackError) {
        console.error(
          "Fallback Company Revenue Breakdown Error:",
          fallbackError
        );

        // Last resort: return empty array
        return [];
      }
    }
  }

  // Payment Method Breakdown
  static async getPaymentMethodBreakdown() {
    return PaymentHistory.findAll({
      attributes: [
        "payment_method",
        [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
      ],
      where: { transaction_type: "PAYMENT" },
      group: ["payment_method"],
      raw: true,
    });
  }

  // Top Performing Companies
  static async getTopPerformingCompanies() {
    try {
      // Use raw query to explicitly handle column references
      const result = await sequelize.query(
        `
        WITH CompanyPerformance AS (
          SELECT 
            cs."company_id", 
            c."company_name", 
            COALESCE(SUM(cs."total_revenue"), 0) AS total_revenue,
            COALESCE(SUM(cs."paid_invoices_count"), 0) AS invoice_count,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(cs."total_revenue"), 0) DESC) AS rank
          FROM 
            "CompanyStats" cs
          LEFT JOIN 
            "companies" c ON cs."company_id" = c."company_id"
          GROUP BY 
            cs."company_id", 
            c."company_name"
        )
        SELECT 
          company_id, 
          company_name, 
          total_revenue, 
          invoice_count
        FROM 
          CompanyPerformance
        WHERE 
          rank <= 3
        ORDER BY 
          total_revenue DESC
      `,
        {
          type: sequelize.QueryTypes.SELECT,
          raw: true,
        }
      );

      return result.map((item) => ({
        id: item.company_id,
        name: item.company_name || "Unknown",
        revenue: parseFloat(item.total_revenue || 0),
        invoiceCount: parseInt(item.invoice_count || 0),
      }));
    } catch (error) {
      console.error("Top Performing Companies Error:", error);
      return [];
    }
  }

  // Total Revenue
  static async getTotalRevenue(startDate, endDate) {
    const result = await PaymentHistory.findOne({
      attributes: [[sequelize.fn("SUM", sequelize.col("amount")), "total"]],
      where: {
        transaction_type: "REVENUE",
        transaction_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      raw: true,
    });

    return result.total || 0;
  }

  // Profit Margin Calculation
  static async calculateProfitMargin() {
    const revenue = await this.getTotalRevenue();
    const expenses = await this.getTotalExpenses();

    if (revenue === 0) return 0;
    return (((revenue - expenses) / revenue) * 100).toFixed(2);
  }

  // Cash Flow Trend
  static async getCashFlowTrend(timeframe) {
    const groupBy = {
      yearly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('YEAR FROM "transaction_date"')
      ),
      quarterly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('QUARTER FROM "transaction_date"')
      ),
      monthly: sequelize.fn(
        "EXTRACT",
        sequelize.literal('MONTH FROM "transaction_date"')
      ),
    }[timeframe];

    return PaymentHistory.findAll({
      attributes: [
        [groupBy, "period"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(`
              CASE 
                WHEN transaction_type = 'REVENUE' THEN amount 
                WHEN transaction_type = 'EXPENSE' THEN -amount 
                ELSE 0 
              END
            `)
          ),
          "amount",
        ],
      ],
      group: ["period"],
      order: [["period", "ASC"]],
      raw: true,
    });
  }

  // Updated Top Performing Companies method
  static async getTopPerformingCompanies() {
    try {
      const result = await CompanyStats.findAll({
        attributes: [
          "company_id",
          [
            sequelize.fn("SUM", sequelize.col("total_revenue")),
            "total_revenue",
          ],
          [
            sequelize.fn("SUM", sequelize.col("paid_invoices_count")),
            "invoice_count",
          ],
        ],
        include: [
          {
            model: Company,
            as: "company", // Explicitly use the alias
            attributes: ["company_name"],
          },
        ],
        group: [
          "CompanyStats.company_id",
          "company.company_id",
          "company.company_name",
        ],
        order: [[sequelize.literal("total_revenue"), "DESC"]],
        limit: 3,
        raw: false,
      });

      return result.map((stat) => ({
        id: stat.company_id,
        name: stat.company ? stat.company.company_name : "Unknown",
        revenue: parseFloat(stat.dataValues.total_revenue || 0),
        invoiceCount: parseInt(stat.dataValues.invoice_count || 0),
      }));
    } catch (error) {
      console.error("Top Performing Companies Error:", error);

      // Fallback to raw query
      try {
        const fallbackResult = await sequelize.query(
          `
          SELECT 
            cs.company_id, 
            c.company_name, 
            SUM(cs.total_revenue) as total_revenue,
            SUM(cs.paid_invoices_count) as invoice_count
          FROM 
            company_stats cs
          LEFT JOIN 
            companies c ON cs.company_id = c.company_id
          GROUP BY 
            cs.company_id, c.company_name
          ORDER BY 
            total_revenue DESC
          LIMIT 3
        `,
          {
            type: sequelize.QueryTypes.SELECT,
          }
        );

        return fallbackResult.map((item) => ({
          id: item.company_id,
          name: item.company_name,
          revenue: parseFloat(item.total_revenue || 0),
          invoiceCount: parseInt(item.invoice_count || 0),
        }));
      } catch (fallbackError) {
        console.error(
          "Fallback Top Performing Companies Error:",
          fallbackError
        );
        return [];
      }
    }
  }

  static async getExpenseBreakdown(timeframe) {
    return TransactionHistory.findAll({
      attributes: [
        'transaction_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
      ],
      where: {
        transaction_type: {
          [Op.in]: [
            'EXPENSE', 
            'CAR_ADVANCE_PAYMENT', 
            'CAR_FUEL_PAYMENT', 
            'CAR_OTHERS_PAYMENT'
          ]
        },
        transaction_date: {
          [Op.between]: [
            this.getDateRange(timeframe).startDate,
            this.getDateRange(timeframe).endDate,
          ],
        },
      },
      group: ['transaction_type'],
      raw: true
    });
  }
}

module.exports = InventoryService;



// const moment = require("moment");
// const {
//   Company,
//   Payment,
//   sequelize,
//   TransactionHistory,
//   CompanyStats,
//   Invoice,
//   PaymentHistory
// } = require("../models/index");
// const { Op, fn, col, literal } = require("sequelize");

// class FinancialService {
//   // Helper method to get date range based on timeframe
//   static getDateRange(timeframe) {
//     const now = new Date();
//     let startDate, endDate;

//     switch (timeframe) {
//       case "yearly":
//         startDate = new Date(now.getFullYear(), 0, 1);
//         endDate = new Date(now.getFullYear(), 11, 31);
//         break;
//       case "quarterly":
//         const currentQuarter = Math.floor(now.getMonth() / 3);
//         startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
//         endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
//         break;
//       case "monthly":
//       default:
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//         endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//     }

//     return { startDate, endDate };
//   }

//   // Get Financial Dashboard Data
//   static async getFinancialDashboard(timeframe = "monthly") {
//     try {
//       const { startDate, endDate } = this.getDateRange(timeframe);

//       // Parallel execution of financial data retrieval
//       const [
//         monthlyRevenue,
//         monthlyExpenses,
//         invoiceStats,
//         companyBreakdown,
//         paymentMethodBreakdown,
//         topPerformingCompanies,
//         totalRevenue,
//         cashFlow,
//         expenseBreakdown
//       ] = await Promise.all([
//         this.getRevenueTrends(timeframe),
//         this.getExpenseTrends(timeframe),
//         this.getInvoiceStatistics(),
//         this.getCompanyRevenueBreakdown(),
//         this.getPaymentMethodBreakdown(),
//         this.getTopPerformingCompanies(),
//         this.getTotalRevenue(startDate, endDate),
//         this.getCashFlowTrend(timeframe),
//         this.getExpenseBreakdown(timeframe)
//       ]);

//       // Calculate Profit Margin
//       const profitMargin = totalRevenue > 0 
//         ? (((totalRevenue - this.sumExpenses(monthlyExpenses)) / totalRevenue) * 100).toFixed(2)
//         : 0;

//       return {
//         monthlyRevenue,
//         monthlyExpenses,
//         invoiceStats,
//         companyBreakdown,
//         paymentMethodBreakdown,
//         topPerformingCompanies,
//         totalRevenue,
//         profitMargin: parseFloat(profitMargin),
//         cashFlow,
//         expenseBreakdown
//       };
//     } catch (error) {
//       console.error("Financial Dashboard Error:", error);
//       throw error;
//     }
//   }

//   // Helper method to sum expenses
//   static sumExpenses(expenses) {
//     return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
//   }

//   // Revenue Trends
//   static async getRevenueTrends(timeframe) {
//     const { startDate, endDate } = this.getDateRange(timeframe);

//     return PaymentHistory.findAll({
//       attributes: [
//         [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM transaction_date')), 'month'],
//         [sequelize.fn('SUM', sequelize.col('amount')), 'amount']
//       ],
//       where: {
//         transaction_type: 'REVENUE',
//         transaction_date: {
//           [Op.between]: [startDate, endDate]
//         }
//       },
//       group: ['month'],
//       order: [['month', 'ASC']],
//       raw: true
//     });
//   }

//   // Expense Trends
//   static async getExpenseTrends(timeframe) {
//     const { startDate, endDate } = this.getDateRange(timeframe);

//     return PaymentHistory.findAll({
//       attributes: [
//         [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM transaction_date')), 'month'],
//         [sequelize.fn('SUM', sequelize.col('amount')), 'amount']
//       ],
//       where: {
//         transaction_type: {
//           [Op.in]: [
//             'EXPENSE', 
//             'CAR_ADVANCE_PAYMENT', 
//             'CAR_FUEL_PAYMENT', 
//             'CAR_OTHERS_PAYMENT'
//           ]
//         },
//         transaction_date: {
//           [Op.between]: [startDate, endDate]
//         }
//       },
//       group: ['month'],
//       order: [['month', 'ASC']],
//       raw: true
//     });
//   }

//   // Invoice Statistics
//   static async getInvoiceStatistics() {
//     const stats = await Invoice.findOne({
//       attributes: [
//         [sequelize.fn('COUNT', sequelize.col('invoice_id')), 'total'],
//         [
//           sequelize.fn(
//             'SUM',
//             sequelize.literal(`CASE WHEN status = 'paid' THEN 1 ELSE 0 END`)
//           ),
//           'paid'
//         ],
//         [
//           sequelize.fn(
//             'SUM',
//             sequelize.literal(`CASE WHEN status = 'pending' THEN 1 ELSE 0 END`)
//           ),
//           'pending'
//         ],
//         [
//           sequelize.fn(
//             'SUM',
//             sequelize.literal(`CASE WHEN status = 'overdue' THEN 1 ELSE 0 END`)
//           ),
//           'overdue'
//         ]
//       ],
//       raw: true
//     });

//     return {
//       total: parseInt(stats.total || 0),
//       paid: parseInt(stats.paid || 0),
//       pending: parseInt(stats.pending || 0),
//       overdue: parseInt(stats.overdue || 0)
//     };
//   }

//   // Company Revenue Breakdown
//   static async getCompanyRevenueBreakdown() {
//     return CompanyStats.findAll({
//       attributes: [
//         'company_id',
//         [sequelize.col('company.company_name'), 'name'],
//         'total_revenue'
//       ],
//       include: [{
//         model: Company,
//         attributes: [],
//         required: true,
//         as: 'company'
//       }],
//       order: [['total_revenue', 'DESC']],
//       limit: 5,
//       raw: true
//     });
//   }

//   // Payment Method Breakdown
//   static async getPaymentMethodBreakdown() {
//     return PaymentHistory.findAll({
//       attributes: [
//         'payment_method',
//         [sequelize.fn('SUM', sequelize.col('amount')), 'amount']
//       ],
//       where: { transaction_type: 'PAYMENT' },
//       group: ['payment_method'],
//       raw: true
//     });
//   }

//   // Top Performing Companies
//   static async getTopPerformingCompanies() {
//     return CompanyStats.findAll({
//       attributes: [
//         'company_id',
//         [sequelize.col('company.company_name'), 'name'],
//         'total_revenue',
//         'paid_invoices_count'
//       ],
//       include: [{
//         model: Company,
//         attributes: [],
//         required: true,
//         as: 'company'
//       }],
//       order: [['total_revenue', 'DESC']],
//       limit: 3,
//       raw: true
//     });
//   }

//   // Total Revenue
//   static async getTotalRevenue(startDate, endDate) {
//     const result = await PaymentHistory.findOne({
//       attributes: [
//         [sequelize.fn('SUM', sequelize.col('amount')), 'total']
//       ],
//       where: {
//         transaction_type: 'REVENUE',
//         transaction_date: {
//           [Op.between]: [startDate, endDate]
//         }
//       },
//       raw: true
//     });

//     return parseFloat(result.total || 0);
//   }

//   // Cash Flow Trend
//   static async getCashFlowTrend(timeframe) {
//     const { startDate, endDate } = this.getDateRange(timeframe);

//     return PaymentHistory.findAll({
//       attributes: [
//         [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM transaction_date')), 'period'],
//         [
//           sequelize.fn(
//             'SUM',
//             sequelize.literal(`
//               CASE 
//                 WHEN transaction_type = 'REVENUE' THEN amount 
//                 WHEN transaction_type = 'EXPENSE' THEN -amount 
//                 ELSE 0 
//               END
//             `)
//           ),
//           'amount'
//         ]
//       ],
//       where: {
//         transaction_date: {
//           [Op.between]: [startDate, endDate]
//         }
//       },
//       group: ['period'],
//       order: [['period', 'ASC']],
//       raw: true
//     });
//   }

//   // Expense Breakdown
//   static async getExpenseBreakdown(timeframe) {
//     const { startDate, endDate } = this.getDateRange(timeframe);

//     return PaymentHistory.findAll({
//       attributes: [
//         'transaction_type',
//         [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
//       ],
//       where: {
//         transaction_type: {
//           [Op.in]: [
//             'EXPENSE', 
//             'CAR_ADVANCE_PAYMENT', 
//             'CAR_FUEL_PAYMENT', 
//             'CAR_OTHERS_PAYMENT'
//           ]
//         },
//         transaction_date: {
//           [Op.between]: [startDate, endDate]
//         }
//       },
//       group: ['transaction_type'],
//       raw: true
//     });
//   }
// }

// module.exports = FinancialService;