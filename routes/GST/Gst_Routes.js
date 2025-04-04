const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Invoice, PurchaseInvoice, Company } = require("../../models/index");

// GST Report Route
router.get("/gst-report/current-Month", async (req, res) => {
  try {
    const { month, year } = req.query;

    // Validate input
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    // Create start and end dates for the specified month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch Sales Invoices with GST
    const salesInvoices = await Invoice.findAll({
      where: {
        invoice_date: {
          [Op.between]: [startDate, endDate],
        },
        customer_gst: {
          [Op.not]: null, // Only invoices with GST numbers
        },
      },
      include: [
        {
          model: Company,
          as: "invoiceCompany",
          where: {
            gst_number: {
              [Op.not]: null, // Only companies with GST numbers
            },
          },
        },
      ],
    });

    // Fetch Purchase Invoices with GST
    const purchaseInvoices = await PurchaseInvoice.findAll({
      where: {
        invoice_date: {
          [Op.between]: [startDate, endDate],
        },
        vendor_gst: {
          [Op.not]: null, // Only invoices with GST numbers
        },
      },
      include: [
        {
          model: Company,
          as: "vendor",
          where: {
            gst_number: {
              [Op.not]: null, // Only companies with GST numbers
            },
          },
        },
      ],
    });

    // Calculate GST Summary
    const gstSummary = {
      sales: {
        total_amount: 0,
        total_sgst: 0,
        total_cgst: 0,
        total_invoices: salesInvoices.length,
      },
      purchases: {
        total_amount: 0,
        total_sgst: 0,
        total_cgst: 0,
        total_invoices: purchaseInvoices.length,
      },
      net_gst: {
        payable: 0,
        receivable: 0,
      },
    };

    // Aggregate Sales GST
    salesInvoices.forEach((invoice) => {
      // Ensure numeric conversion
      gstSummary.sales.total_amount += Number(invoice.total_amount) || 0;
      gstSummary.sales.total_sgst += Number(invoice.sgst_amount) || 0;
      gstSummary.sales.total_cgst += Number(invoice.cgst_amount) || 0;
    });

    // Aggregate Purchase GST
    purchaseInvoices.forEach((invoice) => {
      // Ensure numeric conversion
      gstSummary.purchases.total_amount += Number(invoice.total_amount) || 0;
      gstSummary.purchases.total_sgst += Number(invoice.total_gst/2) || 0;
      gstSummary.purchases.total_cgst += Number(invoice.total_gst/2) || 0;
    });

    console.log("Purchase Invoices:", purchaseInvoices);
    // Calculate Net GST
    // gstSummary.net_gst.payable = Math.max(
    //   gstSummary.sales.total_sgst +
    //     gstSummary.sales.total_cgst -
    //     (gstSummary.purchases.total_sgst + gstSummary.purchases.total_cgst),
    //   0
    // );
    // gstSummary.net_gst.receivable = Math.max(
    //   gstSummary.purchases.total_sgst +
    //     gstSummary.purchases.total_cgst -
    //     (gstSummary.sales.total_sgst + gstSummary.sales.total_cgst),
    //   0
    // );

    gstSummary.net_gst.payable = Math.max(
        gstSummary.sales.total_sgst +
          gstSummary.sales.total_cgst,
        0
      );
      gstSummary.net_gst.receivable = Math.max(
        gstSummary.purchases.total_sgst +
          gstSummary.purchases.total_cgst,
        0
      );

    // Round to 2 decimal places
    Object.keys(gstSummary.sales).forEach((key) => {
      if (typeof gstSummary.sales[key] === "number") {
        gstSummary.sales[key] = Number(gstSummary.sales[key].toFixed(2));
      }
    });

    Object.keys(gstSummary.purchases).forEach((key) => {
      if (typeof gstSummary.purchases[key] === "number") {
        gstSummary.purchases[key] = Number(
          gstSummary.purchases[key].toFixed(2)
        );
      }
    });

    Object.keys(gstSummary.net_gst).forEach((key) => {
      if (typeof gstSummary.net_gst[key] === "number") {
        gstSummary.net_gst[key] = Number(gstSummary.net_gst[key].toFixed(2));
      }
    });

    console.log("GST Summary:", gstSummary);

    res.json({
      summary: gstSummary,
      sales_invoices: salesInvoices,
      purchase_invoices: purchaseInvoices,
    });
  } catch (error) {
    console.error("GST Report Error:", error);
    res.status(500).json({ error: "Failed to generate GST report" });
  }
});

module.exports = router;
