// routes/CompanyRoutes.js
const CompanyRouter = require("express").Router();
const CompanyController = require("../controllers/CompanyControllers/CompanyController.js");
const rateLimit = require("express-rate-limit");
const {
  cacheMiddleware,
  paymentCacheMiddleware,
  clearCacheMiddleware,
} = require("../middlewares/cacheMiddleware");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const CACHE_DURATIONS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 600, // 10 minutes
  LONG: 1800, // 30 minutes
};

// Read operations with cache
CompanyRouter.get(
  "/getMonthlyPaymentSum/:companyId?",
  cacheMiddleware(CACHE_DURATIONS.SHORT),
  CompanyController.getMonthlyPaymentSum
);

CompanyRouter.get(
  "/getPaymentHistory/:companyId",
  paymentCacheMiddleware(CACHE_DURATIONS.SHORT),
  CompanyController.getPaymentHistory
);

CompanyRouter.get(
  "/getAllCompanies",
  apiLimiter,
  cacheMiddleware(CACHE_DURATIONS.SHORT),
  CompanyController.getAllCompanies
);

CompanyRouter.get(
  "/getCompanyById/:companyId",
  cacheMiddleware(CACHE_DURATIONS.SHORT),
  CompanyController.getCompanyById
);

// Write operations with cache clearing
CompanyRouter.post(
  "/recordPayments",
  clearCacheMiddleware(["payment_history_", "monthly_sum_","dashboard_data_"]),
  CompanyController.recordPayments
);

CompanyRouter.post(
  "/addCompany",
  apiLimiter,
  clearCacheMiddleware(["companies_list_","dashboard_data_"]),
  CompanyController.addCompany
);

CompanyRouter.put(
  "/updateCompany/:companyId",
  apiLimiter,
  clearCacheMiddleware(["companies_list_", "company_","dashboard_data_"]),
  CompanyController.updateCompany
);

CompanyRouter.delete(
  "/deleteCompany/:companyId",
  apiLimiter,
  clearCacheMiddleware(["companies_list_", "company_", "payment_history_","dashboard_data_"]),
  CompanyController.deleteCompany
);

CompanyRouter.delete(
  "/deletePayment/:paymentId",
  apiLimiter,
  clearCacheMiddleware(["payment_history_", "monthly_sum_","dashboard_data_"]),
  CompanyController.deletePayment
);

CompanyRouter.put(
  "/updatePaymentDetails/:paymentId",
  apiLimiter,
  clearCacheMiddleware(["payment_history_", "monthly_sum_","dashboard_data_"]),
  CompanyController.updatePaymentDetails
);


module.exports = CompanyRouter;
