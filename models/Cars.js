// models/Cars.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/dbConfig');

module.exports = (sequelize, DataTypes) => {
    const Cars = sequelize.define('Cars', {
      car_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      },
      car_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      car_model: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type_of_car: {
        type: DataTypes.ENUM('Sedan', 'SUV', 'Hatchback', 'Other'),
        allowNull: false
      },
      driver_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      driver_number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      owner_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      owner_number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      owner_account_number: {
        type: DataTypes.STRING,
        allowNull: false
      },
      ifsc_code: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false
      },
      induction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      }
    }, {
      indexes: [
        { fields: ['car_name'] },
        { fields: ['type_of_car'] },
        { fields: ['induction_date'] }
      ],
      tableName: 'cars'
    });

    return Cars;
};