module.exports = (sequelize, DataTypes) => {
  const CompanyCars = sequelize.define('CompanyCars', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'company_id'
      }
    },
    car_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'cars',
        key: 'car_id'
      }
    },
    assignment_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'company_cars',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'car_id']
      }
    ]
  });

  return CompanyCars;
};