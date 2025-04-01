// controllers/SalaryCalculationController.js

const SalaryCalculationService = require("../../services/SalaryCalculations/SalaryCalculationService");

class SalaryCalculationController {
  static async create(req, res) {
    try {
      const result = await SalaryCalculationService.create(req.body);
      // console.log("Here",result);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAll(req, res) {
    // console.log("getAll");
    try {
      const calculations = await SalaryCalculationService.getAll();
      res.json(calculations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async toggleStatus(req, res) {
    try {
      const result = await SalaryCalculationService.toggleStatus(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async downloadExcel(req, res) {
    try {
      const buffer = await SalaryCalculationService.generateExcel(
        req.params.id
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=salary_calculation.xlsx"
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SalaryCalculationController;
