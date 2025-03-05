const {
  Invoice,
  InvoiceItems,
  Company,
  sequelize,
  CompanyStats,
  PaymentHistory,
} = require("../models/index");
const { Op } = require("sequelize");
const TransactionService = require("./TransactionService");

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

      // Validate required fields
      if (!invoice_number || !total_amount || !items?.length) {
        throw new Error("Missing required fields");
      }

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
      // await CompanyStats.updateInvoiceStats(invoice);
      await PaymentHistory.create(
        {
          transaction_type: "EXPENSE_CAR_ADVANCE",
          amount: invoice.grand_total,
          reference_id: invoice.invoice_id,
          transaction_date: invoice.invoice_date,
          description: `Invoice Created for company ${customer_details.name}`,
          transaction_source: "COMPANY",
          reference_source_id: invoice.invoice_id,
          metadata: {
            car_id: invoice.company_id,
            payment_type: "INVOICE",
          },
        },
        { transaction }
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

  static async recordPayment(invoiceId, paymentAmount, paymentMethod = 'cash') {
    const transaction = await sequelize.transaction();
  
    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: Company,
            as: 'invoiceCompany',
          }
        ],
        transaction,
      });
  
      if (!invoice) {
        throw new Error('Invoice not found');
      }
  
      const currentAmountPaid = parseFloat(invoice.amount_paid) || 0;
      const newAmountPaid = currentAmountPaid + parseFloat(paymentAmount);
      const grandTotal = parseFloat(invoice.grand_total);
  
      // Validate payment amount
      if (newAmountPaid > grandTotal) {
        throw new Error('Payment amount exceeds invoice total');
      }
  
      // Calculate remaining amount
      const remainingAmount = grandTotal - newAmountPaid;
  
      // Determine payment status
      let paymentStatus;
      if (newAmountPaid >= grandTotal) {
        paymentStatus = 'fully_paid';
      } else if (newAmountPaid > 0) {
        paymentStatus = 'partially_paid';
      } else {
        paymentStatus = 'unpaid';
      }
  
      // Update invoice
      await invoice.update({
        amount_paid: newAmountPaid,
        remaining_amount: remainingAmount,
        payment_status: paymentStatus,
        status: paymentStatus === 'fully_paid' ? 'paid' : 'pending',
        updated_at: new Date(),
      }, { transaction });
  
      // Record payment transaction
      await PaymentHistory.create({
        transaction_type: 'INCOME_COMPANY_PAYMENT',
        amount: paymentAmount,
        reference_id: invoice.invoice_id,
        transaction_date: new Date(),
        description: `Payment received for invoice ${invoice.invoice_number}`,
        transaction_source: 'COMPANY',
        reference_source_id: invoice.company_id,
        payment_method: paymentMethod,
        metadata: {
          invoice_number: invoice.invoice_number,
          payment_status: paymentStatus,
          amount_paid: paymentAmount,
          remaining_amount: remainingAmount,
        }
      }, { transaction });
  
      // Record transaction
      // await TransactionService.recordTransaction({
      //   transaction_type: TransactionService.TRANSACTION_TYPES.INCOME.COMPANY_PAYMENT,
      //   amount: paymentAmount,
      //   source: 'COMPANY',
      //   sourceId: invoice.company_id,
      //   description: `Partial payment received for invoice ${invoice.invoice_number}`,
      //   metadata: {
      //     invoice_number: invoice.invoice_number,
      //     payment_status: paymentStatus,
      //     amount_paid: paymentAmount,
      //     remaining_amount: remainingAmount,
      //   }
      // }, { transaction });
  
      await transaction.commit();
  
      return {
        status: 'success',
        message: 'Payment recorded successfully',
        data: {
          invoice_number: invoice.invoice_number,
          amount_paid: newAmountPaid,
          remaining_amount: remainingAmount,
          payment_status: paymentStatus,
        }
      };
  
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to record payment: ${error.message}`);
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
      // Validate status
      const validStatuses = ["pending", "paid", "cancelled", "overdue"];
      if (!validStatuses.includes(newStatus)) {
        throw new Error("Invalid status");
      }

      // Find invoice with company details
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: Company,
            as: "invoiceCompany",
            attributes: ["company_id", "company_name"],
          },
          {
            model: InvoiceItems,
            as: "invoiceItems",
          },
        ],
        transaction,
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const oldStatus = invoice.status;
      const amount = parseFloat(invoice.grand_total);

      // Prevent status change if already in that status
      if (oldStatus === newStatus) {
        throw new Error(`Invoice is already ${newStatus}`);
      }

      // Update invoice status
      await invoice.update(
        {
          status: newStatus,
          updated_at: new Date(),
        },
        { transaction }
      );

      // Handle status-specific logic and transaction recording
      let transactionType;
      let description;

      switch (newStatus) {
        case "paid":
          transactionType =
            TransactionService.TRANSACTION_TYPES.INCOME.COMPANY_PAYMENT;
          description = `Invoice ${invoice.invoice_number} marked as paid`;
          console.log(transactionType);

          // await TransactionService.recordTransaction({
          //   type: "INCOME_COMPANY_PAYMENT",
          //   amount: invoice.grand_total,
          //   referenceId: invoice.invoice_id,
          //   referenceType: "PAYMENT",
          //   description: `Payment received from company ${invoice.company_id}`,
          //   metadata: {
          //     invoiceNumber: invoice.invoice_number,
          //     status: invoice.status,
          //   },
          // });
    
          // Record income transaction
          await TransactionService.recordTransaction({
            transaction_type: transactionType,
            amount: amount,
            source: "COMPANY",
            sourceId: invoice.company_id,
            description,
            metadata: {
              invoice_number: invoice.invoice_number,
              old_status: oldStatus,
              new_status: newStatus,
            },
          });
          console.log("Recorded income transaction");
          break;

        case "cancelled":
          if (oldStatus === "paid") {
            // Record reversal transaction
            await TransactionService.recordTransaction({
              transaction_type: "INCOME_REVERSAL",
              amount: -amount,
              source: "COMPANY",
              sourceId: invoice.company_id,
              description: `Cancelled paid invoice ${invoice.invoice_number}`,
              metadata: {
                invoice_number: invoice.invoice_number,
                old_status: oldStatus,
                new_status: newStatus,
              },
            });
          }
          break;
      }

      // Log status change in payment history
      // await PaymentHistory.create(
      //   invoice.company_id,
      //   "INVOICE_STATUS_CHANGE",
      //   newStatus === "paid" ? amount : 0,
      //   {
      //     referenceId: invoice.invoice_id,
      //     description: `Invoice ${invoice.invoice_number} status changed from ${oldStatus} to ${newStatus}`,
      //     metadata: {
      //       invoice_number: invoice.invoice_number,
      //       old_status: oldStatus,
      //       new_status: newStatus,
      //       company_name: invoice.invoiceCompany?.company_name,
      //     },
      //   }
      // );
      console.log("Recorded payment history");

      await transaction.commit();

      return {
        status: "success",
        message: `Invoice status updated to ${newStatus} successfully`,
        data: await Invoice.findByPk(invoiceId, {
          include: [
            {
              model: Company,
              as: "invoiceCompany",
            },
            {
              model: InvoiceItems,
              as: "invoiceItems",
            },
          ],
        }),
      };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to update invoice status: ${error.message}`);
    }
  }

  // Get Invoice by ID
  static async getInvoiceById(invoiceId) {
    try {
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: InvoiceItems,
            as: "invoiceItems",
            attributes: [
              "description",
              "hsn_code",
              "quantity",
              "rate",
              "amount",
            ],
          },
          {
            model: Company,
            as: "invoiceCompany",
            attributes: ["company_name", "address", "gst_number"],
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

  static async generateInvoicePDF(invoiceId) {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      // PDF Generation Logic
      const PDFDocument = require("pdfkit");
      const fs = require("fs");
      const path = require("path");

      const doc = new PDFDocument({ size: "A4" });
      const outputPath = path.join(
        __dirname,
        `../invoices/Invoice_${invoice.invoice_number}.pdf`
      );

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Invoice Header
      doc.fontSize(20).text("TAX INVOICE", { align: "center" });
      doc.moveDown();

      // Company Details
      doc
        .fontSize(10)
        .text(`Invoice Number: ${invoice.invoice_number}`, { align: "left" })
        .text(`Date: ${invoice.invoice_date.toLocaleDateString()}`, {
          align: "left",
        })
        .moveDown();

      // Billing Details
      doc
        .text(`Bill To: ${invoice.company.company_name}`)
        .text(`Address: ${invoice.company.address}`)
        .text(`GST: ${invoice.company.gst_number}`)
        .moveDown();

      // Invoice Items
      doc.table({
        headers: ["Description", "HSN", "Quantity", "Rate", "Amount"],
        rows: invoice.items.map((item) => [
          item.description,
          item.hsn_code,
          item.quantity,
          item.rate,
          item.amount,
        ]),
      });

      // Totals
      doc
        .moveDown()
        .text(`Total Amount: ₹${invoice.total_amount}`)
        .text(`SGST: ₹${invoice.sgst_amount}`)
        .text(`CGST: ₹${invoice.cgst_amount}`)
        .text(`Grand Total: ₹${invoice.grand_total}`);

      doc.end();

      return outputPath;
    } catch (error) {
      throw error;
    }
  }

  // Delete Invoice
  static async deleteInvoice(invoiceId) {
    const transaction = await sequelize.transaction();

    try {
      // Find invoice with all related data
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: InvoiceItems,
            as: "invoiceItems",
          },
          {
            model: Company,
            as: "invoiceCompany",
          },
        ],
        transaction,
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Prevent deletion of paid invoices
      if (invoice.status === "paid") {
        throw new Error("Paid invoices cannot be deleted");
      }

      // Delete associated invoice items
      await InvoiceItems.destroy({
        where: { invoice_id: invoiceId },
        transaction,
      });

      // Record deletion transaction
      await TransactionTrackingService.recordTransaction({
        type: "INVOICE_DELETED",
        amount: 0,
        source: "COMPANY",
        sourceId: invoice.company_id,
        description: `Invoice ${invoice.invoice_number} deleted`,
        metadata: {
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          company_name: invoice.invoiceCompany?.company_name,
          deletion_date: new Date(),
        },
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

module.exports = InvoiceService;
