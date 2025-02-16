const { PaymentHistory, Invoice, Company, Payment } = require("../../models");
const InventoryService = require("../../services/InventoryService");
const sequelize = require("sequelize");
const { Op } = require("sequelize");

class InventoryController {
  static async getCompanyStats(req, res) {
    console.log(req.user);
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    try {
      const stats = await InventoryService.getCompanyStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting company stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getFinancialDashboard(req, res) {
    try {
      const { timeframe = "monthly" } = req.query;
      const dashboardData = await InventoryService.getFinancialDashboard(
        timeframe
      );
      res.json(dashboardData);
    } catch (error) {
      console.error("Financial Dashboard Error:", error);
      res.status(500).json({
        message: "Failed to retrieve financial dashboard",
        error: error.message,
      });
    }
  }

  // Get Revenue Trends
  static async getRevenueTrends(req, res) {
    try {
      const { timeframe = "monthly" } = req.query;
      const revenueTrends = await InventoryService.getRevenueTrends(timeframe);
      res.json(revenueTrends);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve revenue trends",
        error: error.message,
      });
    }
  }

  // Get Expense Trends
  static async getExpenseTrends(req, res) {
    try {
      const { timeframe = "monthly" } = req.query;
      const expenseTrends = await InventoryService.getExpenseTrends(timeframe);
      res.json(expenseTrends);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve expense trends",
        error: error.message,
      });
    }
  }

  // Get Invoice Statistics
  static async getInvoiceStatistics(req, res) {
    try {
      const invoiceStats = await InventoryService.getInvoiceStatistics();
      res.json(invoiceStats);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve invoice statistics",
        error: error.message,
      });
    }
  }

  // Get Company Revenue Breakdown
  static async getCompanyRevenueBreakdown(req, res) {
    try {
      const companyRevenue =
        await InventoryService.getCompanyRevenueBreakdown();
      res.json(companyRevenue);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve company revenue breakdown",
        error: error.message,
      });
    }
  }

  // Get Payment Method Breakdown
  static async getPaymentMethodBreakdown(req, res) {
    try {
      const paymentMethods = await InventoryService.getPaymentMethodBreakdown();
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve payment method breakdown",
        error: error.message,
      });
    }
  }

  // Get Cash Flow Trend
  static async getCashFlowTrend(req, res) {
    try {
      const { timeframe = "monthly" } = req.query;
      const cashFlow = await FinancialService.getCashFlowTrend(timeframe);
      res.json(cashFlow);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve cash flow trend",
        error: error.message,
      });
    }
  }

  // Get Financial KPIs
  static async getFinancialKPIs(req, res) {
    try {
      const kpis = {
        totalRevenue: await InventoryService.getTotalRevenue(),
        profitMargin: await InventoryService.calculateProfitMargin(),
      };
      res.json(kpis);
    } catch (error) {
      res.status(500).json({
        message: "Failed to retrieve financial KPIs",
        error: error.message,
      });
    }
  }
}

module.exports = InventoryController;
