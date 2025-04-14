// const Cars = require("../../models/Cars");
const {
  Cars,
  CarPayments,
  sequelize,
  FleetCompany,
  SubVendor,
  CompanyCars,
} = require("../../models/index");
const CarCompanyAssignmentService = require("../../services/CarCompanyAssignmentService");
const CarsService = require("../../services/CarsService");
const { Op } = require("sequelize");

class CarsController {
  static async getAllCars(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "car_id",
        sortOrder = "ASC",
        status = "ACTIVE",
      } = req.query;

      console.log(status);
      const cars = await CarsService.getAllCars(
        parseInt(page),
        parseInt(limit),
        search,
        sortBy,
        sortOrder.toUpperCase(),
        status
      );

      res.json(cars);
    } catch (error) {
      console.error("Error in getAllCars controller:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
      });
    }
  }
  static async getCarById(req, res) {
    try {
      const { id } = req.params;
      const car = await CarsService.getCarById(id);
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }
      res.json(car);
    } catch (error) {
      console.error("Error in getCarById controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async recordAdvanceCarPayment(req, res) {
    // console.log(paymentData);
    try {
      const paymentData = req.body;

      // Validate required fields
      if (
        !paymentData.car_id ||
        !paymentData.amount ||
        !paymentData.payment_type
      ) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields",
        });
      }

      const result = await CarsService.recordCarPaymentExpense(paymentData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error in recordAdvanceCarPayment controller:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
      });
    }
  }

  static async createCarPaymentFromDaybook(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const paymentData = req.body;

      // Check if a payment already exists for this transaction
      const existingPayment = await CarPayments.findOne({
        where: {
          transaction_id: paymentData.transaction_id,
        },
        transaction,
      });

      // If payment already exists, update instead of create
      if (existingPayment) {
        const updatedPayment = await existingPayment.update(
          {
            car_id: paymentData.car_id,
            amount: parseFloat(paymentData.amount),
            payment_type: paymentData.payment_type,
            payment_date: paymentData.transaction_date,
            description: paymentData.description,
            // Add other relevant fields
          },
          { transaction }
        );

        await transaction.commit();
        return res.status(200).json({
          status: "updated",
          data: { payment: updatedPayment },
        });
      }

      // Create new payment
      const newPayment = await CarPayments.create(
        {
          car_id: paymentData.car_id,
          amount: parseFloat(paymentData.amount),
          payment_type: paymentData.payment_type,
          payment_date: paymentData.transaction_date,
          transaction_id: paymentData.transaction_id,
          description: paymentData.description,
          // Add other relevant fields
        },
        { transaction }
      );

      await transaction.commit();

      res.status(201).json({
        status: "created",
        data: { payment: newPayment },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating/updating car payment:", error);
      res.status(500).json({
        error: "Failed to process car payment",
        details: error.message,
      });
    }
  }

  static async getCarsWithTotalPayments(req, res, next) {
    try {
      const cars = await CarsService.getCarsWithTotalPayments();
      res.json({
        success: true,
        data: cars,
        cached: req.cached || false,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCarWithPaymentsDetail(req, res, next) {
    // console.log("getCarWithPaymentsDetail");
    try {
      const { carId } = req.params;
      // console.log(carId);
      const car = await CarsService.getCarWithPaymentsDetail(carId);
      // console.log(car);
      res.json({
        success: true,
        data: car,
        cached: req.cached || false,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addCar(req, res) {
    try {
      // console.log(req.body);
      const car = await CarsService.addCar(req.body);
      res.json(car);
    } catch (error) {
      console.error("Error in addCar controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async deleteCar(req, res) {
    try {
      const { carId } = req.params;
      // console.log(carId);
      await CarsService.deleteCar(carId);
      res.json({ message: "Car deleted successfully" });
    } catch (error) {
      console.error("Error in deleteCar controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateCar(req, res) {
    try {
      const { carId } = req.params;
      const car = await CarsService.updateCar(carId, req.body);
      res.json(car);
    } catch (error) {
      console.error("Error in updateCar controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

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
            as: "client_subVendor",
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

      // console.log(car);

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
            as: "sub_vendor",
            attributes: ["sub_vendor_id"],
          },
        ],
        transaction,
      });

      console.log(companiesDetails);

      // Validate companies
      if (companiesDetails.length !== companies.length) {
        return res.status(400).json({
          status: "error",
          message: "Some companies do not exist",
        });
      }

      const assignedSubVendorIds = new Set(
        companiesDetails
          .map((company) => company.sub_vendor_id)
          .filter((id) => id !== null)
      );

      let updateData = { fleet_company_ids: companies };

      if (assignedSubVendorIds.size === 1) {
        // If all companies belong to the same sub-vendor
        const subVendorId = Array.from(assignedSubVendorIds)[0];
        updateData.client_type = "SUB_VENDOR";
        updateData.sub_vendor_id = subVendorId;
      } else if (assignedSubVendorIds.size === 0) {
        // If no sub-vendor (standalone companies)
        updateData.client_type = "OWNED";
        updateData.sub_vendor_id = null;
      }

      // Update car details
      await car.update(updateData, { transaction });

      // Get current active assignments
      const currentAssignments = await CompanyCars.findAll({
        where: {
          car_id: carId,
          status: "active",
        },
        transaction,
      });

      if (companiesDetails.sub_vendor_id) {
        await Cars.update(
          {
            client_type: "SUB_VENDOR",
          },
          {
            where: {
              car_id: carId,
            },
            transaction,
          }
        );
      }

      // Determine companies to deactivate
      const currentAssignmentIds = currentAssignments.map(
        (a) => a.fleet_company_id
      );
      const assignmentsToDeactivate = currentAssignmentIds.filter(
        (id) => !companies.includes(id)
      );

      // Deactivate current assignments not in the new list
      if (assignmentsToDeactivate.length > 0) {
        await CompanyCars.update(
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
          const existingAssignment = await CompanyCars.findOne({
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
            return CompanyCars.create(
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

  static async getAssignedCompanies(req, res) {
    try {
      const { carId } = req.params;

      if (!carId) {
        return res.status(400).json({
          status: "error",
          message: "Car ID is required",
        });
      }

      const assignedCompanies =
        await CarCompanyAssignmentService.getAssignedCompanies(carId);

      res.status(200).json({
        status: "success",
        companies: assignedCompanies,
        total: assignedCompanies.length,
      });
    } catch (error) {
      console.error("Get Assigned Companies Error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to retrieve assigned companies",
      });
    }
  }

  static async getAvailableCompanies(req, res) {
    try {
      const carId = req.params.carId;

      // Fetch the car to get its current assigned companies
      const car = await Cars.findByPk(carId);

      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }

      // Find companies not already assigned to this car
      const companies = await FleetCompany.findAll({
        where: {
          fleet_company_id: {
            [Op.notIn]: car.fleet_company_ids || [],
          },
        },
        include: [
          {
            model: SubVendor,
            as: "sub_vendor",
            attributes: ["sub_vendor_id"],
          },
        ],
      });

      res.json({
        companies: companies.map((company) => ({
          fleet_company_id: company.fleet_company_id,
          company_name: company.company_name,
          sub_vendor_id: company.sub_vendor
            ? company.sub_vendor.sub_vendor_id
            : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching available companies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async deleteCarPayment(req, res) {
    try {
      const { paymentId } = req.params;
      console.log("done:", paymentId, req.params);
      await CarsService.deleteCarPayments(paymentId);
      res.json({ message: "Car payment deleted successfully" });
    } catch (error) {
      console.error("Error in deleteCarPayment controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateCarPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await CarsService.updateCarPayment(paymentId, req.body);
      res.json(payment);
    } catch (error) {
      console.error("Error in updateCarPayment controller:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async unassignCompaniesFromCar(req, res) {
    try {
      const { carId, companyId } = req.params;

      // Validate input
      if (!carId || !companyId) {
        return res.status(400).json({
          status: "error",
          message: "Invalid input: Car ID and Company ID are required",
        });
      }

      const unassignment =
        await CarCompanyAssignmentService.unassignCompaniesFromCar(
          carId,
          companyId
        );

      res.status(200).json({
        status: "success",
        message: "Company unassigned successfully",
        data: unassignment,
      });
    } catch (error) {
      console.error("Unassign Companies Error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to unassign company",
      });
    }
  }

  static async calculateSalary(req, res) {
    try {
      const { salaryData } = req.body;
      const calculatedData = await CarsService.calculateSalary(salaryData);
      res.json(calculatedData);
    } catch (error) {
      console.error("Error calculating salary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  static async getAdvancePayments(req, res) {
    try {
      const { carId } = req.params;
      const totalAdvance = await CarsService.getAdvancePayments(carId, 30);
      res.json({ total_advance: totalAdvance });
    } catch (error) {
      console.error("Error fetching advance payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getSalaryData(req, res) {
    try {
      const cars = await Cars.findAll({
        where: { status: "ACTIVE" },
        attributes: [
          "car_id",
          "car_name",
          "driver_name",
          "driver_number",
          "owner_name",
          "owner_number",
          "payment_type",
          "per_trip_amount",
          "monthly_package_rate",
          "owner_account_number",
          "ifsc_code",
        ],
      });

      res.json(cars);
    } catch (error) {
      console.error("Error fetching salary data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async saveSalaryCalculation(req, res) {
    try {
      const { salaryData } = req.body;
      const result = await CarsService.saveSalaryCalculation(salaryData);
      res.json(result);
    } catch (error) {
      console.error("Error saving salary calculation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getFleetAssignedToCar(req, res) {
    const response = await CarsService.getFleetAssignedToCar(req.params.carId);
    res.json(response);
  }
}

module.exports = CarsController;
