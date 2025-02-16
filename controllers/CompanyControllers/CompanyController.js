const CompanyService = require("../../services/CompanyServices");
const { cacheService } = require("../../utils/cache");
exports.getMonthlyPaymentSum = async (req, res) => {
  try {
    const { companyId } = req.params; // Destructure companyId from req.params
    // console.log("CompanyID:", companyId);

    // Call the service function with or without companyId
    const result = await CompanyService.getMonthlyPaymentSum(companyId);

    // Send the result as a JSON response
    return res.json(result);
  } catch (error) {
    console.error("Error calculating monthly payment sum:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllCompanies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    // console.log("Page:", page, "Limit:", limit);
    const search = req.query.search || ""; // Add search functionality
    const sortBy = req.query.sortBy || "created_at";
    const sortOrder = req.query.sortOrder || "DESC";

    const companies = await CompanyService.getAllCompanies({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    res.json({
      status: "success",
      ...companies, // Spread the companies and pagination data
      currentPage: page,
      itemsPerPage: limit,
    });
  } catch (error) {
    console.error("Error getting companies:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve companies",
      error: error.message,
    });
  }
};

exports.recordPayments = async (req, res) => {
  try {
    const {
      company_id,
      amount,
      payment_method,
      payment_mode,
      payment_date,
      transaction_id,
      status,
      notes,
    } = req.body;

    // Validate required fields
    if (!company_id || !amount) {
      return res.status(400).json({
        status: "error",
        message: "Company ID and amount are required",
      });
    }

    // Validate amount
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Amount must be greater than 0",
      });
    }

    const payment = await CompanyService.recordPayments({
      company_id,
      amount: parseFloat(amount),
      payment_method,
      payment_mode,
      payment_date,
      transaction_id,
      status,
      notes,
    });

    // Clear relevant caches
    await cacheService.clearMultiplePatterns([
      `payment_history_${company_id}`,
      `monthly_sum_${company_id}`,
      "monthly_sum_all",
    ]);

    res.status(201).json({
      status: "success",
      message: "Payment recorded successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { page, limit, startDate, endDate, status, payment_method } =
      req.query;

      console.log("Company ID:", companyId);
    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        status: "error",
        message: "Start date cannot be later than end date",
      });
    }

    const result = await CompanyService.getPaymentHistory(companyId, {
      page,
      limit,
      startDate,
      endDate,
      status,
      payment_method,
    });

    res.json(result);
  } catch (error) {
    console.error("Error retrieving payment history:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await CompanyService.getCompanyById(companyId);
    res.json(company);
  } catch (error) {
    console.error("Error retrieving company by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.addCompany = async (req, res) => {
  try {
    const company = await CompanyService.addCompany(req.body);
    await cacheService.clearCompanyListCache();
    // console.log(
    //   "Company added:",
    //   `/api/getAllCompanies?${req.query.page}&${req.query.limit}`
    // );
    return res.status(201).json({
      status: "success",
      message: "Company created successfully",
      data: company,
    });
  } catch (error) {
    console.error("Error adding company:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        status: "error",
        message:
          "Company with this email or registration number already exists",
      });
    }
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    // console.log("Company ID:", req.params);
    const company = await CompanyService.updateCompany(companyId, req.body);
    await cacheService.clearCompanyListCache();
    return res.status(200).json({
      status: "success",
      message: "Company updated successfully",
      data: company,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    // console.log(companyId);
    await CompanyService.deleteCompany(companyId);
    await cacheService.clearCompanyListCache();
    return res.status(200).json({
      status: "success",
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    // console.log(paymentId);
    await CompanyService.deletePayment(paymentId);
    return res.status(200).json({
      status: "success",
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.updatePaymentDetails = async (req, res) => {
  // console.log(req.body);
  try {
    const { paymentId } = req.params;
    console.log("Company ID:", paymentId);
    const company = await CompanyService.updatePaymentDetails(
      paymentId,
      req.body
    );
    // await cacheService.clearCompanyListCache();
    return res.status(200).json({
      status: "success",
      message: "Payment details updated successfully",
      data: company,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};





