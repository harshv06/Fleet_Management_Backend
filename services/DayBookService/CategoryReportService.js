// services/ReportService.js
const { DayBook, Company } = require("../../models/index");
const { Op } = require("sequelize");
const XLSX = require("xlsx");

class ReportService {
  static async generateTransactionReport(category, startDate, endDate) {
    try {
      // Get all transactions for the given category and date range
      const transactions = await DayBook.findAll({
        where: {
          category,
          transaction_date: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: Company,
            as: "company",
            attributes: ["company_name"],
          },
        ],
        order: [["transaction_date", "ASC"]],
      });
      console.log("Here", transactions);
      // Group transactions by company
      const companyTransactions = transactions.reduce((acc, transaction) => {
        const companyName = transaction.company.company_name;
        if (!acc[companyName]) {
          acc[companyName] = {
            credits: 0,
            debits: 0,
            transactions: [],
          };
        }

        const amount = parseFloat(transaction.amount);
        if (transaction.transaction_type === "CREDIT") {
          acc[companyName].credits += amount;
        } else {
          acc[companyName].debits += amount;
        }

        acc[companyName].transactions.push(transaction);
        return acc;
      }, {});

      // Generate Excel workbook
      const workbook = XLSX.utils.book_new();

      // Create summary worksheet
      const summaryData = Object.entries(companyTransactions).map(
        ([company, data]) => ({
          Company: company,
          "Total Credits": data.credits.toFixed(2),
          "Total Debits": data.debits.toFixed(2),
          "Net Amount": (data.credits - data.debits).toFixed(2),
        })
      );

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

      // Create detailed worksheets for each company
      Object.entries(companyTransactions).forEach(([company, data]) => {
        const detailData = data.transactions.map((t) => ({
          Date: new Date(t.transaction_date).toLocaleDateString(),
          Description: t.description,
          Type: t.transaction_type,
          Amount: parseFloat(t.amount).toFixed(2),
          Reference: t.reference_number || "-",
          Notes: t.notes || "-",
        }));

        const ws = XLSX.utils.json_to_sheet(detailData);
        XLSX.utils.book_append_sheet(workbook, ws, company.substring(0, 31));
      });

      return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    } catch (error) {
      console.error("Error generating transaction report:", error);
      throw error;
    }
  }
}

module.exports = ReportService;
