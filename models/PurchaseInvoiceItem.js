module.exports = (sequelize, DataTypes) => {
  const PurchaseInvoiceItem = sequelize.define(
    "PurchaseInvoiceItem",
    {
      item_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      purchase_invoice_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "purchase_invoices",
          key: "purchase_invoice_id",
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      gst_rate: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 18,
      },
      gst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    },
    {
      tableName: "purchase_invoice_items",
      timestamps: true,
      underscored: true,
    }
  );
  return PurchaseInvoiceItem;
};
