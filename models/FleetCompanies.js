module.exports = (sequelize, DataTypes) => {
  const FleetCompany = sequelize.define("FleetCompany", {
    fleet_company_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    contact_person: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
  });

  return FleetCompany;
};
