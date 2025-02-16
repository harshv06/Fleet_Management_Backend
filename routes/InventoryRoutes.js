const InventoryRouter = require("express").Router();
const InventoryController = require("../controllers/Inventory/InventoryController");
const { validateToken, checkPermission } = require("../middlewares/authMiddleware");
const {
  DashboardDataCacheMiddleware,
} = require("../middlewares/cacheMiddleware");
const { PERMISSIONS } = require("../utils/Permissions");
// InventoryRouter.get("/getCompanyStats", CompanyController.getCompanyStats);

// InventoryRouter.get("/stats", async (req, res) => {
//   try {
//     const companyStats = await CompanyStats.findOne({ where: { id: 1 } });
//     res.json({
//       total_expense: companyStats.total_expense || 0,
//       total_revenue: companyStats.total_revenue || 0,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch stats" });
//   }
// });

InventoryRouter.get('/dashboard', InventoryController.getFinancialDashboard);
InventoryRouter.get('/revenue-trends', InventoryController.getRevenueTrends);
InventoryRouter.get('/expense-trends', InventoryController.getExpenseTrends);
InventoryRouter.get('/invoice-stats', InventoryController.getInvoiceStatistics);
InventoryRouter.get('/company-revenue', InventoryController.getCompanyRevenueBreakdown);
InventoryRouter.get('/payment-methods', InventoryController.getPaymentMethodBreakdown);
InventoryRouter.get('/cash-flow', InventoryController.getCashFlowTrend);
InventoryRouter.get('/kpi', InventoryController.getFinancialKPIs);

// Export Financial Data
// router.get(
//   "/export-financial-data",
//   validateToken,
//   checkPermission([PERMISSIONS.DASHBOARD.VIEW]),
//   InventoryController.exportFinancialData
// );

module.exports = InventoryRouter;
