const { Company, Cars, CompanyCars, sequelize } = require("../models");
const { Op } = require("sequelize");

class CompanyCarsService {
  static async assignCompaniesToCar(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { carId } = req.params;
      const { companies } = req.body;

      // Validate input
      if (
        !carId ||
        !companies ||
        !Array.isArray(companies) ||
        companies.length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid input: Car ID and companies are required",
        });
      }

      // Fetch the car with its current details
      const car = await Cars.findByPk(carId, {
        include: [
          {
            model: SubVendor,
            as: "subVendor",
            attributes: ["sub_vendor_id"],
          },
        ],
        transaction,
      });

      if (!car) {
        return res.status(404).json({
          status: "error",
          message: "Car not found",
        });
      }

      // Validate companies exist and match the car's client type
      const companiesDetails = await FleetCompany.findAll({
        where: {
          fleet_company_id: {
            [Op.in]: companies,
          },
        },
        include: [
          {
            model: SubVendor,
            as: "subVendor",
            attributes: ["sub_vendor_id"],
          },
        ],
        transaction,
      });

      // Validate companies
      if (companiesDetails.length !== companies.length) {
        return res.status(400).json({
          status: "error",
          message: "Some companies do not exist",
        });
      }

      // Validate companies based on car's client type
      const invalidCompanies = companiesDetails.filter((company) => {
        if (car.client_type === "OWNED") {
          // For owned cars, only allow companies without a sub-vendor
          return company.sub_vendor_id !== null;
        } else if (car.client_type === "SUB_VENDOR") {
          // For sub-vendor cars, only allow companies from the same sub-vendor
          return company.sub_vendor_id !== car.subVendor.sub_vendor_id;
        }
        return true;
      });

      if (invalidCompanies.length > 0) {
        return res.status(400).json({
          status: "error",
          message: "Some companies are not valid for this car's client type",
          invalidCompanies: invalidCompanies.map((c) => c.fleet_company_id),
        });
      }

      // Get current active assignments
      const currentAssignments = await CarCompanies.findAll({
        where: {
          car_id: carId,
          status: "active",
        },
        transaction,
      });

      // Determine companies to deactivate
      const currentAssignmentIds = currentAssignments.map(
        (a) => a.fleet_company_id
      );
      const assignmentsToDeactivate = currentAssignmentIds.filter(
        (id) => !companies.includes(id)
      );

      // Deactivate current assignments not in the new list
      if (assignmentsToDeactivate.length > 0) {
        await CarCompanies.update(
          {
            status: "inactive",
            unassignment_date: new Date(),
          },
          {
            where: {
              car_id: carId,
              fleet_company_id: assignmentsToDeactivate,
              status: "active",
            },
            transaction,
          }
        );
      }

      // Create or reactivate assignments
      const assignments = await Promise.all(
        companies.map(async (companyId) => {
          const existingAssignment = await CarCompanies.findOne({
            where: {
              car_id: carId,
              fleet_company_id: companyId,
            },
            transaction,
          });

          if (existingAssignment) {
            // Reactivate if inactive
            if (existingAssignment.status === "inactive") {
              return existingAssignment.update(
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
            return CarCompanies.create(
              {
                car_id: carId,
                fleet_company_id: companyId,
                assignment_date: new Date(),
                status: "active",
              },
              { transaction }
            );
          }
        })
      );

      // Update car's fleet_company_ids
      await car.update({ fleet_company_ids: companies }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        status: "success",
        message: "Companies assigned successfully",
        data: {
          assignments,
          total: assignments.length,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Assign Companies Error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to assign companies",
      });
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
      // Find the car to ensure it exists and get its current fleet_company_ids
      const car = await Cars.findByPk(carId, { transaction });
      if (!car) {
        throw new Error("Car not found");
      }

      // Find the specific company assignment
      const assignment = await CompanyCars.findOne({
        where: {
          car_id: carId,
          fleet_company_id: companyId,
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

      // Update car's fleet_company_ids
      const updatedFleetCompanyIds = car.fleet_company_ids.filter(
        (id) => id !== companyId
      );

      await car.update(
        {
          fleet_company_ids: updatedFleetCompanyIds,
        },
        { transaction }
      );
      await transaction.commit();
      return {
        success: true,
        message: "Company unassigned successfully",
        unassignedCompany: {
          fleet_company_id: companyId,
          unassignment_date: new Date(),
        },
      };
    } catch (error) {
      console.error("Error in unassignCompaniesFromCar:", error);
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new CompanyCarsService();
