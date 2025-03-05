const InvoiceService = require("../../services/InvoiceService");
class InvoiceController {
  static async createInvoice(req, res) {
    try {
      // Create invoice
      const result = await InvoiceService.createInvoice(req.body);

      res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create invoice",
        error: error.message,
      });
    }
  }

  static async recordPayment(req, res) {
    try {
      const { invoiceId } = req.params;
      const { amount, payment_method } = req.body;

      // Validate input
      if (!amount || amount <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid payment amount'
        });
      }

      const result = await InvoiceService.recordPayment(
        invoiceId,
        amount,
        payment_method
      );

      // Fetch updated invoice with all related data
      const updatedInvoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: Company,
            as: 'invoiceCompany',
          },
          {
            model: InvoiceItems,
            as: 'invoiceItems'
          },
          {
            model: PaymentHistory,
            as: 'payments',
            attributes: ['amount', 'transaction_date', 'payment_method']
          }
        ]
      });

      res.status(200).json({
        status: 'success',
        message: 'Payment recorded successfully',
        data: updatedInvoice
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
  // Get All Invoices
  static async getAllInvoices(req, res) {
    try {
      // Extract and parse query parameters with defaults
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 10);
      const companyId = req.query.companyId
        ? parseInt(req.query.companyId)
        : null;
      const status = req.query.status;

      // Get invoices
      const result = await InvoiceService.getAllInvoices({
        page,
        limit,
        companyId,
        status,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoices",
        error: error.message,
      });
    }
  }


  // Update Invoice Status
  static async updateInvoiceStatus(req, res) {
    try {
      const { invoiceId } = req.params;
      const { status } = req.body;

      // Update invoice status
      const invoice = await InvoiceService.updateInvoiceStatus(
        invoiceId,
        status
      );

      res.json({
        success: true,
        message: "Invoice status updated successfully",
        data: invoice,
      });
    } catch (error) {
      console.error("Update invoice status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update invoice status",
        error: error.message,
      });
    }
  }

  // Get Invoice by ID
  static async getInvoiceById(req, res) {
    try {
      const { invoiceId } = req.params;

      // Get invoice
      const invoice = await InvoiceService.getInvoiceById(invoiceId);

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoice",
        error: error.message,
      });
    }
  }

  static async getInvoiceDetails(req, res) {
    try {
      const { invoiceId } = req.params;
      const invoice = await InvoiceService.getInvoiceById(invoiceId);
      
      res.status(200).json({
        status: 'success',
        data: { invoice }
      });
    } catch (error) {
      res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
  }

  static async downloadInvoicePDF(req, res) {
    try {
      const { invoiceId } = req.params;
      const pdfPath = await InvoiceService.generateInvoicePDF(invoiceId);
      
      res.download(pdfPath, `Invoice_${invoiceId}.pdf`, (err) => {
        if (err) {
          res.status(500).json({
            status: 'error',
            message: 'Could not download the file'
          });
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Delete Invoice
  static async deleteInvoice(req, res) {
    try {
      const { invoiceId } = req.params;

      // Validate input
      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          message: "Invoice ID is required",
        });
      }

      // Perform deletion
      const deletedInvoice = await InvoiceService.deleteInvoice(invoiceId);

      res.json({
        success: true,
        message: "Invoice deleted successfully",
        data: deletedInvoice,
      });
    } catch (error) {
      console.error("Delete invoice error:", error);

      // Handle specific error types
      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          success: false,
          message: error.errors[0].message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to delete invoice",
        error: error.message,
      });
    }
  }
}

module.exports = InvoiceController;
