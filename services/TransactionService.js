// services/TransactionTrackingService.js
const {
  PaymentHistory,
  CompanyStats,
  sequelize,
  Company,
  Cars,
} = require("../models/index");
const { Op } = require("sequelize");

class TransactionTrackingService {
  static TRANSACTION_TYPES = {
    INCOME: {
      COMPANY_PAYMENT: "INCOME_COMPANY_PAYMENT",
      INVOICE: "INCOME_INVOICE",
    },
    EXPENSE: {
      CAR_ADVANCE: "EXPENSE_CAR_ADVANCE",
      CAR_FUEL: "EXPENSE_CAR_FUEL",
      CAR_OTHER: "EXPENSE_CAR_OTHER",
      GENERAL: "EXPENSE_GENERAL",
    },
  };

  static async recordTransaction(data) {
    const transaction = await sequelize.transaction();
    try {
      const {
        type,
        amount,
        source,
        sourceId,
        description,
        metadata = {},
      } = data;

      // console.log(data);
      // Record in PaymentHistory
      const transactionRecord = await PaymentHistory.create(
        {
          transaction_type: type,
          amount,
          transaction_source: source,
          reference_source_id: sourceId,
          description,
          metadata,
          transaction_date: new Date(),
        },
        { transaction }
      );

      // Update CompanyStats if it's a company transaction
      if (source === "COMPANY") {
        await CompanyStats.updateTransactionStats(
          {
            company_id: sourceId,
            transaction_type: type,
            amount,
          },
          { transaction }
        );
      }

      await transaction.commit();
      return transactionRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = TransactionTrackingService;
