module.exports = (sequelize, DataTypes) => {
  const CompanyCars = sequelize.define(
    "CompanyCars",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      car_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "cars",
          key: "car_id",
        },
      },
      fleet_company_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "FleetCompanies",
          key: "fleet_company_id",
        },
      },
      assignment_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      unassignment_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
      },
    },
    {
      tableName: "car_companies",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["car_id", "fleet_company_id"],
        },
      ],
    }
  );

  CompanyCars.associate = (models) => {
    CompanyCars.belongsTo(models.Cars, {
      foreignKey: "car_id",
      as: "car",
    });
    CompanyCars.belongsTo(models.FleetCompany, {
      foreignKey: "fleet_company_id",
      as: "company",
    });
  };

  return CompanyCars;
};
