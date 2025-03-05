const express = require("express");
const router = express.Router();
const CarsController = require("../controllers/Cars/CarsControllers");
// const { cacheMiddleware } = require('../utils/cache');
const rateLimit = require("express-rate-limit");
const {
  cacheMiddleware,
  clearCacheMiddleware,
  carCacheMiddleware,
  paymentCacheMiddleware,
  AdvancepaymentCacheMiddleware,
} = require("../middlewares/cacheMiddleware");
const { validateToken, checkPermission } = require("../middlewares/authMiddleware");
const { PERMISSIONS } = require("../utils/Permissions");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

const CACHE_DURATIONS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 600, // 10 minutes
  LONG: 1800, // 30 minutes
};

router.get(
  "/cars",
  apiLimiter,
  validateToken,
  checkPermission(PERMISSIONS.CARS.VIEW),
  carCacheMiddleware(CACHE_DURATIONS.SHORT),
  CarsController.getAllCars
);
router.get(
  "/cars/:id",
  apiLimiter,
  carCacheMiddleware(CACHE_DURATIONS.SHORT),
  CarsController.getCarById
);
router.post(
  "/cars/AddCar",
  apiLimiter,
  clearCacheMiddleware(["cars_list_", "dashboard_data_"]),
  CarsController.addCar
);

router.delete(
  "/cars/delete/:carId",
  apiLimiter,
  clearCacheMiddleware([
    "cars_list_",
    "car_",
    "car_payments_",
    "dashboard_data_",
  ]),
  CarsController.deleteCar
);

router.put(
  "/cars/update/:carId",
  apiLimiter,
  clearCacheMiddleware(["cars_list_", "car_", "dashboard_data_"]),
  CarsController.updateCar
);

router.post(
  "/cars/payments",
  apiLimiter,
  clearCacheMiddleware([
    "car_payments_",
    "cars_list_",
    "payment_history_",
    "dashboard_data_",
  ]),
  CarsController.recordAdvanceCarPayment
);

router.get(
  "/cars/payments/detail/:carId",
  apiLimiter,
  AdvancepaymentCacheMiddleware(CACHE_DURATIONS.SHORT),
  CarsController.getCarWithPaymentsDetail
);

router.get(
  "/cars/payments/total",
  apiLimiter,
  cacheMiddleware(CACHE_DURATIONS.SHORT),
  CarsController.getCarsWithTotalPayments
);

router.delete(
  "/cars/payments/delete/:paymentId",
  apiLimiter,
  clearCacheMiddleware([
    "car_payments_",
    "cars_list_",
    "payment_history_",
    "dashboard_data_",
  ]),
  CarsController.deleteCarPayment
);

router.put(
  "/cars/payments/update/:paymentId",
  apiLimiter,
  clearCacheMiddleware([
    "car_payments_",
    "cars_list_",
    "payment_history_",
    "dashboard_data_",
  ]),
  CarsController.updateCarPayment
);

module.exports = router;
