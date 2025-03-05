module.exports = (sequelize, DataTypes) => {
  const CompanyStats = sequelize.define(
    "CompanyStats",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "companies",
          key: "company_id",
        },
      },
      total_revenue: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_payments: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      paid_invoices_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_pending_invoices: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_pending_invoices_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_overdue_invoices: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_overdue_invoices_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processed_invoices: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      total_car_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    },
    {
      indexes: [{ fields: ["company_id"] }],
    }
  );

  // Association with Company
  CompanyStats.associate = (models) => {
    CompanyStats.belongsTo(models.Company, {
      foreignKey: "company_id",
      as: "company",
    });
  };

  // Initialize method
  CompanyStats.initialize = async function () {
    const existingStats = await this.findOne();
    if (!existingStats) {
      await this.create({
        id: 1,
        company_id: 1, // Default company ID
        total_revenue: 0,
        total_expenses: 0,
        total_payments: 0,
        paid_invoices_count: 0,
        total_pending_invoices: 0,
        total_pending_invoices_count: 0,
        total_overdue_invoices: 0,
        total_overdue_invoices_count: 0,
      });
    }
  };

  // Method to update company stats when an invoice is generated or updated
  // CompanyStats.updateInvoiceStats = async function (invoiceData) {
  //   const transaction = await sequelize.transaction();

  //   try {
  //     // Find or create company stats
  //     let companyStats = await this.findOne({
  //       where: { company_id: invoiceData.company_id },
  //       transaction,
  //     });

  //     if (!companyStats) {
  //       companyStats = await this.create(
  //         {
  //           company_id: invoiceData.company_id,
  //           total_revenue: 0,
  //           total_expenses: 0,
  //           total_payments: 0,
  //           paid_invoices_count: 0,
  //           total_pending_invoices: 0,
  //           total_pending_invoices_count: 0,
  //           total_overdue_invoices: 0,
  //           total_overdue_invoices_count: 0,
  //           processed_invoices: {},
  //         },
  //         { transaction }
  //       );
  //     }

  //     // Prepare update data
  //     const updateData = {};
  //     const grandTotal = parseFloat(invoiceData.grand_total);
  //     const invoiceId = invoiceData.invoice_id;

  //     // Parse processed invoices
  //     const processedInvoices = companyStats.processed_invoices || {};

  //     // Detailed tracking of revenue addition
  //     const revenueAddedForInvoice =
  //       processedInvoices[invoiceId]?.revenueAdded || false;

  //     // Handle different invoice statuses
  //     switch (invoiceData.status) {
  //       case "pending":
  //         // Handle moving from paid to pending
  //         if (
  //           processedInvoices[invoiceId]?.status === "paid" &&
  //           revenueAddedForInvoice
  //         ) {
  //           updateData.total_revenue = Math.max(
  //             0,
  //             parseFloat(companyStats.total_revenue) - grandTotal
  //           );
  //           updateData.total_payments = Math.max(
  //             0,
  //             parseFloat(companyStats.total_payments) - grandTotal
  //           );
  //           updateData.paid_invoices_count = Math.max(
  //             0,
  //             companyStats.paid_invoices_count - 1
  //           );
  //         }

  //         // Add to pending if not already pending
  //         if (processedInvoices[invoiceId]?.status !== "pending") {
  //           updateData.total_pending_invoices =
  //             parseFloat(companyStats.total_pending_invoices) + grandTotal;
  //           updateData.total_pending_invoices_count =
  //             companyStats.total_pending_invoices_count + 1;
  //         }
  //         break;

  //       case "paid":
  //         // Remove from previous status
  //         if (processedInvoices[invoiceId]?.status === "pending") {
  //           updateData.total_pending_invoices = Math.max(
  //             0,
  //             parseFloat(companyStats.total_pending_invoices) - grandTotal
  //           );
  //           updateData.total_pending_invoices_count = Math.max(
  //             0,
  //             companyStats.total_pending_invoices_count - 1
  //           );
  //         } else if (processedInvoices[invoiceId]?.status === "overdue") {
  //           updateData.total_overdue_invoices = Math.max(
  //             0,
  //             parseFloat(companyStats.total_overdue_invoices) - grandTotal
  //           );
  //           updateData.total_overdue_invoices_count = Math.max(
  //             0,
  //             companyStats.total_overdue_invoices_count - 1
  //           );
  //         }

  //         // Add revenue only if not already added
  //         if (!revenueAddedForInvoice) {
  //           updateData.total_revenue =
  //             parseFloat(companyStats.total_revenue) + grandTotal;
  //           updateData.total_payments =
  //             parseFloat(companyStats.total_payments) + grandTotal;
  //           updateData.paid_invoices_count =
  //             companyStats.paid_invoices_count + 1;
  //         }
  //         break;

  //       case "overdue":
  //         // Remove from previous status
  //         if (processedInvoices[invoiceId]?.status === "pending") {
  //           updateData.total_pending_invoices = Math.max(
  //             0,
  //             parseFloat(companyStats.total_pending_invoices) - grandTotal
  //           );
  //           updateData.total_pending_invoices_count = Math.max(
  //             0,
  //             companyStats.total_pending_invoices_count - 1
  //           );
  //         }

  //         // Add to overdue
  //         updateData.total_overdue_invoices =
  //           parseFloat(companyStats.total_overdue_invoices) + grandTotal;
  //         updateData.total_overdue_invoices_count =
  //           companyStats.total_overdue_invoices_count + 1;
  //         break;

  //       case "cancelled":
  //         // Remove from previous status
  //         if (processedInvoices[invoiceId]?.status === "pending") {
  //           updateData.total_pending_invoices = Math.max(
  //             0,
  //             parseFloat(companyStats.total_pending_invoices) - grandTotal
  //           );
  //           updateData.total_pending_invoices_count = Math.max(
  //             0,
  //             companyStats.total_pending_invoices_count - 1
  //           );
  //         } else if (processedInvoices[invoiceId]?.status === "paid") {
  //           // Revert revenue if cancelled after being paid
  //           updateData.total_revenue = Math.max(
  //             0,
  //             parseFloat(companyStats.total_revenue) - grandTotal
  //           );
  //           updateData.total_payments = Math.max(
  //             0,
  //             parseFloat(companyStats.total_payments) - grandTotal
  //           );
  //           updateData.paid_invoices_count = Math.max(
  //             0,
  //             companyStats.paid_invoices_count - 1
  //           );
  //         }
  //         break;
  //     }

  //     // Update processed invoices with detailed tracking
  //     const updatedProcessedInvoices = {
  //       ...processedInvoices,
  //       [invoiceId]: {
  //         status: invoiceData.status,
  //         revenueAdded:
  //           invoiceData.status === "paid"
  //             ? true
  //             : processedInvoices[invoiceId]?.revenueAdded || false,
  //       },
  //     };
  //     updateData.processed_invoices = updatedProcessedInvoices;

  //     // Update company stats
  //     await companyStats.update(updateData, { transaction });

  //     await transaction.commit();

  //     return companyStats;
  //   } catch (error) {
  //     await transaction.rollback();
  //     throw error;
  //   }
  // };

  CompanyStats.updateExpenseStats = async function (expenseData) {
    const transaction = await sequelize.transaction();

    try {
      console.log("Updating expense stats for transaction:", expenseData);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  CompanyStats.updateTransactionStats = async function (transactionData) {
    const transaction = await sequelize.transaction();

    try {
      // Find or create company stats
      let companyStats = await this.findOne({
        where: {
          company_id: transactionData.company_id || 1, // Default to system-wide stats
        },
        transaction,
      });

      if (!companyStats) {
        companyStats = await this.create(
          {
            company_id: transactionData.company_id || 1,
            total_revenue: 0,
            total_expenses: 0,
            total_car_expenses: 0,
          },
          { transaction }
        );
      }

      // Update stats based on transaction type
      const updateData = {};
      const amount = parseFloat(transactionData.amount);

      if (transactionData.transaction_type === "INCOME_COMPANY_PAYMENT") {
        updateData.total_revenue =
          parseFloat(companyStats.total_revenue) + amount;
      } else if (
        [
          "CAR_ADVANCE_PAYMENT",
          "CAR_FUEL_PAYMENT",
          "CAR_OTHERS_PAYMENT",
        ].includes(transactionData.transaction_type)
      ) {
        updateData.total_expenses =
          parseFloat(companyStats.total_expenses) + amount;
        updateData.total_car_expenses =
          parseFloat(companyStats.total_car_expenses) + amount;
      }

      // Update company stats
      await companyStats.update(updateData, { transaction });

      await transaction.commit();
      return companyStats;
    } catch (error) {
      await transaction.rollback();
      console.error("Transaction stats update error:", error);
      throw error;
    }
  };

  CompanyStats.getCompanyStats = async function (companyId) {
    try {
      const companyStats = await this.findOne({
        where: { company_id: companyId },
        include: [
          {
            model: sequelize.models.Company,
            as: "company",
            attributes: ["company_name"],
          },
        ],
      });

      if (!companyStats) {
        return null;
      }

      return {
        companyName: companyStats.company.company_name,
        totalRevenue: companyStats.total_revenue,
        totalExpenses: companyStats.total_expenses,
        totalCarExpenses: companyStats.total_car_expenses,
        // ... other existing fields
      };
    } catch (error) {
      throw error;
    }
  };

  // In your CompanyStats model
  CompanyStats.updatePurchaseExpenses = async function (
    vendorId,
    amount,
    action
  ) {
    const transaction = await sequelize.transaction();

    try {
      let stats = await this.findOne({
        where: { company_id: vendorId || 1 },
        transaction,
      });

      if (!stats) {
        stats = await this.create(
          {
            company_id: vendorId || 1,
            total_expenses: 0,
            // ... other initial values
          },
          { transaction }
        );
      }

      const updateData = {
        total_expenses:
          action === "add"
            ? sequelize.literal(`total_expenses + ${amount}`)
            : sequelize.literal(`GREATEST(0, total_expenses - ${amount})`),
        updated_at: new Date(),
      };

      await stats.update(updateData, { transaction });
      await transaction.commit();

      return stats;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };
  // Method to get company-specific statistics
  // CompanyStats.getCompanyStats = async function (companyId) {
  //   try {
  //     const companyStats = await this.findOne({
  //       where: { company_id: companyId },
  //       include: [
  //         {
  //           model: sequelize.models.Company,
  //           as: "company",
  //           attributes: ["company_name"],
  //         },
  //       ],
  //     });

  //     if (!companyStats) {
  //       return null;
  //     }

  //     return {
  //       companyName: companyStats.company.company_name,
  //       totalRevenue: companyStats.total_revenue,
  //       totalPayments: companyStats.total_payments,
  //       paidInvoicesCount: companyStats.paid_invoices_count,
  //       pendingInvoices: {
  //         total: companyStats.total_pending_invoices,
  //         count: companyStats.total_pending_invoices_count,
  //       },
  //       overdueInvoices: {
  //         total: companyStats.total_overdue_invoices,
  //         count: companyStats.total_overdue_invoices_count,
  //       },
  //     };
  //   } catch (error) {
  //     throw error;
  //   }
  // };

  CompanyStats.getOverallStats = async function () {
    try {
      const overallStats = await this.findAll({
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("total_revenue")),
            "total_revenue",
          ],
          [
            sequelize.fn("SUM", sequelize.col("total_expenses")),
            "total_expenses",
          ],
          [
            sequelize.fn("SUM", sequelize.col("total_car_expenses")),
            "total_car_expenses",
          ],
          // ... other existing attributes
        ],
        raw: true,
      });

      return overallStats[0];
    } catch (error) {
      throw error;
    }
  };

  // Method to get overall company statistics
  // CompanyStats.getOverallStats = async function () {
  //   try {
  //     // Get total revenue across all companies
  //     const overallStats = await this.findAll({
  //       attributes: [
  //         [
  //           sequelize.fn("SUM", sequelize.col("total_revenue")),
  //           "total_revenue",
  //         ],
  //         [
  //           sequelize.fn("SUM", sequelize.col("total_payments")),
  //           "total_payments",
  //         ],
  //         [
  //           sequelize.fn("SUM", sequelize.col("paid_invoices_count")),
  //           "total_paid_invoices",
  //         ],
  //         [
  //           sequelize.fn("SUM", sequelize.col("total_pending_invoices")),
  //           "total_pending_invoices",
  //         ],
  //         [
  //           sequelize.fn("SUM", sequelize.col("total_overdue_invoices")),
  //           "total_overdue_invoices",
  //         ],
  //       ],
  //       raw: true,
  //     });

  //     return overallStats[0];
  //   } catch (error) {
  //     throw error;
  //   }
  // };

  CompanyStats.handleInvoiceDeletion = async function (invoiceData) {
    const transaction = await sequelize.transaction();

    try {
      // Find company stats
      let companyStats = await this.findOne({
        where: { company_id: invoiceData.company_id },
        transaction,
      });

      if (!companyStats) {
        await transaction.commit();
        return null;
      }

      // Prepare update data
      const updateData = {};
      const grandTotal = parseFloat(invoiceData.grand_total);
      const invoiceId = invoiceData.invoice_id;

      // Remove from respective status
      switch (invoiceData.status) {
        case "pending":
          updateData.total_pending_invoices = Math.max(
            0,
            parseFloat(companyStats.total_pending_invoices) - grandTotal
          );
          updateData.total_pending_invoices_count = Math.max(
            0,
            companyStats.total_pending_invoices_count - 1
          );
          break;

        case "paid":
          // Revert revenue
          updateData.total_revenue = Math.max(
            0,
            parseFloat(companyStats.total_revenue) - grandTotal
          );
          updateData.total_payments = Math.max(
            0,
            parseFloat(companyStats.total_payments) - grandTotal
          );
          updateData.paid_invoices_count = Math.max(
            0,
            companyStats.paid_invoices_count - 1
          );
          break;

        case "overdue":
          updateData.total_overdue_invoices = Math.max(
            0,
            parseFloat(companyStats.total_overdue_invoices) - grandTotal
          );
          updateData.total_overdue_invoices_count = Math.max(
            0,
            companyStats.total_overdue_invoices_count - 1
          );
          break;
      }

      // Remove invoice from processed invoices
      const updatedProcessedInvoices = { ...companyStats.processed_invoices };
      delete updatedProcessedInvoices[invoiceId];
      updateData.processed_invoices = updatedProcessedInvoices;

      // Update company stats
      await companyStats.update(updateData, { transaction });

      await transaction.commit();

      return companyStats;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  return CompanyStats;
};
