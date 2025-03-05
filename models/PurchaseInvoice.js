// models/PurchaseInvoice.js
module.exports = (sequelize, DataTypes) => {
  const PurchaseInvoice = sequelize.define(
    "PurchaseInvoice",
    {
      purchase_invoice_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      invoice_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "companies",
          key: "company_id",
        },
      },
      vendor_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vendor_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      vendor_gst: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      subtotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_gst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "cancelled"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "purchase_invoices",
      timestamps: true,
      underscored: true,
    }
  );



  return PurchaseInvoice;
};
