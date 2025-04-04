// routes/companyProfile.js
const express = require("express");
const router = express.Router();
const CompanyProfileController = require("../../controllers/CompanyProfile/CompanyProfileController");
// const { authenticateToken } = require("../middleware/auth");
// const upload = require("../middleware/fileUpload"); // Assuming you have file upload middleware

router.get(
  "/company-profile/get",
  CompanyProfileController.getCompanyProfile
);

router.put(
  "/company-profile/create",
  CompanyProfileController.updateCompanyProfile
);

router.put(
  "/company-profile/:profileId/logo",
  CompanyProfileController.updateLogo
);

module.exports = router;