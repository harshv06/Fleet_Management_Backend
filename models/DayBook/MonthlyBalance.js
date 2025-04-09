// models/MonthlyBalance.js
module.exports = (sequelize, DataTypes) => {
  const MonthlyBalance = sequelize.define(
    "MonthlyBalance",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      opening_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      closing_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_credits: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_debits: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      is_closed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      closed_at: {
        type: DataTypes.DATE,
      },
      total_current_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      tableName: "monthly_balances",
      timestamps: true,
      underscored: true,
    }
  );

  return MonthlyBalance;
};
