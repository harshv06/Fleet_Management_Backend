const { Sequelize,Op } = require("sequelize");
// const { Op } = require("sequelize");

const sequelize = new Sequelize("bill_management", "jaydeepw", "new_password", {
  host: "localhost",
  dialect: "postgres",
  logging: (sql, timing) => {
    if (timing > 1000) {
      console.warn(`Slow query: ${sql} (${timing}ms)`);
    }
  },
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    statement_timeout: 60000, // 30 seconds
    idle_in_transaction_session_timeout: 60000,
  },
  operatorsAliases: {
    $between: Op.between,
    // other aliases if needed
  },
});

module.exports = sequelize;
