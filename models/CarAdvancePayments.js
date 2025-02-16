module.exports = (sequelize, DataTypes) => {
  const CarPayments = sequelize.define(
    "CarPayments",
    {
      payment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      car_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "cars",
          key: "car_id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      payment_type: {
        type: DataTypes.ENUM("advance", "fuel", "others"),
        allowNull: false,
        defaultValue: "advance",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ["car_id"] },
        { fields: ["payment_date"] },
        { fields: ["car_id", "payment_date"] },
        { fields: ["payment_type"] },
      ],
      tableName: "car_payments",
      hooks: {
        afterCreate: async (payment, options) => {
          if (payment.payment_type === "advance") {
            const { CompanyStats } = sequelize.models;
            await CompanyStats.increment("total_expenses", {
              by: parseFloat(payment.amount),
              where: { id: 1 }, // Assuming single stats row
              transaction: options.transaction,
            });
          }
        },
        beforeUpdate: async (payment, options) => {
          const previousPayment = await payment.constructor.findOne({
            where: { payment_id: payment.payment_id },
            transaction: options.transaction,
          });

          const amountDifference =
            parseFloat(payment.amount) - parseFloat(previousPayment.amount);
          if (amountDifference !== 0) {
            const { CompanyStats } = sequelize.models;
            await CompanyStats.increment("total_expenses", {
              by: amountDifference,
              where: { id: 1 },
              transaction: options.transaction,
            });
          }
        },
        afterDestroy: async (payment, options) => {
          if (payment.payment_type === "advance") {
            console.log("afterDestroy");
            const { CompanyStats } = sequelize.models;
            await CompanyStats.decrement("total_expenses", {
              by: parseFloat(payment.amount),
              where: { id: 1 },
              transaction: options.transaction,
            });
          }
        },

        afterBulkDestroy: async (options) => {
          const { where } = options;

          if (where && where.car_id) {
            const deletedPayments = await CarPayments.findAll({
              where: { car_id: where.car_id },
              paranoid: false,
            });

            const totalDeletedExpenses = deletedPayments
              .filter((payment) => payment.payment_type === "advance")
              .reduce(
                (total, payment) => total + parseFloat(payment.amount),
                0
              );

            const { CompanyStats } = sequelize.models;
            await CompanyStats.decrement("total_expenses", {
              by: totalDeletedExpenses,
              where: { id: 1 },
              transaction: options.transaction,
            });
          }
        },
      },
    }
  );

  return CarPayments;
};
