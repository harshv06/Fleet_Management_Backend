const {
  Cars,
  CarExpenseStats,
  TransactionHistory,
  Invoice,
  sequelize,
  CarPayments,
  PaymentHistory,
  CompanyStats,
} = require("../models/index");
const { Op } = require("sequelize");

class DashboardController {
  // Remove 'static' and use class methods

  // In DashboardController class, add this new method
  async getFilteredData(req, res) {
    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    try {
      const { month, year, timeframe } = req.query;
      const currentYear = parseInt(year) || new Date().getFullYear();
      const selectedMonth = parseInt(month);
      console.log("Selected month:", selectedMonth);
      // Get filtered expense data
      const expenseBreakdown = await CarPayments.findAll({
        attributes: [
          "payment_type",
          [sequelize.fn("SUM", sequelize.col("amount")), "value"],
        ],
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("MONTH FROM payment_date")
              ),
              selectedMonth + 1
            ),
            sequelize.where(
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("YEAR FROM payment_date")
              ),
              currentYear
            ),
          ],
        },
        group: ["payment_type", "payment_date"],
        raw: true,
      });
      console.log("Expense Breakdown:", expenseBreakdown);
      // Get filtered revenue data based on timeframe
      let revenueData;
      switch (timeframe) {
        case "yearly":
          revenueData = await PaymentHistory.findAll({
            attributes: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
                "year",
              ],
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
            },
            group: [
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("YEAR FROM transaction_date")
              ),
            ],
            order: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
                "ASC",
              ],
            ],
            raw: true,
          });
          break;

        case "quarterly":
          const quarter = Math.floor(selectedMonth / 3) + 1;
          const quarterStart = new Date(currentYear, (quarter - 1) * 3, 1);
          const quarterEnd = new Date(currentYear, quarter * 3, 0);

          revenueData = await PaymentHistory.findAll({
            attributes: [
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
              transaction_date: {
                [Op.between]: [quarterStart, quarterEnd],
              },
            },
            raw: true,
          });

          revenueData = [
            {
              period: `Q${quarter}`,
              revenue: parseFloat(revenueData[0]?.revenue || 0),
            },
          ];
          break;

        case "monthly":
          const monthStart = new Date(currentYear, selectedMonth, 1);
          const monthEnd = new Date(currentYear, selectedMonth + 1, 0);

          revenueData = await PaymentHistory.findAll({
            attributes: [
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
              transaction_date: {
                [Op.between]: [monthStart, monthEnd],
              },
            },
            raw: true,
          });

          revenueData = [
            {
              period: MONTH_NAMES[selectedMonth],
              revenue: parseFloat(revenueData[0]?.revenue || 0),
            },
          ];
          break;

        default:
          revenueData = await PaymentHistory.findAll({
            attributes: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("MONTH FROM transaction_date")
                ),
                "month",
              ],
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
              transaction_date: {
                [Op.between]: [
                  new Date(`${currentYear}-01-01`),
                  new Date(`${currentYear}-12-31`),
                ],
              },
            },
            group: [
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("MONTH FROM transaction_date")
              ),
            ],
            order: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("MONTH FROM transaction_date")
                ),
                "ASC",
              ],
            ],
            raw: true,
          });

          // Fill in missing months with zero revenue
          const allMonths = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            revenue: 0,
          }));

          revenueData.forEach((item) => {
            const monthIndex = parseInt(item.month) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
              allMonths[monthIndex].revenue = parseFloat(item.revenue || 0);
            }
          });

          revenueData = allMonths.map((item) => ({
            name: MONTH_NAMES[item.month - 1],
            revenue: item.revenue,
          }));
      }

      return res.json({
        status: "success",
        data: {
          expenses: expenseBreakdown.map((item) => ({
            name:
              item.payment_type.charAt(0).toUpperCase() +
              item.payment_type.slice(1),
            value: parseFloat(item.value || 0),
          })),
          revenue: revenueData,
        },
      });
    } catch (error) {
      console.error("Error fetching filtered data:", error);
      return res.status(500).json({
        error: "Failed to fetch filtered data",
        details: error.message,
      });
    }
  }

  async getFilteredRevenue(req, res) {
    try {
      const { timeframe, year } = req.query;

      if (!["monthly", "quarterly", "yearly"].includes(timeframe)) {
        return res.status(400).json({
          error: "Invalid timeframe provided",
        });
      }

      let revenueData;

      switch (timeframe) {
        case "yearly":
          revenueData = await PaymentHistory.findAll({
            attributes: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
                "year",
              ],
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
            },
            group: [
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("YEAR FROM transaction_date")
              ),
            ],
            order: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
                "ASC",
              ],
            ],
            raw: true,
          });
          break;

        case "quarterly":
          revenueData = await PaymentHistory.findAll({
            attributes: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
                "year",
              ],
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("QUARTER FROM transaction_date")
                ),
                "quarter",
              ],
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
              ...(year && {
                transaction_date: {
                  [Op.between]: [
                    new Date(`${year}-01-01`),
                    new Date(`${year}-12-31`),
                  ],
                },
              }),
            },
            group: [
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("YEAR FROM transaction_date")
              ),
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("QUARTER FROM transaction_date")
              ),
            ],
            order: [
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
                "ASC",
              ],
              [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("QUARTER FROM transaction_date")
                ),
                "ASC",
              ],
            ],
            raw: true,
          });
          break;

        case "monthly":
        default:
          revenueData = await PaymentHistory.findAll({
            attributes: [
              [
                sequelize.fn(
                  "date_trunc",
                  "month",
                  sequelize.col("transaction_date")
                ),
                "month",
              ],
              [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
            ],
            where: {
              transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
              ...(year && {
                transaction_date: {
                  [Op.between]: [
                    new Date(`${year}-01-01`),
                    new Date(`${year}-12-31`),
                  ],
                },
              }),
            },
            group: [
              sequelize.fn(
                "date_trunc",
                "month",
                sequelize.col("transaction_date")
              ),
            ],
            order: [
              [
                sequelize.fn(
                  "date_trunc",
                  "month",
                  sequelize.col("transaction_date")
                ),
                "ASC",
              ],
            ],
            raw: true,
          });
      }

      // Format the data
      const formattedData = revenueData.map((item) => ({
        ...item,
        revenue: parseFloat(item.revenue || 0),
        ...(item.month && { month: new Date(item.month).getMonth() + 1 }),
        ...(item.quarter && { quarter: `Q${item.quarter}` }),
      }));

      console.log("Filtered Revenue Data:", formattedData);

      return res.status(200).json({
        status: "success",
        timeframe,
        data: formattedData,
      });
    } catch (error) {
      console.error("Filtered Revenue Error:", error);
      return res.status(500).json({
        error: "Error fetching filtered revenue data",
        details: error.message,
      });
    }
  }

  async MonthlyExpense(req, res) {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const carExpenses = await CarExpenseStats.findAll({
        where: {
          month: currentMonth,
          year: currentYear,
        },
      });
      res.json(carExpenses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getDashboardData(req, res) {
    // At the top of your DashboardController class
    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    try {
      console.log("Fetching Dashboard Data");
      const { month, year, revenueTimeframe } = req.query;

      // Total Car Expenses
      const totalExpenses = await CarPayments.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
        ],
        raw: true,
      });

      // Parallel data fetching for better performance
      const [
        totalCars,
        total_Expenses,
        totalRevenue,
        totalInvoices,
        totalRemainingAmount, // Add this
        monthlyRevenue,
        expenseBreakdown,
        invoiceStatusBreakdown,
      ] = await Promise.all([
        Cars.count(),
        CompanyStats.findOne({
          attributes: ["total_expenses", "total_revenue"],
          where: { id: 1 },
          raw: true,
        }),
        PaymentHistory.sum("amount", {
          where: {
            transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
          },
        }),

        Invoice.count(),

        Invoice.sum("remaining_amount", {
          where: {
            payment_status: {
              [Op.in]: ["unpaid", "partially_paid"],
            },
          },
        }),

        // PostgreSQL-specific month extraction
        PaymentHistory.findAll({
          attributes: [
            [
              sequelize.fn(
                "date_trunc",
                "month",
                sequelize.col("transaction_date")
              ),
              "month",
            ],
            [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
          ],
          where: {
            transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
          },
          group: [
            sequelize.fn(
              "date_trunc",
              "month",
              sequelize.col("transaction_date")
            ),
          ],
          order: [
            [
              sequelize.fn(
                "date_trunc",
                "month",
                sequelize.col("transaction_date")
              ),
              "ASC",
            ],
          ],
          raw: true,
        }),

        CarPayments.findAll({
          attributes: [
            "payment_type",
            // 'payment_date',
            [sequelize.fn("SUM", sequelize.col("amount")), "value"],
            // 'notes'
          ],
          group: ["payment_type"],
          raw: true,
        }),
        Invoice.findAll({
          attributes: [
            "status",
            [sequelize.fn("COUNT", sequelize.col("invoice_id")), "count"],
          ],
          group: ["status"],
          raw: true,
        }),
      ]);

      // Format monthly revenue
      const formattedMonthlyRevenue = monthlyRevenue
        .map((item) => ({
          month: item.month ? new Date(item.month).getMonth() + 1 : null,
          revenue: parseFloat(item.revenue || 0),
        }))
        .filter((item) => item.month !== null);

      // In getDashboardData method, update the filteredExpenseBreakdown query:
      const filteredExpenseBreakdown = await CarPayments.findAll({
        attributes: [
          "payment_type",
          [sequelize.fn("SUM", sequelize.col("amount")), "value"],
        ],
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("MONTH FROM payment_date")
              ),
              parseInt(month) + 1
            ),
            sequelize.where(
              sequelize.fn(
                "EXTRACT",
                sequelize.literal("YEAR FROM payment_date")
              ),
              parseInt(year)
            ),
          ],
        },
        group: ["payment_type"],
        order: [[sequelize.fn("SUM", sequelize.col("amount")), "DESC"]],
        raw: true,
      });

      // Transform the data
      const formattedExpenseBreakdown = filteredExpenseBreakdown.map(
        (item) => ({
          payment_type: item.payment_type,
          value: parseFloat(item.value || 0),
        })
      );
      console.log("Data", filteredExpenseBreakdown);

      // Add filtered revenue data
      // Inside getDashboardData method, update the filteredRevenue section:
      let filteredRevenue = [];
      if (revenueTimeframe) {
        const currentYear = year || new Date().getFullYear();

        switch (revenueTimeframe) {
          case "yearly":
            filteredRevenue = await PaymentHistory.findAll({
              attributes: [
                [
                  sequelize.fn(
                    "EXTRACT",
                    sequelize.literal("YEAR FROM transaction_date")
                  ),
                  "year",
                ],
                [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
              ],
              where: {
                transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
              },
              group: [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("YEAR FROM transaction_date")
                ),
              ],
              order: [
                [
                  sequelize.fn(
                    "EXTRACT",
                    sequelize.literal("YEAR FROM transaction_date")
                  ),
                  "ASC",
                ],
              ],
              raw: true,
            });
            break;

          case "quarterly":
            const quarterNumber = Math.floor((parseInt(month) || 0) / 3) + 1;
            const quarterStart = new Date(
              currentYear,
              (quarterNumber - 1) * 3,
              1
            );
            const quarterEnd = new Date(currentYear, quarterNumber * 3, 0);

            filteredRevenue = await PaymentHistory.findAll({
              attributes: [
                [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
              ],
              where: {
                transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
                transaction_date: {
                  [Op.between]: [quarterStart, quarterEnd],
                },
              },
              raw: true,
            });

            // Transform the result to include the quarter
            filteredRevenue = filteredRevenue.map((item) => ({
              period: `Q${quarterNumber}`,
              revenue: parseFloat(item.revenue || 0),
            }));
            break;

          case "monthly":
            const monthStart = new Date(currentYear, parseInt(month) || 0, 1);
            const monthEnd = new Date(
              currentYear,
              (parseInt(month) || 0) + 1,
              0
            );

            filteredRevenue = await PaymentHistory.findAll({
              attributes: [
                [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
              ],
              where: {
                transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
                transaction_date: {
                  [Op.between]: [monthStart, monthEnd],
                },
              },
              raw: true,
            });

            // Transform the result to include the month name
            filteredRevenue = filteredRevenue.map((item) => ({
              period: MONTH_NAMES[parseInt(month) || 0],
              revenue: parseFloat(item.revenue || 0),
            }));
            break;

          default: // 'all'
            filteredRevenue = await PaymentHistory.findAll({
              attributes: [
                [
                  sequelize.fn(
                    "EXTRACT",
                    sequelize.literal("MONTH FROM transaction_date")
                  ),
                  "month",
                ],
                [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
              ],
              where: {
                transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
                transaction_date: {
                  [Op.between]: [
                    new Date(`${currentYear}-01-01`),
                    new Date(`${currentYear}-12-31`),
                  ],
                },
              },
              group: [
                sequelize.fn(
                  "EXTRACT",
                  sequelize.literal("MONTH FROM transaction_date")
                ),
              ],
              order: [
                [
                  sequelize.fn(
                    "EXTRACT",
                    sequelize.literal("MONTH FROM transaction_date")
                  ),
                  "ASC",
                ],
              ],
              raw: true,
            });

            // Transform to include all months with 0 revenue for missing months
            const allMonthsData = Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              revenue: 0,
            }));

            filteredRevenue.forEach((item) => {
              const monthIndex = parseInt(item.month) - 1;
              if (monthIndex >= 0 && monthIndex < 12) {
                allMonthsData[monthIndex].revenue = parseFloat(
                  item.revenue || 0
                );
              }
            });

            filteredRevenue = allMonthsData;
            break;
        }
      }
      // Format the revenue data
      const formattedRevenue = filteredRevenue.map((item) => {
        if (revenueTimeframe === "all") {
          return {
            month: parseInt(item.month),
            revenue: parseFloat(item.revenue || 0),
          };
        } else {
          return {
            period: item.period,
            revenue: parseFloat(item.revenue || 0),
          };
        }
      });

      console.log("formattedRevenue:", total_Expenses);

      return res.status(200).json({
        totalCars,
        totalExpenses: parseFloat(totalExpenses?.total_amount || 0),
        totalRevenue,
        totalInvoices,
        monthlyRevenue: formattedMonthlyRevenue,
        expenseBreakdown,
        invoiceStatusBreakdown,
        formattedExpenseBreakdown,
        total_expenses: total_Expenses?.total_expenses || 0,
        totalRemainingAmount: parseFloat(totalRemainingAmount || 0),
        filteredRevenue:
          revenueTimeframe === "all"
            ? filteredRevenue.map((item) => ({
                name: MONTH_NAMES[item.month - 1],
                revenue: item.revenue,
              }))
            : filteredRevenue.map((item) => ({
                name: item.period,
                revenue: item.revenue,
              })),
      });
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", {
        message: error.message,
        name: error.name,
        sql: error.sql,
        stack: error.stack,
      });
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
        sql: error.sql,
      });
    }
  }

  // Helper method for filtered revenue data

  async getTotalCarsCount(req, res) {
    try {
      const count = await Cars.count();
      console.log("Counting ", count);
      res.json({ count });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching car count",
        error: error.message,
      });
    }
  }

  async getRevenueData(req, res) {
    try {
      const totalRevenue =
        (await TransactionHistory.sum("amount", {
          where: {
            transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
          },
        })) || 0;

      const currentMonthRevenue =
        (await TransactionHistory.sum("amount", {
          where: {
            transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
            transaction_date: {
              [Op.between]: [
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                new Date(),
              ],
            },
          },
        })) || 0;

      res.json({
        totalRevenue,
        currentMonthRevenue,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching revenue data",
        error: error.message,
      });
    }
  }

  async getMonthlyRevenue(req, res) {
    try {
      const monthlyRevenue = await TransactionHistory.findAll({
        attributes: [
          [sequelize.fn("EXTRACT(MONTH FROM transaction_date)", "month")],
          [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
        ],
        where: {
          transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
        },
        group: [sequelize.fn("EXTRACT(MONTH FROM transaction_date)")],
        order: [[sequelize.fn("EXTRACT(MONTH FROM transaction_date)"), "ASC"]],
        raw: true,
      });

      res.json({ monthlyRevenue });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching monthly revenue",
        error: error.message,
      });
    }
  }

  async getYearlyRevenue(req, res) {
    try {
      const yearlyRevenue = await TransactionHistory.findAll({
        attributes: [
          [sequelize.fn("EXTRACT(YEAR FROM transaction_date)", "year")],
          [sequelize.fn("SUM", sequelize.col("amount")), "revenue"],
        ],
        where: {
          transaction_type: ["INCOME_COMPANY_PAYMENT", "INCOME_INVOICE"],
        },
        group: [sequelize.fn("EXTRACT(YEAR FROM transaction_date)")],
        order: [[sequelize.fn("EXTRACT(YEAR FROM transaction_date)"), "ASC"]],
        raw: true,
      });

      res.json({ yearlyRevenue });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching yearly revenue",
        error: error.message,
      });
    }
  }

  async getCarStats(req, res) {
    try {
      const carStats = await Cars.findAll({
        attributes: [
          "car_id",
          "car_name",
          [
            sequelize.fn("SUM", sequelize.col("CarExpenseStats.amount")),
            "total_expenses",
          ],
        ],
        include: [
          {
            model: CarExpenseStats,
            attributes: [],
          },
        ],
        group: ["Cars.car_id", "Cars.car_name"],
        raw: true,
      });

      res.json({ carStats });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching car stats",
        error: error.message,
      });
    }
  }

  async getTotalExpenses(req, res) {
    try {
      const totalExpenses =
        (await TransactionHistory.sum("amount", {
          where: {
            transaction_type: [
              "EXPENSE_CAR_ADVANCE",
              "EXPENSE_CAR_FUEL",
              "EXPENSE_CAR_OTHER",
              "EXPENSE_GENERAL",
            ],
          },
        })) || 0;

      res.json({ totalExpenses });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching total expenses",
        error: error.message,
      });
    }
  }

  async getMonthlyExpenses(req, res) {
    try {
      const monthlyExpenses = await TransactionHistory.findAll({
        attributes: [
          [sequelize.fn("EXTRACT(MONTH FROM transaction_date)", "month")],
          [sequelize.fn("SUM", sequelize.col("amount")), "expenses"],
        ],
        where: {
          transaction_type: [
            "EXPENSE_CAR_ADVANCE",
            "EXPENSE_CAR_FUEL",
            "EXPENSE_CAR_OTHER",
            "EXPENSE_GENERAL",
          ],
        },
        group: [sequelize.fn("EXTRACT(MONTH FROM transaction_date)")],
        order: [[sequelize.fn("EXTRACT(MONTH FROM transaction_date)"), "ASC"]],
        raw: true,
      });

      res.json({ monthlyExpenses });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching monthly expenses",
        error: error.message,
      });
    }
  }

  async getExpenseBreakdown(req, res) {
    try {
      const expenseBreakdown = await CarExpenseStats.findAll({
        attributes: [
          "category",
          [sequelize.fn("SUM", sequelize.col("amount")), "value"],
        ],
        group: ["category"],
        raw: true,
      });

      res.json({ expenseBreakdown });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching expense breakdown",
        error: error.message,
      });
    }
  }

  async getCarExpenses(req, res) {
    try {
      const carExpenses = await CarExpenseStats.findAll({
        attributes: [
          "car_id",
          [sequelize.fn("SUM", sequelize.col("amount")), "total_expenses"],
        ],
        group: ["car_id"],
        raw: true,
      });

      res.json({ carExpenses });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching car expenses",
        error: error.message,
      });
    }
  }

  async getInvoiceStats(req, res) {
    try {
      const totalInvoices = await Invoice.count();
      const totalInvoiceAmount = (await Invoice.sum("grand_total")) || 0;

      res.json({
        totalInvoices,
        totalInvoiceAmount,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching invoice stats",
        error: error.message,
      });
    }
  }

  async getInvoiceStatusBreakdown(req, res) {
    try {
      const invoiceStatusBreakdown = await Invoice.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("invoice_id")), "count"],
        ],
        group: ["status"],
        raw: true,
      });

      res.json({ invoiceStatusBreakdown });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching invoice status breakdown",
        error: error.message,
      });
    }
  }
}

// Export an instance of the controller
module.exports = new DashboardController();
