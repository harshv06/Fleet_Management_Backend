// models/CarExpenseStats.js
module.exports = (sequelize, DataTypes) => {
  const CarExpenseStats = sequelize.define(
    "CarExpenseStats",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      car_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_advance_payments: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_fuel_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_maintenance_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_other_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      last_payment_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ["car_id"] },
        { fields: ["month"] },
        { fields: ["year"] },
        { unique: true, fields: ["car_id", "month", "year"] },
      ],
    }
  );

  // Add methods to get statistics
  CarExpenseStats.getMonthlyStats = async function (month, year) {
    try {
      const stats = await this.findAll({
        where: { month, year },
        include: [
          {
            model: sequelize.models.Cars,
            attributes: ["registration_number"],
          },
        ],
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("total_advance_payments")),
            "total_advances",
          ],
          [
            sequelize.fn("SUM", sequelize.col("total_expenses")),
            "total_expenses",
          ],
          "car_id",
        ],
        group: ["car_id", "Cars.registration_number"],
        raw: true,
      });

      return stats;
    } catch (error) {
      throw error;
    }
  };

  CarExpenseStats.getCarStats = async function (carId) {
    try {
      const stats = await this.findAll({
        where: { car_id: carId },
        attributes: [
          "month",
          "year",
          "total_advance_payments",
          "total_fuel_expenses",
          "total_maintenance_expenses",
          "total_other_expenses",
          "total_expenses",
        ],
        order: [
          ["year", "DESC"],
          ["month", "DESC"],
        ],
        limit: 12,
      });

      return stats;
    } catch (error) {
      throw error;
    }
  };

  return CarExpenseStats;
};
