// models/BankTransaction.js
module.exports = (sequelize, DataTypes) => {
  const BankTransaction = sequelize.define(
    "BankTransaction",
    {
      transaction_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      account_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      transaction_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.ENUM("CREDIT", "DEBIT"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      reference_number: {
        type: DataTypes.STRING,
      },
      balance_after_transaction: {
        type: DataTypes.DECIMAL(15, 2),
      },
      category: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      is_reconciled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "bank_transactions",
      timestamps: true,
    }
  );

  BankTransaction.associate = (models) => {
    BankTransaction.belongsTo(models.BankAccountModel, {
      foreignKey: "account_id",
      as: "account",
    });
  };

  return BankTransaction;
};
