const { Invoice } = require("../models/index");
const { Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    "Company",
    {
      company_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      company_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gst_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        validate: {
          // Optional GST number validation
          is: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i,
        },
      },
      pan_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        validate: {
          // Optional PAN number validation
          is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      client_type: {
        type: DataTypes.ENUM("owned", "sub_vendor"),
        defaultValue: "owned",
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phone: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM("active", "inactive", "suspended"),
        defaultValue: "active",
      },
      total_revenue: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: DataTypes.DATE,
    },
    {
      tableName: "companies",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: "company_search_idx",
          fields: ["company_name", "gst_number", "pan_number"],
        },
      ],
    }
  );

  Company.getRevenueBreakdown = async function (options = {}) {
    const { start, end } = options;

    // Validate date range
    if (start && end && new Date(start) > new Date(end)) {
      throw new Error("Start date must be before or equal to end date");
    }

    try {
      const revenueBreakdown = await this.findAll({
        attributes: [
          "company_id",
          "company_name",
          [
            sequelize.fn("SUM", sequelize.col("invoices.grand_total")),
            "total_revenue",
          ],
          [
            sequelize.fn("COUNT", sequelize.col("invoices.invoice_id")),
            "invoice_count",
          ],
        ],
        include: [
          {
            model: sequelize.models.Invoice,
            as: "invoices",
            attributes: [],
            where: {
              ...(start && end
                ? {
                    invoice_date: {
                      [Op.between]: [start, end],
                    },
                  }
                : {}),
              status: "paid",
            },
          },
        ],
        group: ["company.company_id", "company.company_name"],
        order: [[sequelize.col("total_revenue"), "DESC"]],
        limit: 5,
        raw: true,
      });

      // Handle empty result set
      if (!revenueBreakdown || revenueBreakdown.length === 0) {
        return [];
      }

      return revenueBreakdown.map((company) => ({
        company_id: company.company_id,
        company_name: company.company_name,
        total_revenue: parseFloat(company.total_revenue || 0),
        invoice_count: parseInt(company.invoice_count || 0),
      }));
    } catch (error) {
      console.error("Detailed Company revenue breakdown error:", {
        message: error.message,
        stack: error.stack,
        options,
      });
      throw error;
    }
  };

  // Optional: Add a method to get top companies by revenue
  Company.getRevenueBreakdown = async function (options = {}) {
    const { start, end } = options;

    try {
      const revenueBreakdown = await this.findAll({
        attributes: [
          "company_id",
          "company_name",
          [
            sequelize.fn("SUM", sequelize.col("companyInvoices.grand_total")),
            "total_revenue",
          ],
          [
            sequelize.fn("COUNT", sequelize.col("companyInvoices.invoice_id")),
            "invoice_count",
          ],
        ],
        include: [
          {
            model: Invoice,
            as: "companyInvoices", // Use the alias from models/index.js
            attributes: [],
            where: {
              ...(start && end
                ? {
                    invoice_date: {
                      [Op.between]: [start, end],
                    },
                  }
                : {}),
              status: "paid",
            },
          },
        ],
        group: ["Company.company_id", "Company.company_name"],
        order: [[sequelize.col("total_revenue"), "DESC"]],
        limit: 5,
        raw: true,
      });

      // Transform the result
      return revenueBreakdown.map((company) => ({
        company_id: company.company_id,
        company_name: company.company_name,
        total_revenue: parseFloat(company.total_revenue || 0),
        invoice_count: parseInt(company.invoice_count || 0),
      }));
    } catch (error) {
      console.error("Detailed Company revenue breakdown error:", {
        message: error.message,
        stack: error.stack,
        options,
      });
      throw error;
    }
  };

  // Associations method
  Company.associate = (models) => {
    Company.hasMany(models.Invoice, {
      foreignKey: "company_id",
      as: "companyInvoices",
    });

    Company.hasMany(models.CompanyStats, {
      foreignKey: "company_id",
      as: "companyStats",
    });
  };
  return Company;
};
