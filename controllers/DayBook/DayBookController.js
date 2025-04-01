// controllers/DayBookController.js
const DayBookService = require("../../services/DayBookService/DayBookService");

class DayBookController {
  static async addTransaction(req, res) {
    try {
      console.log(req.body);
      const transaction = await DayBookService.addTransaction(req.body);
      res.json({ status: "success", data: transaction });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async getTransactions(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        ...otherFilters 
      } = req.query;
  
      const result = await DayBookService.getTransactions({
        page: parseInt(page),
        limit: parseInt(limit),
        ...otherFilters
      });
  
      res.json({ 
        status: "success", 
        data: result.transactions,
        pagination: result.pagination 
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async getTransaction(req, res) {
    try {
      const { transactionId: id } = req.params;
      const transaction = await DayBookService.getTransaction(id);
      res.json({ status: "success", data: transaction });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async getMonthlyReport(req, res) {
    try {
      const { year, month } = req.params;
      const report = await DayBookService.getMonthlyReport(
        parseInt(year),
        parseInt(month)
      );
      res.json({ status: "success", data: report });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async updateTransaction(req, res) {
    try {
      const { transactionId: id } = req.params;
      const updatedTransaction = await DayBookService.updateTransaction(
        id,
        req.body
      );
      res.json({
        status: "success",
        data: updatedTransaction,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  static async deleteTransaction(req, res) {
    try {
      const { transactionId: id } = req.params;
      // console.log("ID:",id);
      const data=await DayBookService.deleteTransaction(id);
      res.json({
        status: "success",
        message: "Transaction deleted successfully",
        data:data
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  static async setInitialOpeningBalance(req, res) {
    try {
      const { amount, date, notes } = req.body;
      const openingBalance = await DayBookService.setInitialOpeningBalance(
        parseFloat(amount),
        new Date(date),
        notes
      );
      res.json({
        status: "success",
        data: openingBalance,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  static async closeMonth(req, res) {
    try {
      const { year, month } = req.params;
      await DayBookService.closeMonth(parseInt(year), parseInt(month));
      res.json({
        status: "success",
        message: "Month closed successfully",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  static async getOpeningBalance(req, res) {
    try {
      const openingBalance = await DayBookService.getOpeningBalance();
      res.json({
        status: "success",
        data: openingBalance,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  static async exportToExcel(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        type: req.query.type,
        category: req.query.category,
      };

      const buffer = await DayBookService.exportToExcel(filters);

      // Set headers for file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=daybook_export.xlsx"
      );

      res.send(buffer);
    } catch (error) {
      console.error("Error in exportToExcel:", error);
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
}

module.exports = DayBookController;
