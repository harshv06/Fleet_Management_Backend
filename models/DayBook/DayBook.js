// models/DayBook.js
module.exports = (sequelize, DataTypes) => {
  const DayBook = sequelize.define(
    "DayBook",
    {
      transaction_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        // Add this field
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "companies",
          key: "company_id",
        },
      },
      transaction_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      transaction_type: {
        type: DataTypes.ENUM("CREDIT", "DEBIT"),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      reference_number: {
        type: DataTypes.STRING,
      },
      category: {
        type: DataTypes.STRING,
      },
      payment_method: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      // New fields
      account_head: {
        type: DataTypes.STRING,
      },
      sub_account: {
        type: DataTypes.STRING,
      },
      voucher_type: {
        type: DataTypes.STRING,
      },
      voucher_number: {
        type: DataTypes.STRING,
      },
      gst_applicable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      gst_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      gst_rate: {
        type: DataTypes.DECIMAL(5, 2),
      },
      narration: {
        type: DataTypes.TEXT,
      },
      party_name: {
        type: DataTypes.STRING,
      },
      party_type: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "daybook",
      timestamps: true,
      underscored: true,
    }
  );

  return DayBook;
};
