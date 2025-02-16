const { CarPayments } = require("../models/index");
const { Op } = require("sequelize");

class PaymentService {
  static async getAdvancePayment(carId, startDate, endDate) {
    const payments = await CarPayments.findAll({
      where: {
        car_id: carId,
        payment_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["payment_date", "ASC"]],
      attributes: ["payment_id", "amount", "payment_date", "notes"],
    });
    // console.log(payments);
    return payments;
  }
}

module.exports = PaymentService;
