// models/TransactionHistory.js
module.exports = (sequelize, DataTypes) => {
  const TransactionHistory = sequelize.define(
    "TransactionHistory",
    {
      transaction_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "companies",
          key: "company_id",
        },
      },
      transaction_type: {
        type: DataTypes.ENUM(
          "INVOICE",
          "CAR_PAYMENT",
          "CAR_ADVANCE_PAYMENT", // Ensure this is included
          "CAR_FUEL_PAYMENT",
          "CAR_OTHERS_PAYMENT",
          "CAR_EXPENSE",
          "INVOICE_DELETION",
          "INVOICE_PAYMENT",
          "PAYMENT",
          "EXPENSE",
          "REVENUE",
          "ADJUSTMENT",
          "INVOICE_STATUS_CHANGE"
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      current_total_revenue: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      current_total_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      reference_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "ID of related record (invoice_id, payment_id, etc.)",
      },
      transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      transaction_source: {
        type: DataTypes.ENUM(
          "COMPANY", // Revenue from companies
          "CAR", // Expenses related to cars
          "INTERNAL" // Other internal transactions
        ),
        allowNull: false,
        defaultValue: "INTERNAL",
      },
      reference_source_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "ID of source (company_id, car_id, etc.)",
      },
    },
    {
      tableName: "transaction_histories",
      timestamps: true,
      indexes: [
        { fields: ["company_id"] },
        { fields: ["transaction_type"] },
        { fields: ["transaction_date"] },
      ],
    }
  );

  // Association with Company
  TransactionHistory.associate = (models) => {
    TransactionHistory.belongsTo(models.Company, {
      foreignKey: "company_id",
      as: "company",
    });
  };

  // Method to log transaction with more flexible parameters
  // TransactionHistory.logTransaction = async function (
  //   companyId,
  //   transactionType,
  //   amount,
  //   options = {}
  // ) {
  //   const transaction = await sequelize.transaction();

  //   try {
  //     // Fetch current company stats
  //     const companyStats = await sequelize.models.CompanyStats.findOne({
  //       where: { company_id: companyId },
  //       transaction,
  //     });

  //     // Prepare transaction data
  //     const transactionData = {
  //       company_id: companyId,
  //       transaction_type: transactionType,
  //       amount: amount || 0,
  //       current_total_revenue:
  //         options.currentTotalRevenue ?? (companyStats?.total_revenue || 0),
  //       current_total_expenses:
  //         options.currentTotalExpenses ?? (companyStats?.total_expenses || 0),
  //       reference_id: options.referenceId || null,
  //       description: options.description || null,
  //       metadata: options.metadata || null,
  //     };

  //     // Create transaction record
  //     const transactionRecord = await this.create(transactionData, {
  //       transaction,
  //     });

  //     await transaction.commit();
  //     return transactionRecord;
  //   } catch (error) {
  //     await transaction.rollback();
  //     console.error("Transaction logging error:", error);
  //     throw error;
  //   }
  // };

  TransactionHistory.logTransaction = async function (
    transactionType,
    amount,
    options = {}
  ) {
    const transaction = await sequelize.transaction();

    try {
      // Prepare transaction data
      const transactionData = {
        transaction_type: transactionType,
        amount: amount || 0,
        company_id: options.company_id || null,
        transaction_source: options.source || "INTERNAL",
        reference_source_id: options.reference_source_id || null,
        reference_id: options.referenceId || null,
        description: options.description || null,
        metadata: options.metadata || null,
      };

      // Create transaction record
      const transactionRecord = await this.create(transactionData, {
        transaction,
      });

      // Update company or system-wide stats
      if (transactionType === "REVENUE") {
        await this.updateRevenueStats(amount, options, transaction);
      } else if (
        ["EXPENSE", "CAR_ADVANCE_PAYMENT", "CAR_FUEL_PAYMENT"].includes(
          transactionType
        )
      ) {
        await this.updateExpenseStats(amount, options, transaction);
      }

      await transaction.commit();
      return transactionRecord;
    } catch (error) {
      await transaction.rollback();
      console.error("Transaction logging error:", error);
      throw error;
    }
  };

  TransactionHistory.updateRevenueStats = async function (amount, options, transaction) {
    if (options.company_id) {
      await sequelize.models.CompanyStats.increment(
        { 
          total_revenue: amount,
          total_payments: amount 
        }, 
        { 
          where: { company_id: options.company_id },
          transaction 
        }
      );
    }
  };

  TransactionHistory.updateExpenseStats = async function (amount, options, transaction) {
    // For car-related expenses, use system-wide stats
    await sequelize.models.CompanyStats.increment(
      { total_expenses: amount }, 
      { 
        where: { id: 1 }, // System-wide stats
        transaction 
      }
    );
  };

  TransactionHistory.getExpenseTrends = async function (timeframe) {
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

    return this.findAll({
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
  };


  TransactionHistory.getExpenseBreakdown = async function (timeframe) {
    return this.findAll({
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
  };

  // Method to get financial report (remains the same)
  TransactionHistory.getFinancialReport = async function (
    companyId,
    startDate,
    endDate,
    groupBy = "month"
  ) {
    const { Op } = sequelize;
    const groupByClause = {
      month: sequelize.fn(
        "date_trunc",
        "month",
        sequelize.col("transaction_date")
      ),
      quarter: sequelize.fn(
        "date_trunc",
        "quarter",
        sequelize.col("transaction_date")
      ),
    }[groupBy];

    const report = await this.findAll({
      where: {
        company_id: companyId,
        transaction_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        [groupByClause, "period"],
        [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
        "transaction_type",
      ],
      group: ["period", "transaction_type"],
      order: [["period", "ASC"]],
      raw: true,
    });

    // Transform report into a more usable format
    const transformedReport = report.reduce((acc, item) => {
      const period = item.period;
      if (!acc[period]) {
        acc[period] = {
          period,
          invoices: 0,
          payments: 0,
          expenses: 0,
          revenue: 0,
        };
      }

      acc[period][`${item.transaction_type.toLowerCase()}s`] = parseFloat(
        item.total_amount
      );

      return acc;
    }, {});

    return Object.values(transformedReport);
  };

  TransactionHistory.getMonthlyRevenue = async function (timeframe) {
    const groupBy = {
      yearly: sequelize.fn("YEAR", sequelize.col("transaction_date")),
      quarterly: sequelize.fn("QUARTER", sequelize.col("transaction_date")),
      monthly: sequelize.fn("MONTH", sequelize.col("transaction_date")),
    }[timeframe];

    return this.findAll({
      attributes: [
        [groupBy, "month"],
        [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
      ],
      where: {
        transaction_type: "REVENUE",
      },
      group: ["month"],
      order: [["month", "ASC"]],
    });
  };

  // TransactionHistory.getExpenseTrends = async function (timeframe) {
  //   const groupBy = {
  //     yearly: sequelize.fn(
  //       "EXTRACT",
  //       sequelize.literal('YEAR FROM "transaction_date"')
  //     ),
  //     quarterly: sequelize.fn(
  //       "EXTRACT",
  //       sequelize.literal('QUARTER FROM "transaction_date"')
  //     ),
  //     monthly: sequelize.fn(
  //       "EXTRACT",
  //       sequelize.literal('MONTH FROM "transaction_date"')
  //     ),
  //   }[timeframe];

  //   return this.findAll({
  //     attributes: [
  //       [groupBy, "month"],
  //       [sequelize.fn("SUM", sequelize.col("amount")), "amount"],
  //       "transaction_type",
  //     ],
  //     where: {
  //       transaction_type: {
  //         [Op.in]: [
  //           "EXPENSE",
  //           "CAR_ADVANCE_PAYMENT",
  //           "CAR_FUEL_PAYMENT",
  //           "CAR_OTHERS_PAYMENT",
  //         ],
  //       },
  //     },
  //     group: ["month", "transaction_type"],
  //     order: [["month", "ASC"]],
  //     raw: true,
  //   });
  // };

  return TransactionHistory;
};
