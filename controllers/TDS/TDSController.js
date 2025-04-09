const TDSService = require('../../services/TDS/TDS_service');

class TDSController {
  // Get TDS Report for Current Month
  static async getTDSReport(req, res) {
    try {
      const { year, month } = req.query;
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      const report = await TDSService.getTDSReport(currentYear, currentMonth);
      res.json(report);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching TDS report', 
        error: error.message 
      });
    }
  }

  // Deposit TDS
  static async depositTDS(req, res) {
    try {
      const depositData = req.body;
      const result = await TDSService.depositTDS(depositData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error depositing TDS', 
        error: error.message 
      });
    }
  }

  // Get TDS Sections
  static async getTDSSections(req, res) {
    try {
      const sections = await TDSService.getTDSSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching TDS sections', 
        error: error.message 
      });
    }
  }

  // Get TDS Summary
  static async getTDSSummary(req, res) {
    try {
      const { year, month } = req.query;
      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      const report = await TDSService.getTDSReport(currentYear, currentMonth);
      res.json(report.summary);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching TDS summary', 
        error: error.message 
      });
    }
  }

  // Get TDS Records
  static async getTDSRecords(req, res) {
    try {
      const filters = req.query;
      const records = await TDSService.getTDSRecords(filters);
      res.json(records);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching TDS records', 
        error: error.message 
      });
    }
  }
}

module.exports = TDSController;