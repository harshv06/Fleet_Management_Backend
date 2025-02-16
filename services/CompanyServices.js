const {
  Company,
  Payment,
  sequelize,
  CompanyStats,
} = require("../models/index");
const { Op } = require("sequelize");
// const Payment = require("../models/Payment");
// const sequelize = require("../config/dbConfig");
const cacheService = require("../utils/cache");

exports.getMonthlyPaymentSum = async (companyId) => {
  try {
    // Get the current date
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    if (companyId) {
      // Query to get payments for the current month for a specific company
      const payments = await Payment.findAll({
        attributes: ["payment_date", "amount"],
        where: {
          company_id: companyId,
          payment_date: {
            [Op.gte]: startOfMonth,
            [Op.lte]: endOfMonth,
          },
        },
        order: [["payment_date", "ASC"]],
      });

      // Calculate the total payments for the company
      const totalPayments = payments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount),
        0
      );

      // console.log(
      //   `Total payments for company ID ${companyId} for the current month: $${totalPayments}`
      // );
      return {
        totalPayments,
        paymentList: payments.map((payment) => ({
          date: payment.payment_date,
          amount: payment.amount,
        })),
      };
    } else {
      // Query to calculate the sum of payments for the current month for all companies
      const result = await Payment.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("amount")), "totalPayments"],
        ],
        where: {
          payment_date: {
            [Op.gte]: startOfMonth,
            [Op.lte]: endOfMonth,
          },
        },
      });

      const totalPayments = result.get("totalPayments") || 0;
      // console.log(
      //   `Total payments for the current month of all companies: $${totalPayments}`
      // );
      return { totalPayments };
    }
  } catch (error) {
    console.error("Error calculating monthly payment sum:", error);
    return { totalPayments: 0, paymentList: [] }; // Return a default value in case of error
  }
};

exports.getAllCompanies = async ({
  page = 1,
  limit = 10,
  search = "",
  sortBy = "created_at",
  sortOrder = "DESC",
}) => {
  try {
    const offset = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
      ? {
          [Op.or]: [
            { company_name: { [Op.iLike]: `%${search}%` } },
            { registration_number: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // Validate sort parameters
    const validSortColumns = [
      "created_at",
      "company_name",
      "registration_number",
      "status",
      "total_revenue",
    ];

    const validSortOrders = ["ASC", "DESC"];

    const finalSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";
    const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    const { rows: companies, count } = await Company.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[finalSortBy, finalSortOrder]],
      attributes: [
        "company_id",
        "company_name",
        "gst_number",
        "pan_number",
        "address",
        "client_type",
        "email",
        "phone",
        "total_revenue",
        "created_at",
      ],
      // Add any necessary includes
      include: [
        // Add related models if needed
      ],
    });

    // Calculate pagination details
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      companies,
      total: count,
      pages: totalPages,
      currentPage: page,
      hasNextPage,
      hasPrevPage,
      pagination: {
        total: count,
        perPage: limit,
        currentPage: page,
        lastPage: totalPages,
        from: offset + 1,
        to: Math.min(offset + limit, count),
      },
    };
  } catch (error) {
    console.error("Error retrieving companies:", error);
    throw new Error(`Failed to retrieve companies: ${error.message}`);
  }
};

const generateReceiptNumber = async () => {
  const prefix = "RCPT";
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}${date}${random}`;
};

// Add this to get payment history
exports.getPaymentHistory = async (companyId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      status,
      payment_method,
    } = options;

    // Build where clause
    const where = { company_id: companyId };

    // Date range filter
    if (startDate || endDate) {
      where.payment_date = {};
      if (startDate) {
        where.payment_date[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.payment_date[Op.lte] = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Payment method filter
    if (payment_method && payment_method !== "all") {
      where.payment_method = payment_method;
    }

    // console.log("Query filters:", where); // For debugging

    const payments = await Payment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["payment_date", "DESC"]],
      include: [
        {
          model: Company,
          attributes: ["company_name", "total_revenue"],
          required: true,
        },
      ],
      distinct: true, // Important for correct count with includes
    });

    // Calculate totals
    const totalAmount = payments.rows.reduce(
      (sum, payment) => sum + parseFloat(payment.amount),
      0
    );

    return {
      status: "success",
      data: {
        payments: payments.rows,
        pagination: {
          total: payments.count,
          totalPages: Math.ceil(payments.count / limit),
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
        summary: {
          totalAmount: totalAmount.toFixed(2),
          filteredCount: payments.rows.length,
          totalCount: payments.count,
        },
      },
    };
  } catch (error) {
    console.error("Error in getPaymentHistory:", error);
    throw new Error(`Failed to fetch payment history: ${error.message}`);
  }
};

exports.getCompanyById = async (id) => {
  try {
    const company = await Company.findByPk(id);
    // console.log("Company by ID:", company);
    return company;
  } catch (error) {
    console.error("Error retrieving company by ID:", error);
  }
};

exports.addCompany = async (companyData) => {
  const transaction = await sequelize.transaction();

  try {
    // Add timestamps
    companyData.created_at = new Date();
    companyData.updated_at = new Date();

    const company = await Company.create(companyData, {
      transaction,
      fields: [
        "company_name",
        "registration_number",
        "email",
        "phone",
        "address",
        "status",
        "created_at",
        "updated_at",
      ],
    });

    // await cacheService.del("/api/getAllCompanies");

    await transaction.commit();
    return company;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.updateCompany = async (id, companyData) => {
  const transaction = await sequelize.transaction();

  try {
    // Add timestamps
    companyData.updated_at = new Date();

    const company = await Company.update(companyData, {
      where: { company_id: id },
      transaction,
      fields: [
        "company_name",
        "registration_number",
        "email",
        "phone",
        "address",
        "status",
        "updated_at",
      ],
    });

    // const keys = await cacheService.keys("*companies*");
    // await Promise.all(keys.map((key) => cacheService.del(key)));

    await transaction.commit();
    return company;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

exports.deleteCompany = async (id) => {
  try {
    const company = await Company.destroy({
      where: { company_id: id },
    });
    return company;
  } catch (error) {
    console.error("Error deleting company:", error);
  }
};

exports.recordPayments = async (paymentData) => {
  const transaction = await sequelize.transaction();

  try {
    // Validate input data
    if (!paymentData.company_id || !paymentData.amount) {
      throw new Error("Company ID and amount are required");
    }

    // Check if company exists
    const company = await Company.findByPk(paymentData.company_id);
    if (!company) {
      throw new Error("Company not found");
    }

    // Generate receipt number
    const receipt_number = await generateReceiptNumber();

    // Prepare payment data with defaults
    const paymentRecord = {
      company_id: paymentData.company_id,
      amount: parseFloat(paymentData.amount),
      payment_method: paymentData.payment_method || "cash",
      payment_mode: paymentData.payment_mode || "full",
      payment_date: paymentData.payment_date
        ? new Date(paymentData.payment_date)
        : new Date(),
      transaction_id: paymentData.transaction_id || null,
      status: paymentData.status || "completed",
      notes: paymentData.notes || null,
      receipt_number: receipt_number,
    };

    // console.log("Payment data to be created:", paymentRecord);

    // Create payment record
    const payment = await Payment.create(paymentRecord, {
      transaction,
      validate: true,
    });

    await transaction.commit();

    // Fetch the payment with company details
    const paymentWithDetails = await Payment.findByPk(payment.payment_id, {
      include: [
        {
          model: Company,
          attributes: ["company_name", "total_revenue"],
        },
      ],
    });
    // console.log("Payment with details:", paymentWithDetails);
    return paymentWithDetails;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error("Payment creation error:", error);
    throw new Error(`Failed to record payment: ${error.message}`);
  }
};

exports.updatePaymentDetails = async (id, paymentData) => {
  const transaction = await sequelize.transaction();
  try {
    const company = await Company.findByPk(paymentData.company_id);
    if (!company) {
      throw new Error("Company not found");
    }

    const paymentRecord = {
      company_id: paymentData.company_id,
      amount: parseFloat(paymentData.amount),
      payment_method: paymentData.payment_method || "cash",
      payment_mode: paymentData.payment_mode || "full",
      payment_date: paymentData.payment_date
        ? new Date(paymentData.payment_date)
        : new Date(),
      transaction_id: paymentData.transaction_id || null,
      status: paymentData.status || "completed",
      notes: paymentData.notes || null,
      receipt_number: paymentData.receipt_number || null,
    };

    await Payment.update(paymentRecord, {
      where: { payment_id: id },
      transaction,
      validate: true,
      individualHooks: true, // Ensures hooks run
      fields: Object.keys(paymentRecord), // Ensure all fields are considered
    });

    await transaction.commit();

    // Fetch the payment with company details
    const paymentWithDetails = await Payment.findByPk(paymentData.payment_id, {
      include: [
        {
          model: Company,
          attributes: ["company_name", "total_revenue"],
        },
      ],
    });
    // console.log("Payment with details:", paymentWithDetails);
    return paymentWithDetails;
  } catch (error) {
    console.error("Error updating company:", error);
  }
};

exports.deletePayment = async (id) => {
  try {
    const payment = await Payment.destroy({
      where: { payment_id: id },
    });
    return payment;
  } catch (error) {
    console.error("Error deleting company:", error);
  }
};
