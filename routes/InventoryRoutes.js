const InventoryRouter = require("express").Router();
const InventoryController = require("../controllers/Inventory/InventoryController");
const DashboardController = require("../controllers/DahboardController"); // Corrected typo
const {
  validateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const {
  DashboardDataCacheMiddleware,
} = require("../middlewares/cacheMiddleware");
const PurchaseInvoiceController = require("../controllers/Invoice/PurchaseInvoiceController");

const PurchaseTransactionService = require("../services/PurchaseInvoiceService");

const { PERMISSIONS } = require("../utils/Permissions");

// Consolidated Dashboard Routes
InventoryRouter.get(
  "/dashboard",
  validateToken,
  checkPermission(PERMISSIONS.DASHBOARD.VIEW),
  DashboardDataCacheMiddleware(300),
  DashboardController.getDashboardData.bind(DashboardController)
);

InventoryRouter.get(
  "/purchase-distribution",
  PurchaseInvoiceController.getPurchaseDistribution
);

InventoryRouter.get(
  "/dashboard/filtered-data", // New endpoint for filtered data
  validateToken,
  checkPermission(PERMISSIONS.DASHBOARD.VIEW),
  DashboardController.getFilteredData.bind(DashboardController)
);
InventoryRouter.get(
  "/dashboard/filtered-revenue",
  validateToken,
  checkPermission(PERMISSIONS.DASHBOARD.VIEW),
  DashboardDataCacheMiddleware(300),
  DashboardController.getFilteredRevenue.bind(DashboardController)
);

// Revenue Routes
// InventoryRouter.get(
//   "/revenue",
//   validateToken,
//   checkPermission(PERMISSIONS.REVENUE_VIEW),
//   DashboardController.getRevenueData
// );

InventoryRouter.get(
  "/revenue/monthly",
  validateToken,
  checkPermission(PERMISSIONS.REVENUE_VIEW),
  DashboardController.getMonthlyRevenue
);

InventoryRouter.get(
  "/revenue/yearly",
  validateToken,
  checkPermission(PERMISSIONS.REVENUE_VIEW),
  DashboardController.getYearlyRevenue
);

// Cars Routes
InventoryRouter.get(
  "/cars/count",
  validateToken,
  checkPermission(PERMISSIONS.CARS_VIEW),
  DashboardController.getTotalCarsCount
);

InventoryRouter.get(
  "/cars/stats",
  validateToken,
  checkPermission(PERMISSIONS.CARS_VIEW),
  DashboardController.getCarStats
);

// Expense Routes
InventoryRouter.get(
  "/expenses",
  validateToken,
  checkPermission(PERMISSIONS.EXPENSES_VIEW),
  DashboardController.getTotalExpenses
);

InventoryRouter.get(
  "/expenses/monthly",
  validateToken,
  checkPermission(PERMISSIONS.EXPENSES_VIEW),
  DashboardController.getMonthlyExpenses
);

InventoryRouter.get(
  "/expenses/breakdown",
  validateToken,
  checkPermission(PERMISSIONS.EXPENSES_VIEW),
  DashboardController.getExpenseBreakdown
);

InventoryRouter.get(
  "/expenses/car",
  validateToken,
  checkPermission(PERMISSIONS.EXPENSES_VIEW),
  DashboardController.getCarExpenses
);

// Invoice Routes
InventoryRouter.get(
  "/invoices/stats",
  validateToken,
  checkPermission(PERMISSIONS.INVOICES_VIEW),
  DashboardController.getInvoiceStats
);

InventoryRouter.get(
  "/invoices/status-breakdown",
  validateToken,
  checkPermission(PERMISSIONS.INVOICES_VIEW),
  DashboardController.getInvoiceStatusBreakdown
);

// Additional Inventory-Specific Routes
InventoryRouter.get(
  "/revenue-trends",
  validateToken,
  checkPermission(PERMISSIONS.REVENUE_VIEW),
  InventoryController.getRevenueTrends
);

InventoryRouter.get(
  "/expense-trends",
  validateToken,
  checkPermission(PERMISSIONS.EXPENSES_VIEW),
  InventoryController.getExpenseTrends
);

InventoryRouter.get(
  "/invoice-stats",
  validateToken,
  checkPermission(PERMISSIONS.INVOICES_VIEW),
  InventoryController.getInvoiceStatistics
);

InventoryRouter.get(
  "/company-revenue",
  validateToken,
  checkPermission(PERMISSIONS.REVENUE_VIEW),
  InventoryController.getCompanyRevenueBreakdown
);

InventoryRouter.get(
  "/payment-methods",
  validateToken,
  checkPermission(PERMISSIONS.REVENUE_VIEW),
  InventoryController.getPaymentMethodBreakdown
);

InventoryRouter.get(
  "/cash-flow",
  validateToken,
  checkPermission(PERMISSIONS.FINANCIAL_VIEW),
  InventoryController.getCashFlowTrend
);

InventoryRouter.get(
  "/kpi",
  validateToken,
  checkPermission(PERMISSIONS.FINANCIAL_VIEW),
  InventoryController.getFinancialKPIs
);

module.exports = InventoryRouter;
