const CarCompanyAssignmentService = require("../../services/CarCompanyAssignmentService");
const CarsService = require("../../services/CarsService");

class CarsController {
  static async getAllCars(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "car_id",
        sortOrder = "ASC",
      } = req.query;

      const cars = await CarsService.getAllCars(
        parseInt(page),
        parseInt(limit),
        search,
        sortBy,
        sortOrder.toUpperCase()
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
      console.log(req.body);
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

      const assignments =
        await CarCompanyAssignmentService.assignCompaniesToCar(
          carId,
          companies
        );

      res.status(201).json({
        status: "success",
        message: "Companies assigned successfully",
        data: {
          assignments,
          total: assignments.length,
        },
      });
    } catch (error) {
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
      const { carId } = req.params;

      if (!carId) {
        return res.status(400).json({
          status: "error",
          message: "Car ID is required",
        });
      }

      const availableCompanies =
        await CarCompanyAssignmentService.getAvailableCompanies(carId);

      res.status(200).json({
        status: "success",
        companies: availableCompanies,
        total: availableCompanies.length,
      });
    } catch (error) {
      console.error("Get Available Companies Error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to retrieve available companies",
      });
    }
  }

  static async deleteCarPayment(req, res) {
    try {
      const { paymentId } = req.params;
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
          message: "Invalid input: Car ID and companies are required",
        });
      }

      const unassignments =
        await CarCompanyAssignmentService.unassignCompaniesFromCar(
          carId,
          companyId
        );

      res.status(201).json({
        status: "success",
        message: "Companies unassigned successfully",
        data: {
          unassignments,
          total: unassignments.length,
        },
      });
    } catch (error) {
      console.error("Unassign Companies Error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to unassign companies",
      });
    }
  }
}

module.exports = CarsController;
