// models/BankAccount.js
module.exports = (sequelize, DataTypes) => {
    const BankAccount = sequelize.define('BankAccount', {
      account_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      bank_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      account_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      account_type: {
        type: DataTypes.ENUM('SAVINGS', 'CURRENT', 'FIXED_DEPOSIT', 'RECURRING_DEPOSIT'),
        allowNull: false
      },
      initial_balance: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
      },
      current_balance: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
      },
      branch_name: {
        type: DataTypes.STRING
      },
      ifsc_code: {
        type: DataTypes.STRING
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      opening_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'bank_accounts',
      timestamps: true
    });
  
    BankAccount.associate = (models) => {
      BankAccount.hasMany(models.BankTransactionModel, {
        foreignKey: 'account_id',
        as: 'transactions'
      });
    };
  
    return BankAccount;
  };