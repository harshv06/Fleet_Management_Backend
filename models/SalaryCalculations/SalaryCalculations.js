module.exports = (sequelize, DataTypes) => {
  const SalaryCalculations = sequelize.define("SalaryCalculations", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    car_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    calculation_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gross_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    tds_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    tds_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    holiday_penalty_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    holiday_penalty_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    other_penalty_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    other_penalty_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    advance_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total_deductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    net_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  });

  SalaryCalculations.associate = (models) => {
    SalaryCalculations.belongsTo(models.Cars, {
      foreignKey: "car_id",
      as: "car",
    });
  };

  return SalaryCalculations;
};
