const {
  Invoice,
  InvoiceItems,
  Company,
  sequelize,
  CompanyStats,
  PaymentHistory,
} = require("../models/index");
const { Op } = require("sequelize");

class InvoiceService {
  static async createInvoice(invoiceData) {
    const transaction = await sequelize.transaction();

    try {
      // Destructure invoice data
      const {
        invoice_number,
        company_id,
        total_amount,
        sgst_amount,
        cgst_amount,
        grand_total,
        status,
        customer_details,
        items,
      } = invoiceData;

      console.log(customer_details);
      const data = await JSON.parse(customer_details);
      console.log(data);
      // Find or create company if not exists
      let company;
      if (!company_id) {
        company = await Company.create(
          {
            company_name: customer_details.name,
            address: customer_details.address,
            gst_number: customer_details.gst,
          },
          { transaction }
        );
      }

      // Create Invoice
      const invoice = await Invoice.create(
        {
          invoice_number,
          company_id: company_id || company.company_id,
          total_amount,
          sgst_amount,
          cgst_amount,
          grand_total,
          status: status || "pending",
          invoice_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          customer_name: data.name,
        },
        { transaction }
      );

      // Create Invoice Items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.invoice_id,
        description: item.description,
        hsn_code: item.hsn,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      await InvoiceItems.bulkCreate(invoiceItems, { transaction });

      // Update company stats
      await CompanyStats.updateInvoiceStats(invoice);
      await PaymentHistory.logTransaction(
        invoiceData.company_id,
        "INVOICE",
        invoice.grand_total,
        {
          currentTotalRevenue: CompanyStats?.total_revenue || 0,
          currentTotalExpenses: CompanyStats?.total_expenses || 0,
          referenceId: invoice.invoice_id,
          description: `Invoice ${invoice.invoice_number} created`,
          metadata: {
            invoiceNumber: invoice.invoice_number,
            status: invoice.status,
          },
        }
      );

      await transaction.commit();

      return {
        invoice: {
          ...invoice.toJSON(),
          items: invoiceItems,
        },
      };
    } catch (error) {
      // Rollback transaction
      await transaction.rollback();
      throw error;
    }
  }

  static async getAllInvoices(options = {}) {
    try {
      // Ensure numeric conversion and default values
      const page = Math.max(1, parseInt(options.page) || 1);
      const limit = Math.max(1, parseInt(options.limit) || 10);

      // Build where condition
      const whereCondition = {};
      if (options.companyId) {
        whereCondition.company_id = parseInt(options.companyId);
      }
      if (options.status) {
        whereCondition.status = options.status;
      }

      // Find and count invoices
      const { count, rows: invoices } = await Invoice.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Company,
            as: "invoiceCompany",
            attributes: ["company_id", "company_name", "gst_number"],
          },
          {
            model: InvoiceItems,
            as: "invoiceItems",
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset: (page - 1) * limit,
      });

      return {
        invoices,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit: limit,
        },
      };
    } catch (error) {
      console.error("Get invoices error:", error);
      throw error;
    }
  }

  // Update Invoice Status
  static async updateInvoiceStatus(invoiceId, newStatus) {
    const transaction = await sequelize.transaction();

    try {
      // Find the invoice
      const invoice = await Invoice.findByPk(invoiceId, { transaction });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Store old status
      const oldStatus = invoice.status;

      // Update invoice status
      await invoice.update({ status: newStatus }, { transaction });

      // Update company stats
      await CompanyStats.updateInvoiceStats({
        ...invoice.toJSON(),
        status: newStatus,
      });

      // Log status change
      await PaymentHistory.logTransaction(
        invoice.company_id,
        "INVOICE_STATUS_CHANGE",
        invoice.grand_total,
        {
          referenceId: invoice.invoice_id,
          description: `Invoice status changed from ${oldStatus} to ${newStatus}`,
          metadata: {
            oldStatus,
            newStatus,
          },
        }
      );

      // Commit transaction
      await transaction.commit();

      return invoice;
    } catch (error) {
      // Rollback transaction
      await transaction.rollback();
      console.error("Invoice status update error:", error);
      throw error;
    }
  }
  // Get Invoice by ID
  static async getInvoiceById(invoiceId) {
    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: Company,
            as: "company",
            attributes: ["company_name", "gst_number"],
          },
          {
            model: InvoiceItem,
            as: "items",
          },
        ],
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  // Delete Invoice
  static async deleteInvoice(invoiceId) {
    const transaction = await sequelize.transaction();

    try {
      // Find the invoice
      const invoice = await Invoice.findByPk(invoiceId, { transaction });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Update company stats before deletion
      await CompanyStats.handleInvoiceDeletion({
        company_id: invoice.company_id,
        invoice_id: invoice.invoice_id,
        grand_total: invoice.grand_total,
        status: invoice.status
      });

      // Delete associated invoice items
      await InvoiceItems.destroy({
        where: { invoice_id: invoiceId },
        transaction
      });

      // Delete the invoice
      await invoice.destroy({ transaction });

      // Log deletion
      await PaymentHistory.logTransaction(
        invoice.company_id,
        'INVOICE_DELETION',
        invoice.grand_total,
        {
          referenceId: invoice.invoice_id,
          description: `Invoice ${invoice.invoice_number} deleted`,
          metadata: {
            invoiceStatus: invoice.status
          }
        }
      );

      // Commit transaction
      await transaction.commit();

      return invoice;
    } catch (error) {
      // Rollback transaction
      await transaction.rollback();
      console.error('Invoice deletion error:', error);
      throw error;
    }
  }
}

module.exports = InvoiceService;
