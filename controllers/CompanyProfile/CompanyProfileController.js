// controllers/CompanyProfileController.js
const CompanyProfileService = require("../../services/CompanyProfile/CompanyProfile");

class CompanyProfileController {
  static async getCompanyProfile(req, res) {
    try {
      const profile = await CompanyProfileService.getCompanyProfile();
      res.json({
        status: "success",
        data: profile,
      });
    } catch (error) {
      console.error("Get company profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch company profile",
        error: error.message,
      });
    }
  }

  static async updateCompanyProfile(req, res) {
    try {
      const profile = await CompanyProfileService.updateCompanyProfile(
        req.body
      );
      res.json({
        status: "success",
        message: "Company profile updated successfully",
        data: profile,
      });
    } catch (error) {
      console.error("Update company profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update company profile",
        error: error.message,
      });
    }
  }

  static async updateLogo(req, res) {
    try {
      // Assuming you're using some file upload middleware
      const logoUrl = req.file.path;
      const profile = await CompanyProfileService.updateLogo(
        req.params.profileId,
        logoUrl
      );
      res.json({
        status: "success",
        message: "Company logo updated successfully",
        data: profile,
      });
    } catch (error) {
      console.error("Update company logo error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update company logo",
        error: error.message,
      });
    }
  }
}

module.exports = CompanyProfileController;
