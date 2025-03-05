module.exports = (sequelize, DataTypes) => {
    const OpeningBalance = sequelize.define('OpeningBalance', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      set_date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      notes: {
        type: DataTypes.TEXT
      }
    }, {
      tableName: 'opening_balances',
      timestamps: true,
      underscored: true
    });
  
    return OpeningBalance;
  };