const FleetRouter = require("express").Router();
const e = require("express");
const FleetCompanyController = require("../controllers/Cars/FleetCompanyController");
const SubVendorController = require("../controllers/Cars/SubVendorController");
const { validateToken } = require("../middlewares/authMiddleware");
const CarsController = require("../controllers/Cars/CarsControllers");

FleetRouter.get(
  "/v1/getAllSubVendors",
//   validateToken,
  SubVendorController.getAllSubVendors
);

FleetRouter.get("/v1/cars/:carId/companies-details",CarsController.getFleetAssignedToCar)

FleetRouter.get(
  "/v1/getAllCompanies",
//   validateToken,
  FleetCompanyController.getCompaniesBySubVendor
);

FleetRouter.post(
  "/v1/createCompany",
//   validateToken,
  FleetCompanyController.createCompany
);

FleetRouter.post(
  "/v1/createSubVendor",
//   validateToken,
  SubVendorController.createSubVendor
);

module.exports = FleetRouter;
