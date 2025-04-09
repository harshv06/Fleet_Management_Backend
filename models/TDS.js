// models/TDSRecord.js
module.exports = (sequelize, DataTypes) => {
  const TDS = sequelize.define(
    "TDSRecord",
    {
      tds_record_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.INTEGER, // or UUID depending on your Company model
        allowNull: false,
        references: {
          model: "companies", // Make sure this matches your table name
          key: "company_id",
        },
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      financial_year: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tds_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tds_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      tds_section: {
        type: DataTypes.STRING, // e.g., '194C', '194J'
        allowNull: true,
      },
      invoice_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      invoice_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      payment_status: {
        type: DataTypes.ENUM("COLLECTED", "DEPOSITED", "PENDING"),
        defaultValue: "COLLECTED",
      },
      deposited_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "tds_records",
      timestamps: true,
    }
  );
  TDS.associate = (models) => {
    TDS.belongsTo(models.Company, {
      foreignKey: "company_id",
      as: "company_tds",
    });

    TDS.belongsTo(models.DayBook, {
      foreignKey: "transaction_id",
      as: "transaction_tds",
      constraints: false,
    });
  };

  return TDS;
};
