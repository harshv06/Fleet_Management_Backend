// controllers/ReportController.js
const ReportService = require("../../services/DayBookService/CategoryReportService");

class ReportController {
  static async generateTransactionReport(req, res) {
    // console.log(req.body);
    try {
      const { category, startDate, endDate } = req.body;
      const buffer = await ReportService.generateTransactionReport(
        category,
        new Date(startDate),
        new Date(endDate)
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=transaction_report.xlsx"
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ReportController;
