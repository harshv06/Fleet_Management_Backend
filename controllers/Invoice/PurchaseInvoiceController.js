// controllers/PurchaseInvoiceController.js
const PurchaseInvoiceService = require("../../services/PurchaseInvoiceService");

const { PurchaseTransaction } = require("../../models/index");
const {sequelize,Op} = require("../../models/index");

class PurchaseInvoiceController {
  async createPurchaseInvoice(req, res) {
    try {
      const purchaseInvoice =
        await PurchaseInvoiceService.createPurchaseInvoice(req.body);
      res.status(201).json({
        status: "success",
        data: purchaseInvoice,
      });
    } catch (error) {
      console.error("Create purchase invoice error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create purchase invoice",
        error: error.message,
      });
    }
  }
  async getAllPurchaseInvoices(req, res) {
    try {
      const invoices = await PurchaseInvoiceService.getAllPurchaseInvoices();
      res.json({
        status: "success",
        data: invoices,
      });
    } catch (error) {
      console.error("Get purchase invoices error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch purchase invoices",
        error: error.message,
      });
    }
  }

  async getPurchaseInvoiceById(req, res) {
    try {
      const invoice = await PurchaseInvoiceService.getPurchaseInvoiceById(
        req.params.id
      );
      if (!invoice) {
        return res.status(404).json({
          status: "error",
          message: "Purchase invoice not found",
        });
      }
      res.json({
        status: "success",
        data: invoice,
      });
    } catch (error) {
      console.error("Get purchase invoice error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch purchase invoice",
        error: error.message,
      });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          status: "error",
          message: "Status is required",
        });
      }

      const validStatuses = ["pending", "paid", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid status value. Must be one of: pending, paid, cancelled",
        });
      }

      const updatedInvoice =
        await PurchaseInvoiceService.updatePurchaseInvoiceStatus(id, status);

      if (!updatedInvoice) {
        return res.status(404).json({
          status: "error",
          message: "Invoice not found",
        });
      }

      return res.json({
        status: "success",
        message: "Invoice status updated successfully",
        data: updatedInvoice,
      });
    } catch (error) {
      console.error("Update status error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update invoice status",
        error: error.message,
      });
    }
  }

  async getPurchaseDistribution(req, res) {
    try {
      const { startDate, endDate } = req.query;
      // console.log("Dates:",startDate, endDate);
      const distribution = await PurchaseTransaction.findAll({
        attributes: [
          "vendor_name",
          [sequelize.fn("SUM", sequelize.col("amount")), "total_amount"],
          [
            sequelize.fn("COUNT", sequelize.col("transaction_id")),
            "transaction_count",
          ],
        ],
        where: {
          transaction_date: {
            [Op.between]: [new Date(startDate), new Date(endDate)],
          },
          status: "paid",
        },
        group: ["vendor_name"],
        order: [[sequelize.fn("SUM", sequelize.col("amount")), "DESC"]],
        raw: true,
      });

      // Calculate percentages
      const total = distribution.reduce(
        (sum, item) => sum + parseFloat(item.total_amount),
        0
      );

      const formattedDistribution = distribution.map((item) => ({
        vendor_name: item.vendor_name,
        total_amount: parseFloat(item.total_amount),
        transaction_count: parseInt(item.transaction_count),
        percentage: ((parseFloat(item.total_amount) / total) * 100).toFixed(2),
      }));

      res.json({
        status: "success",
        data: formattedDistribution,
      });
    } catch (error) {
      console.error("Error fetching purchase distribution:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch purchase distribution",
        error: error.message,
      });
    }
  }
}

module.exports = new PurchaseInvoiceController();
