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
      transaction_type: {
        type: DataTypes.ENUM(
          "INCOME_COMPANY_PAYMENT",
          "INCOME_INVOICE",
          "EXPENSE_CAR_ADVANCE",
          "EXPENSE_CAR_FUEL",
          "EXPENSE_CAR_OTHER",
          "EXPENSE_GENERAL",
          "REVENUE",
          "INVOICE_STATUS_CHANGE"
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
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
      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "car_payments",
          key: "payment_id",
        },
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

    TransactionHistory.belongsTo(models.CarPayments, {
      foreignKey: "payment_id",
      as: "carPayment",
      constraints: false,
    });
  };

  return TransactionHistory;
};
