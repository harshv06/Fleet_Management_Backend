const router = require("express").Router();
const InvoiceController = require("../controllers/Invoice/InvoiceController");
const { validateToken } = require("../middlewares/authMiddleware");

// Routes with authentication and validation
router.post("/invoices", validateToken, InvoiceController.createInvoice);

router.get("/invoices", validateToken, InvoiceController.getAllInvoices);

router.put(
  "/invoices/:invoiceId/status",
  validateToken,
  InvoiceController.updateInvoiceStatus
);

router.get(
  "/invoices/:invoiceId",
  validateToken,
  InvoiceController.getInvoiceById
);

router.delete(
  "/invoices/:invoiceId",
  validateToken,
  InvoiceController.deleteInvoice
);

module.exports = router;
