// models/PurchaseTransaction.js
module.exports = (sequelize, DataTypes) => {
  const PurchaseTransaction = sequelize.define(
    "PurchaseTransaction",
    {
      transaction_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchase_invoice_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "purchase_invoices",
          key: "purchase_invoice_id",
        },
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "companies",
          key: "company_id",
        },
      },
      vendor_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      transaction_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "purchase_transactions",
      timestamps: true,
      underscored: true,
    }
  );

  // Add class methods for analytics
  PurchaseTransaction.getVendorDistribution = async function (
    startDate,
    endDate
  ) {
    const distribution = await this.findAll({
      attributes: [
        "vendor_name",
        [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
        [
          sequelize.fn("COUNT", sequelize.col("transaction_id")),
          "transaction_count",
        ],
      ],
      where: {
        transaction_date: {
          [Op.between]: [startDate, endDate],
        },
        status: "paid",
      },
      group: ["vendor_name"],
      order: [[sequelize.fn("SUM", sequelize.col("amount")), "DESC"]],
      raw: true,
    });

    return distribution;
  };

  return PurchaseTransaction;
};
