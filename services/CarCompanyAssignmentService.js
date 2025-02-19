const { Company, Cars, CompanyCars, sequelize } = require("../models");
const { Op } = require("sequelize");

class CompanyCarsService {
  async assignCompaniesToCar(carId, companyIds) {
    const transaction = await sequelize.transaction();

    try {
      // Validate car exists
      const car = await Cars.findByPk(carId, { transaction });
      if (!car) {
        throw new Error("Car not found");
      }

      // Validate companies exist
      const existingCompanies = await Company.findAll({
        where: {
          company_id: {
            [Op.in]: companyIds,
          },
        },
        as: "Company",
        transaction,
      });

      if (existingCompanies.length !== companyIds.length) {
        throw new Error("Some companies do not exist");
      }

      // Remove existing assignments
      await CompanyCars.destroy({
        where: { car_id: carId },
        transaction,
      });

      // Create new assignments
      const assignments = companyIds.map((companyId) => ({
        car_id: carId,
        company_id: companyId,
        assignment_date: new Date(),
        status: "active",
      }));

      const createdAssignments = await CompanyCars.bulkCreate(assignments, {
        transaction,
      });

      await transaction.commit();
      return createdAssignments;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getAssignedCompanies(carId) {
    try {
      const assignedCompanies = await CompanyCars.findAll({
        where: {
          car_id: carId,
          status: "active",
        },
        include: [
          {
            model: Company,
            as: "companyCarsCompany",
            attributes: [
              "company_id",
              "company_name",
              "gst_number",
              "email",
              "phone",
              "status",
            ],
          },
        ],
      });

      return assignedCompanies.map((assignment) => ({
        company_id: assignment.company_id,
        company_name: assignment.companyCarsCompany.company_name,
        registration_number: assignment.companyCarsCompany.registration_number,
        email: assignment.companyCarsCompany.email,
        phone: assignment.companyCarsCompany.phone,
        status: assignment.status,
        assignment_date: assignment.assignment_date,
      }));
    } catch (error) {
      throw error;
    }
  }

  async getAvailableCompanies(carId) {
    try {
      // Get companies not already assigned to this car
      const assignedCompanyIds = await CompanyCars.findAll({
        where: { car_id: carId },
        as: "Company",
        attributes: ["company_id"],
      });

      const excludedIds = assignedCompanyIds.map((a) => a.company_id);

      const availableCompanies = await Company.findAll({
        where: {
          company_id: {
            [Op.notIn]: excludedIds.length > 0 ? excludedIds : [0],
          },
          status: "active",
        },
        attributes: [
          "company_id",
          "company_name",
          "gst_number",
          "email",
          "phone",
          "status",
        ],
      });
      console.log("Companies:", availableCompanies);
      return availableCompanies;
    } catch (error) {
      throw error;
    }
  }

  async unassignCompaniesFromCar(carId, companyId) {
    const transaction = await sequelize.transaction();
    try {
      const assignment = await CompanyCars.findOne({
        where: {
          car_id: carId,
          company_id: companyId,
          status: "active",
        },
        transaction,
      });

      if (!assignment) {
        throw new Error("Company assignment not found");
      }

      // Update the status to inactive instead of deleting
      await assignment.update(
        {
          status: "inactive",
          unassignment_date: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      return { success: true, message: "Company unassigned successfully" };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new CompanyCarsService();
