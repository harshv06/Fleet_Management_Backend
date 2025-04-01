const router = require("express").Router();
const InvoiceController = require("../controllers/Invoice/InvoiceController");
const { validateToken } = require("../middlewares/authMiddleware");
const { clearCacheMiddleware } = require("../middlewares/cacheMiddleware");

// Routes with authentication and validation
router.post(
  "/invoices",
  validateToken,
  clearCacheMiddleware(["dashboard_data_"]),
  InvoiceController.createInvoice
);

router.post(
  "/invoices/:invoiceId/payment",
  validateToken,
  clearCacheMiddleware(["dashboard_data_"]),
  InvoiceController.recordPayment
);

router.get("/invoices", validateToken, InvoiceController.getAllInvoices);

router.put(
  "/invoices/:invoiceId/status",
  validateToken,
  clearCacheMiddleware(["dashboard_data_"]),
  InvoiceController.updateInvoiceStatus
);

router.get(
  "/invoices/:invoiceId",
  validateToken,
  InvoiceController.getInvoiceById
);

router.get(
  "/:invoiceId/download",
  validateToken,
  InvoiceController.downloadInvoicePDF
);

router.delete(
  "/invoices/:invoiceId",
  validateToken,
  clearCacheMiddleware(["dashboard_data_"]),
  InvoiceController.deleteInvoice
);

module.exports = router;
