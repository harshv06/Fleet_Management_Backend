// models/SalaryCalculationHistory.js
module.exports = (sequelize, DataTypes) => {
    const SalaryCalculationHistory = sequelize.define(
      "SalaryCalculationHistory",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        start_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        end_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        total_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        payment_status: {
          type: DataTypes.ENUM("PAID", "UNPAID"),
          defaultValue: "UNPAID",
        },
        calculation_data: {
          type: DataTypes.JSON,
          allowNull: false,
        },
      },
      {
        tableName: 'salary_calculation_history',
        timestamps: true
      }
    );
  
  
    return SalaryCalculationHistory;
  };