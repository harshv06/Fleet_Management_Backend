const { Op } = require("sequelize");
// models/Invoice.js
module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    "Invoice",
    {
      invoice_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      invoice_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "companies",
          key: "company_id",
        },
      },
      customer_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customer_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      customer_gst: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      sgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      cgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      grand_total: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "overdue", "cancelled"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "invoices",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["invoice_number", "company_id"],
        },
      ],
    }
  );

  // Class methods for financial reporting
  Invoice.getInvoiceStatusSummary = async function (options = {}) {
    const { start, end } = options;

    try {
      const statusSummary = await this.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("invoice_id")), "count"],
          [sequelize.fn("SUM", sequelize.col("grand_total")), "total_amount"],
        ],
        where:
          start && end
            ? {
                invoice_date: {
                  [Op.between]: [start, end],
                },
              }
            : {},
        group: ["status"],
        raw: true,
      });

      // Transform the result into a more usable format
      return statusSummary.reduce(
        (acc, item) => {
          acc[item.status] = {
            count: parseInt(item.count),
            total_amount: parseFloat(item.total_amount || 0),
          };
          return acc;
        },
        {
          pending: { count: 0, total_amount: 0 },
          paid: { count: 0, total_amount: 0 },
          overdue: { count: 0, total_amount: 0 },
          cancelled: { count: 0, total_amount: 0 },
        }
      );
    } catch (error) {
      console.error("Invoice status summary error:", error);
      throw error;
    }
  };

  // Method to get monthly invoice summary
  Invoice.getMonthlyInvoiceSummary = async function (options = {}) {
    const { start, end } = options;

    try {
      const monthlySummary = await this.findAll({
        attributes: [
          [
            sequelize.fn("DATE_TRUNC", "month", sequelize.col("invoice_date")),
            "month",
          ],
          [sequelize.fn("SUM", sequelize.col("grand_total")), "total_amount"],
          [sequelize.fn("COUNT", sequelize.col("invoice_id")), "invoice_count"],
        ],
        where:
          start && end
            ? {
                invoice_date: {
                  [Op.between]: [start, end],
                },
              }
            : {},
        group: ["month"],
        order: [["month", "ASC"]],
        raw: true,
      });

      return monthlySummary.map((item) => ({
        month: item.month,
        total_amount: parseFloat(item.total_amount || 0),
        invoice_count: parseInt(item.invoice_count || 0),
      }));
    } catch (error) {
      console.error("Monthly invoice summary error:", error);
      throw error;
    }
  };

  return Invoice;
};
