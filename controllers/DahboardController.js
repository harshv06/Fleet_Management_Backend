const {
  Cars,
  CarExpenseStats,
  TransactionHistory,
  Invoice,
  sequelize,
  CarPayments,
  PaymentHistory,
  CompanyStats,
  DayBook,
  PurchaseInvoice,
} = require("../models/index");
const { Op } = require("sequelize");

class DashboardController {
  // Remove 'static' and use class methods

  // In DashboardController class, add this new method
  async getFilteredRevenueData(timeframe, year, month) {
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
        const quarter = Math.floor(month / 3) + 1;
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0);

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
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

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
            period: MONTH_NAMES[month],
            revenue: parseFloat(revenueData[0]?.revenue || 0),
          },
        ];
        break;

      default:
        // All months for the year
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
                new Date(`${year}-01-01`),
                new Date(`${year}-12-31`),
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

        // Fill in missing months
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

    return revenueData;
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

      // console.log("Filtered Revenue Data:", formattedData);

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
    try {
      const { month, year, revenueTimeframe } = req.query;
      const currentYear = parseInt(year) || new Date().getFullYear();
      const currentMonth = parseInt(month) || new Date().getMonth();

      const monthlyRevenue = await DayBook.findAll({
        attributes: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("MONTH FROM transaction_date")
            ),
            "month"
          ],
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("YEAR FROM transaction_date")
            ),
            "year"
          ],
          [sequelize.fn("SUM", sequelize.col("amount")), "revenue"]
        ],
        where: {
          transaction_type: "CREDIT",
          voucher_type: {
            [Op.in]: ["Sales", "Receipt", "sales", "receipt", "SALES", "RECEIPT"]
          },
          transaction_date: {
            [Op.between]: [
              new Date(currentYear, 0, 1),  // Start of the year
              new Date(currentYear, 11, 31) // End of the year
            ]
          }
        },
        group: [
          sequelize.fn(
            "EXTRACT",
            sequelize.literal("MONTH FROM transaction_date")
          ),
          sequelize.fn(
            "EXTRACT",
            sequelize.literal("YEAR FROM transaction_date")
          )
        ],
        order: [
          [
            sequelize.fn(
              "EXTRACT",
              sequelize.literal("MONTH FROM transaction_date")
            ),
            "ASC"
          ]
        ],
        raw: true
      });
  
      // Debug logging
      console.log("Monthly Revenue Raw Data:", monthlyRevenue);
  
      // Process Monthly Revenue
      const MONTH_NAMES = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
  
      // Create a map of all months initialized with 0 revenue
      const monthlyRevenueMap = new Map(
        MONTH_NAMES.map((name, index) => [index + 1, { name, revenue: 0 }])
      );
  
      // Populate the map with actual revenue data
      monthlyRevenue.forEach(item => {
        const monthNumber = parseInt(item.month);
        if (monthNumber >= 1 && monthNumber <= 12) {
          monthlyRevenueMap.get(monthNumber).revenue = parseFloat(item.revenue || 0);
        }
      });
  
      // Convert map to array, sorted by month
      const processedMonthlyRevenue = Array.from(monthlyRevenueMap.values());
      console.log("Monthly Revenue: ",monthlyRevenue);
      // Parallel data fetching
      const [
        totalCars,
        totalExpenses,
        totalRevenue,
        totalInvoices,
        totalRemainingAmount,
        expenseBreakdown,
        invoiceStatusBreakdown,
        filteredExpenseBreakdown,
        filteredRevenue,
        daybookDebitTransactions,
      ] = await Promise.all([
        // Total Cars
        Cars.count(),

        // Total Expenses
        CarPayments.sum("amount", {
          where:
            month && year
              ? {
                  [Op.and]: [
                    sequelize.where(
                      sequelize.fn(
                        "EXTRACT",
                        sequelize.literal("MONTH FROM payment_date")
                      ),
                      currentMonth + 1
                    ),
                    sequelize.where(
                      sequelize.fn(
                        "EXTRACT",
                        sequelize.literal("YEAR FROM payment_date")
                      ),
                      currentYear
                    ),
                  ],
                }
              : {},
        }),

        // Total Revenue
        Invoice.sum("grand_total"),

        // Total Invoices
        Invoice.count(),

        // Total Remaining Amount
        Invoice.sum("remaining_amount", {
          where: {
            payment_status: {
              [Op.in]: ["unpaid", "partially_paid"],
            },
          },
        }),

        // Monthly Revenue
        // Expense Breakdown
        CarPayments.findAll({
          attributes: [
            "payment_type",
            [sequelize.fn("SUM", sequelize.col("amount")), "value"],
          ],
          group: ["payment_type"],
          raw: true,
        }),

        // Invoice Status Breakdown
        Invoice.findAll({
          attributes: [
            "status",
            [sequelize.fn("COUNT", sequelize.col("invoice_id")), "count"],
          ],
          group: ["status"],
          raw: true,
        }),

        // Filtered Expense Breakdown
        CarPayments.findAll({
          attributes: [
            "payment_type",
            [sequelize.fn("SUM", sequelize.col("amount")), "value"],
          ],
          where:
            month && year
              ? {
                  [Op.and]: [
                    sequelize.where(
                      sequelize.fn(
                        "EXTRACT",
                        sequelize.literal("MONTH FROM payment_date")
                      ),
                      currentMonth + 1
                    ),
                    sequelize.where(
                      sequelize.fn(
                        "EXTRACT",
                        sequelize.literal("YEAR FROM payment_date")
                      ),
                      currentYear
                    ),
                  ],
                }
              : {},
          group: ["payment_type"],
          raw: true,
        }),

        // Filtered Revenue
        this.getFilteredRevenueData(
          revenueTimeframe,
          currentYear,
          currentMonth
        ),

        DayBook.findAll({
          attributes: [
            "party_type",
            [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
            [
              sequelize.fn("COUNT", sequelize.col("transaction_id")),
              "transaction_count",
            ],
          ],
          where: {
            transaction_type: "DEBIT",
            party_type: {
              [Op.in]: ["Customer", "Vendor", "Other"],
            },
            ...(month && year
              ? {
                  [Op.and]: [
                    sequelize.where(
                      sequelize.fn(
                        "EXTRACT",
                        sequelize.literal("MONTH FROM transaction_date")
                      ),
                      currentMonth + 1
                    ),
                    sequelize.where(
                      sequelize.fn(
                        "EXTRACT",
                        sequelize.literal("YEAR FROM transaction_date")
                      ),
                      currentYear
                    ),
                  ],
                }
              : {}),
          },
          group: ["party_type"],
          order: [[sequelize.fn("SUM", sequelize.col("amount")), "DESC"]],
          raw: true,
        }),
      ]);

      const purchaseInvoices = await PurchaseInvoice.sum("total_amount");
      console.log(purchaseInvoices);

      const formattedDaybookDebitTransactions = daybookDebitTransactions.map(
        (item) => ({
          party_type: item.party_type || "Unknown",
          total_amount: parseFloat(item.total_amount || 0),
          transaction_count: parseInt(item.transaction_count || 0),
        })
      );

      // Calculate total debit amount from Daybook
      const totalDaybookDebitAmount = formattedDaybookDebitTransactions.reduce(
        (sum, item) => sum + item.total_amount,
        0
      );

      // Process and format data
      // const processedMonthlyRevenue = monthlyRevenue
      //   .map((item) => ({
      //     month: item.month ? new Date(item.month).getMonth() + 1 : null,
      //     revenue: parseFloat(item.revenue || 0),
      //   }))
      //   .filter((item) => item.month !== null);

      return res.status(200).json({
        totalCars,
        totalExpenses: parseFloat(totalExpenses || 0),
        totalRevenue: parseFloat(totalRevenue || 0),
        totalInvoices,
        monthlyRevenue: processedMonthlyRevenue,
        expenseBreakdown: expenseBreakdown.map((item) => ({
          payment_type: item.payment_type,
          value: parseFloat(item.value || 0),
        })),
        invoiceStatusBreakdown,
        formattedExpenseBreakdown: filteredExpenseBreakdown.map((item) => ({
          payment_type: item.payment_type,
          value: parseFloat(item.value || 0),
        })),
        totalRemainingAmount: parseFloat(totalRemainingAmount || 0),
        filteredRevenue,
        daybookDebitTransactions: formattedDaybookDebitTransactions,
        totalDaybookDebitAmount,
        daybookDebitTransactionBreakdown: {
          total_amount: totalDaybookDebitAmount,
          breakdown: formattedDaybookDebitTransactions,
        },
        purchaseInvoices,
      });
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  }

  // Additional method for detailed debit transactions
  async getDetailedDebitTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        party_type,
        start_date,
        end_date,
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = {
        transaction_type: "DEBIT",
      };

      if (category) whereConditions.category = category;
      if (party_type) whereConditions.party_type = party_type;

      if (start_date && end_date) {
        whereConditions.transaction_date = {
          [Op.between]: [new Date(start_date), new Date(end_date)],
        };
      }

      // Fetch paginated transactions
      const { count, rows: transactions } = await DayBook.findAndCountAll({
        where: whereConditions,
        order: [["transaction_date", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return res.status(200).json({
        total_transactions: count,
        current_page: page,
        total_pages: Math.ceil(count / limit),
        transactions: transactions.map((transaction) => ({
          ...transaction.toJSON(),
          amount: parseFloat(transaction.amount),
        })),
      });
    } catch (error) {
      console.error("Detailed Debit Transactions Error:", {
        message: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: "Failed to fetch detailed debit transactions",
        details: error.message,
      });
    }
  }

  // Helper method for filtered revenue data

  async getTotalCarsCount(req, res) {
    try {
      const count = await Cars.count();
      // console.log("Counting ", count);
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
