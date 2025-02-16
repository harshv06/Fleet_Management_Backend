module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      payment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "card", "bank_transfer", "upi", "cheque"),
        allowNull: false,
        defaultValue: "cash",
      },
      payment_mode: {
        type: DataTypes.ENUM("advance", "partial", "full"),
        allowNull: false,
        defaultValue: "full",
      },
      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      transaction_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      receipt_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
        defaultValue: "completed",
      },
      notes: DataTypes.TEXT,
    },
    {
      tableName: "payments",
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: async (payment) => {
          if (!payment.receipt_number) {
            const prefix = "RCPT";
            const date = new Date()
              .toISOString()
              .slice(2, 10)
              .replace(/-/g, "");
            const random = Math.floor(Math.random() * 10000)
              .toString()
              .padStart(4, "0");
            payment.receipt_number = `${prefix}${date}${random}`;
          }
        },
        // afterCreate: async (payment, options) => {
        //   const { Company, CompanyStats } = sequelize.models;
        //   console.log("afterCreate");
        //   await Promise.all([
        //     Company.increment("total_revenue", {
        //       by: parseFloat(payment.amount),
        //       where: { company_id: payment.company_id },
        //       transaction: options.transaction,
        //     }),
        //     CompanyStats.increment("total_payments", {
        //       by: 1,
        //       where: { id: 1 },
        //       transaction: options.transaction,
        //     }),
        //     CompanyStats.increment("total_revenue", {
        //       by: parseFloat(payment.amount),
        //       where: { id: 1 },
        //       transaction: options.transaction,
        //     }),
        //   ]);
        // },
        // beforeUpdate: async (payment, options) => {
        //   const previousPayment = await payment.constructor.findOne({
        //     where: { payment_id: payment.payment_id },
        //     transaction: options.transaction,
        //   });

        //   const amountDifference =
        //     parseFloat(payment.amount) - parseFloat(previousPayment.amount);
        //   console.log(amountDifference);
        //   if (amountDifference !== 0) {
        //     const { Company, CompanyStats } = sequelize.models;
        //     if (amountDifference > 0) {
        //       await Promise.all([
        //         Company.increment("total_revenue", {
        //           by: amountDifference,
        //           where: { company_id: payment.company_id },
        //           transaction: options.transaction,
        //         }),
        //         CompanyStats.increment("total_revenue", {
        //           by: amountDifference,
        //           where: { id: 1 },
        //           transaction: options.transaction,
        //         }),
        //       ]);
        //     } else {
        //       await Promise.all([
        //         Company.decrement("total_revenue", {
        //           by: -amountDifference,
        //           where: { company_id: payment.company_id },
        //           transaction: options.transaction,
        //         }),
        //         CompanyStats.decrement("total_revenue", {
        //           by: -amountDifference,
        //           where: { id: 1 },
        //           transaction: options.transaction,
        //         }),
        //       ]);
        //     }
        //   }
        // },
        // afterDestroy: async (payment, options) => {
        //   const { Company, CompanyStats } = sequelize.models;
        //   console.log("afterDestroy");
        //   await Promise.all([
        //     Company.decrement("total_revenue", {
        //       by: parseFloat(payment.amount),
        //       where: { company_id: payment.company_id },
        //       transaction: options.transaction,
        //     }),
        //     CompanyStats.decrement("total_payments", {
        //       by: 1,
        //       where: { id: 1 },
        //       transaction: options.transaction,
        //     }),
        //     CompanyStats.decrement("total_revenue", {
        //       by: parseFloat(payment.amount),
        //       where: { id: 1 },
        //       transaction: options.transaction,
        //     }),
        //   ]);
        // },
      },
    }
  );

  return Payment;
};
