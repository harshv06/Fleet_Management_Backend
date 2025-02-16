  // models/InvoiceItem.js
  module.exports = (sequelize, DataTypes) => {
    const InvoiceItem = sequelize.define('InvoiceItem', {
      item_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      invoice_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'invoices',
          key: 'invoice_id'
        }
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false
      },
      hsn_code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      }
    }, {
      tableName: 'invoice_items',
      timestamps: true,
      underscored: true
    });
  
    return InvoiceItem;
  };