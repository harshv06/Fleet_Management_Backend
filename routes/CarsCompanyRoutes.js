const router = require("express").Router();
const CarsController = require("../controllers/Cars/CarsControllers");
const {
  AssignedCarsCacheMiddleware,
  AvailableCompaniesToAssing,
  clearCacheMiddleware,
} = require("../middlewares/cacheMiddleware");

// Get assigned companies for a car
// Get assigned companies for a car
router.get(
  "/cars/:carId/companies",
  AssignedCarsCacheMiddleware(600),
  CarsController.getAssignedCompanies
);

// Get available companies for a car
router.get(
  "/cars/:carId/available-companies",
  AvailableCompaniesToAssing(600),
  CarsController.getAvailableCompanies
);

// Assign companies to a car
router.post(
  "/cars/:carId/assign-companies",
  clearCacheMiddleware(["Companies_Available_","Cars_Assigned_To_Company_","dashboard_data_"]),
  CarsController.assignCompaniesToCar
);

module.exports = router;
