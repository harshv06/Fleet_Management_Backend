// routes/purchaseInvoiceRoutes.js
const express = require("express");
const router = express.Router();
const {DasboardCacheMiddleware, clearCacheMiddleware, DashboardDataCacheMiddleware} = require("../middlewares/cacheMiddleware");
const PurchaseInvoiceController = require("../controllers/Invoice/PurchaseInvoiceController");

router.post("/", clearCacheMiddleware(["dashboard_data_"]),PurchaseInvoiceController.createPurchaseInvoice);
router.get("/PurchaseInvoices",PurchaseInvoiceController.getAllPurchaseInvoices);
router.get("/:id", PurchaseInvoiceController.getPurchaseInvoiceById);
router.patch("/purchase-invoices/:id/status", PurchaseInvoiceController.updateStatus);

module.exports = router;
