const PaymentRouter = require("express").Router();
const PaymentController = require("../controllers/PaymentController");
const rateLimit = require("express-rate-limit");
const { AdvancepaymentCacheMiddleware } = require("../middlewares/cacheMiddleware");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

PaymentRouter.get(
  "/cars/:carId/advance-payments",
  AdvancepaymentCacheMiddleware(600),
  apiLimiter,
  PaymentController.getAdvancePayment
);

module.exports = PaymentRouter;
