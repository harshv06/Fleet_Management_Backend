// services/CompanyProfileService.js
const { CompanyProfile } = require("../../models/index");

class CompanyProfileService {
  static async getCompanyProfile() {
    try {
      // Assuming we only have one company profile
      const profile = await CompanyProfile.findOne({
        where: { is_active: true },
      });
      return profile;
    } catch (error) {
      throw error;
    }
  }

  static async updateCompanyProfile(profileData) {
    try {
      const [profile] = await CompanyProfile.upsert(profileData, {
        returning: true,
      });
      return profile;
    } catch (error) {
      throw error;
    }
  }

  static async updateLogo(profileId, logoUrl) {
    try {
      const profile = await CompanyProfile.findByPk(profileId);
      if (!profile) {
        throw new Error("Company profile not found");
      }
      profile.logo_url = logoUrl;
      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CompanyProfileService;
