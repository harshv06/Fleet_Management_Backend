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
        transaction,
      });

      if (existingCompanies.length !== companyIds.length) {
        throw new Error("Some companies do not exist");
      }

      // Get current active assignments
      const currentAssignments = await CompanyCars.findAll({
        where: {
          car_id: carId,
          status: "active",
        },
        transaction,
      });

      // Deactivate current assignments that are not in the new list
      const currentAssignmentIds = currentAssignments.map((a) => a.company_id);
      const assignmentsToDeactivate = currentAssignmentIds.filter(
        (id) => !companyIds.includes(id)
      );

      if (assignmentsToDeactivate.length > 0) {
        await CompanyCars.update(
          {
            status: "inactive",
            unassignment_date: new Date(),
          },
          {
            where: {
              car_id: carId,
              company_id: assignmentsToDeactivate,
              status: "active",
            },
            transaction,
          }
        );
      }

      // Create new assignments or reactivate inactive ones
      const assignments = await Promise.all(
        companyIds.map(async (companyId) => {
          const existingAssignment = await CompanyCars.findOne({
            where: { car_id: carId, company_id: companyId },
            transaction,
          });

          if (existingAssignment) {
            // Reactivate if inactive
            if (existingAssignment.status === "inactive") {
              await existingAssignment.update(
                {
                  status: "active",
                  assignment_date: new Date(),
                  unassignment_date: null,
                },
                { transaction }
              );
            }
            return existingAssignment;
          } else {
            // Create new assignment
            return CompanyCars.create(
              {
                car_id: carId,
                company_id: companyId,
                assignment_date: new Date(),
                status: "active",
              },
              { transaction }
            );
          }
        })
      );

      await transaction.commit();
      return assignments;
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
          status: "active", // Only get active assignments
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
        gst_number: assignment.companyCarsCompany.gst_number,
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
      // Get currently active assignments for this car
      const activeAssignments = await CompanyCars.findAll({
        where: {
          car_id: carId,
          status: "active",
        },
        attributes: ["company_id"],
      });

      const assignedCompanyIds = activeAssignments.map((a) => a.company_id);

      // Get all companies that are not currently actively assigned
      const availableCompanies = await Company.findAll({
        where: {
          company_id: {
            [Op.notIn]:
              assignedCompanyIds.length > 0 ? assignedCompanyIds : [0],
          },
          status: {
            [Op.in]: ["active", "inactive"], // Get both active and inactive companies
          },
        },
        attributes: [
          "company_id",
          "company_name",
          "gst_number",
          "email",
          "phone",
          "status",
        ],
        order: [
          ["status", "ASC"],
          ["company_name", "ASC"],
        ],
      });

      return availableCompanies;
    } catch (error) {
      console.error("Error in getAvailableCompanies:", error);
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
        throw new Error("Active company assignment not found");
      }

      // Update the status to inactive
      await assignment.update(
        {
          status: "inactive",
          unassignment_date: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      return {
        success: true,
        message: "Company unassigned successfully",
        unassignedCompany: {
          company_id: companyId,
          unassignment_date: new Date(),
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new CompanyCarsService();
