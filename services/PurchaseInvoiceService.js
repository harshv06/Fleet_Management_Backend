// services/PurchaseInvoiceService.js
const {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  Company,
  sequelize,
  CompanyStats,
  PurchaseTransaction,
} = require("../models");
const { Op } = require("sequelize");

class PurchaseInvoiceService {
  async createPurchaseInvoice(data) {
    const transaction = await sequelize.transaction();

    try {
      // Check if vendor exists or create new
      // Only check if vendor exists, don't create new one
      let vendor = null;
      if (data.vendor_name) {
        vendor = await Company.findOne({
          where: { company_name: data.vendor_name },
          transaction,
        });
      }

      // Create purchase invoice
      const purchaseInvoice = await PurchaseInvoice.create(
        {
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          vendor_name: data.vendor_name,
          vendor_gst: data.vendor_gst,
          vendor_id: vendor?.company_id,
          subtotal: data.subtotal,
          total_gst: data.total_gst,
          total_amount: data.total_amount,
          status: "pending",
        },
        { transaction }
      );

      // Create invoice items
      const items = data.items.map((item) => ({
        ...item,
        purchase_invoice_id: purchaseInvoice.purchase_invoice_id,
      }));

      await PurchaseInvoiceItem.bulkCreate(items, { transaction });

      await transaction.commit();
      return purchaseInvoice;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  async getAllPurchaseInvoices(page, limit, status) {
    try {
      const offset = (page - 1) * limit;

      const whereClause = status ? { status: status } : {};

      const { count, rows } = await PurchaseInvoice.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: PurchaseInvoiceItem,
            as: "items",
          },
        ],
        order: [["created_at", "DESC"]],
        offset,
        limit,
      });

      return {
        invoices: rows,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      };
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      throw error;
    }
  }

  async getPurchaseInvoiceById(id) {
    return PurchaseInvoice.findByPk(id, {
      include: [
        {
          model: PurchaseInvoiceItem,
          as: "items",
        },
      ],
    });
  }

  async getPurchaseInvoiceById(id) {
    return PurchaseInvoice.findByPk(id, {
      include: [
        {
          model: PurchaseInvoiceItem,
          as: "items",
        },
      ],
    });
  }

  // services/PurchaseInvoiceService.js
  async updatePurchaseInvoiceStatus(id, status) {
    const transaction = await sequelize.transaction();

    try {
      // Find invoice with its previous status and vendor details
      const invoice = await PurchaseInvoice.findByPk(id, {
        include: [
          {
            model: PurchaseInvoiceItem,
            as: "items",
          },
          {
            model: Company,
            as: "vendor",
            attributes: ["company_name", "company_id"], // Update attribute names to match your Company model
          },
        ],
        transaction,
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const previousStatus = invoice.status;
      const invoiceAmount = parseFloat(invoice.total_amount);

      // Validate status
      const validStatuses = ["pending", "paid", "cancelled"];
      if (!validStatuses.includes(status)) {
        throw new Error("Invalid status value");
      }

      // Get or create company stats
      let companyStats = await CompanyStats.findOne({
        where: { company_id: invoice.vendor_id || 1 },
        transaction,
      });

      if (!companyStats) {
        companyStats = await CompanyStats.create(
          {
            company_id: invoice.vendor_id || 1,
            total_expenses: 0,
          },
          { transaction }
        );
      }

      // Handle expense updates based on status changes
      if (status === "paid" && previousStatus !== "paid") {
        // Add to total expenses when status changes to paid
        await companyStats.update(
          {
            total_expenses: sequelize.literal(
              `total_expenses + ${invoiceAmount}`
            ),
            updated_at: new Date(),
          },
          { transaction }
        );

        // console.log("Invoice amount:", invoiceAmount);
        // Record the purchase transaction
        await PurchaseTransaction.create(
          {
            purchase_invoice_id: id,
            vendor_id: invoice.vendor_id,
            vendor_name: invoice.vendor?.company_name || "Unknown Vendor", // Updated to use company_name
            amount: invoiceAmount,
            transaction_type: "PURCHASE",
            transaction_date: new Date(),
            status: "paid",
            category: invoice.items[0]?.category || "Uncategorized",
            payment_method: invoice.payment_method || "Not Specified",
            notes: `Purchase invoice ${invoice.invoice_number} marked as paid`,
          },
          { transaction }
        );
      } else if (previousStatus === "paid" && status !== "paid") {
        // Subtract from total expenses when changing from paid to another status
        await companyStats.update(
          {
            total_expenses: sequelize.literal(
              `GREATEST(0, total_expenses - ${invoiceAmount})`
            ),
            updated_at: new Date(),
          },
          { transaction }
        );
        // Delete existing purchase transaction
        const deleteResult = await PurchaseTransaction.destroy({
          where: {
            purchase_invoice_id: id,
            transaction_type: "PURCHASE",
          },
          transaction,
        });

        // console.log(`Deleted ${deleteResult} purchase transactions`);

        if (deleteResult === 0) {
          console.warn(
            `No purchase transactions found to delete for invoice ${id}`
          );
        }
        // Record reversal transaction
        await PurchaseTransaction.create(
          {
            purchase_invoice_id: id,
            vendor_id: invoice.vendor_id,
            vendor_name: invoice.vendor?.company_name || "Unknown Vendor", // Updated to use company_name
            amount: -invoiceAmount,
            transaction_type: "PURCHASE_REVERSAL",
            transaction_date: new Date(),
            status: status,
            category: invoice.items[0]?.category || "Uncategorized",
            payment_method: invoice.payment_method || "Not Specified",
            notes: `Purchase invoice ${invoice.invoice_number} status changed from paid to ${status}`,
          },
          { transaction }
        );
      }

      // Update invoice status
      await invoice.update(
        {
          status,
          updated_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      // Fetch the updated invoice with items
      const updatedInvoice = await PurchaseInvoice.findByPk(id, {
        include: [
          {
            model: PurchaseInvoiceItem,
            as: "items",
          },
          {
            model: Company,
            as: "vendor",
            attributes: ["company_name", "company_id"],
          },
        ],
      });

      return updatedInvoice;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Add a method to get purchase distribution
  async getPurchaseDistribution(startDate, endDate) {
    try {
      const distribution = await PurchaseTransaction.getVendorDistribution(
        startDate,
        endDate
      );

      // Calculate percentages and format response
      const total = distribution.reduce(
        (sum, item) => sum + parseFloat(item.total_amount),
        0
      );

      return distribution.map((item) => ({
        vendor_name: item.vendor_name,
        total_amount: parseFloat(item.total_amount),
        transaction_count: parseInt(item.transaction_count),
        percentage: ((parseFloat(item.total_amount) / total) * 100).toFixed(2),
      }));
    } catch (error) {
      throw error;
    }
  }

  async deletePurchaseInvoice(invoiceId) {
    const transaction = await sequelize.transaction();
    console.log("deleteInvoice:", invoiceId);
    try {
      // Find invoice with all related data
      const invoice = await PurchaseInvoice.findByPk(invoiceId, {
        include: [
          {
            model: PurchaseInvoiceItem,
            as: "items",
          },
          {
            model: Company,
            as: "vendor",
          },
        ],
        transaction,
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Prevent deletion of paid invoices
      // if (invoice.status === "paid") {
      //   throw new Error("Paid invoices cannot be deleted");
      // }

      // Delete associated invoice items
      await PurchaseInvoiceItem.destroy({
        where: { purchase_invoice_id: invoiceId },
        transaction,
      });

      await PurchaseTransaction.destroy({
        where: { purchase_invoice_id: invoiceId },
        transaction,
      });

      // Delete the invoice
      await invoice.destroy({ transaction });

      await transaction.commit();

      return {
        status: "success",
        message: "Invoice deleted successfully",
        data: {
          invoice_number: invoice.invoice_number,
          company_name: invoice.invoiceCompany?.company_name,
          deleted_at: new Date(),
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }
}

module.exports = new PurchaseInvoiceService();
