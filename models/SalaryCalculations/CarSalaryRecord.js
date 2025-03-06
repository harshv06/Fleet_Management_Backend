// models/CarSalaryRecord.js
module.exports = (sequelize, DataTypes) => {
    const CarSalaryRecord = sequelize.define(
      "CarSalaryRecord",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        calculation_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'salary_calculation_history',
            key: 'id'
          }
        },
        car_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: "cars",
            key: "car_id",
          },
        },
        gross_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        net_amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        deductions: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        tableName: 'car_salary_records',
        timestamps: true
      }
    );
  
  
    return CarSalaryRecord;
  };