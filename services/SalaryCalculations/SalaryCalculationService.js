// services/SalaryCalculationService.js
const { Op } = require("sequelize");
// const {sequelize}=require("sequelize")
const {
  SalaryCalculationsHistory,
  CarSalaryRecord,
  Cars,
  sequelize,
} = require("../../models/index");
const XLSX = require("xlsx");

class SalaryCalculationService {
  /**
   * Create a new salary calculation record
   * @param {Object} calculationData - The salary calculation data
   * @returns {Promise<Object>} Created salary calculation record
   */
  static async create(calculationData) {
    // console.log(calculationData);
    const transaction = await sequelize.transaction();
    try {
      // Validate the data
      if (
        !calculationData.calculation_data ||
        !Array.isArray(calculationData.calculation_data)
      ) {
        console.error("Invalid calculation data");
        throw new Error("Invalid calculation data");
      }

      // console.log(calculationData.calculation_data);
      // Calculate total amount
      const totalAmount = calculationData.calculation_data.reduce(
        (sum, car) => sum + parseFloat(car.net_amount || 0),
        0
      );

      const salaryRecord = await SalaryCalculationsHistory.create(
        {
          start_date: calculationData.start_date,
          end_date: calculationData.end_date,
          total_amount: totalAmount,
          payment_status: "UNPAID",
          calculation_data: calculationData.calculation_data,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );

      // Create individual salary records for each car
      const carSalaryRecords = await Promise.all(
        calculationData.calculation_data.map((carData) =>
          this.createCarSalaryRecord(carData, salaryRecord.id, transaction)
        )
      );

      await transaction.commit();
      // console.log("Salary calculation created successfully");
      return {
        status: "success",
        data: {
          id: salaryRecord.id,
          totalAmount,
          carRecords: carSalaryRecords,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating salary calculation:", error);
      throw error;
    }
  }
  static async createCarSalaryRecord(carData, calculationId, transaction) {
    return await CarSalaryRecord.create(
      {
        calculation_id: calculationId,
        car_id: carData.car_id,
        gross_amount: carData.gross_amount,
        net_amount: carData.net_amount,
        deductions: {
          tds: carData.tds_amount,
          holiday_penalty: carData.holiday_penalty_amount,
          other_penalty: carData.other_penalty_amount,
          advance: carData.advance_amount,
        },
        remarks: carData.remarks,
      },
      { transaction }
    );
  }

  /**
   * Create individual car salary record
   * @param {Object} carData - Individual car salary data
   * @param {number} calculationId - Parent calculation ID
   * @param {Transaction} transaction - Sequelize transaction
   * @returns {Promise<Object>} Created car salary record
   * //=
   */
  /**
   * Get all salary calculations with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} List of salary calculations
   */
  static async getAll(filters = {}) {
    try {
      const where = {};

      // Apply date range filter if provided
      if (filters.startDate && filters.endDate) {
        where.created_at = {
          [Op.between]: [filters.startDate, filters.endDate],
        };
      }

      // Apply payment status filter if provided
      if (filters.paymentStatus) {
        where.payment_status = filters.paymentStatus;
      }
      const calculations = await SalaryCalculationsHistory.findAll({
        where,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: CarSalaryRecord,
            as: "carSalaryRecords",
            include: [
              {
                model: Cars,
                as: "car",
                attributes: ["car_name", "driver_name"],
              },
            ],
          },
        ],
      });

      // console.log("Here", calculations);
      return calculations;
    } catch (error) {
      console.error("Error fetching salary calculations:", error);
      throw error;
    }
  }

  /**
   * Toggle payment status of a salary calculation
   * @param {number} id - Calculation ID
   * @returns {Promise<Object>} Updated salary calculation
   */
  static async toggleStatus(id) {
    const transaction = await sequelize.transaction();
    try {
      const calculation = await SalaryCalculationsHistory.findByPk(id, {
        transaction,
      });
      if (!calculation) {
        throw new Error("Salary calculation not found");
      }

      const newStatus =
        calculation.payment_status === "PAID" ? "UNPAID" : "PAID";
      await calculation.update(
        {
          payment_status: newStatus,
          updated_at: new Date(),
        },
        { transaction }
      );

      // Update related records if needed
      if (newStatus === "PAID") {
        await this.handlePaidStatus(calculation, transaction);
      }

      await transaction.commit();
      return calculation;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Handle additional logic when salary is marked as paid
   * @param {Object} calculation - Salary calculation record
   * @param {Transaction} transaction - Sequelize transaction
   */
  static async handlePaidStatus(calculation, transaction) {
    // Add any additional logic needed when salary is marked as paid
    // For example: Create payment records, update accounting entries, etc.
  }

  /**
   * Generate Excel file for a salary calculation
   * @param {number} id - Calculation ID
   * @returns {Promise<Buffer>} Excel file buffer
   */
  static async generateExcel(id) {
    try {
      const calculation = await SalaryCalculationsHistory.findByPk(id, {
        include: [
          {
            model: CarSalaryRecord,
            as: "carSalaryRecords",
            include: [
              {
                model: Cars,
                as: "car",
                attributes: ["car_name", "driver_name"],
              },
            ],
          },
        ],
      });

      if (!calculation) {
        throw new Error("Salary calculation not found");
      }

      const workbook = XLSX.utils.book_new();

      // Detailed worksheet
      const detailsData = calculation.calculation_data.map((car) => ({
        "Car ID": car.car_id,
        "Car Name": car.car_name,
        "Driver Name": car.driver_name,
        "Driver Number": car.driver_number,
        "Owner Name": car.owner_name,
        "Owner Number": car.owner_number,
        "Account Number": car.owner_account_number,
        "IFSC Code": car.ifsc_code,
        "Payment Type": car.payment_type,
        Rate:
          car.payment_type === "TRIP_BASED"
            ? car.per_trip_amount
            : car.monthly_package_rate,
        "Trips/Days":
          car.payment_type === "TRIP_BASED"
            ? car.total_trips
            : car.working_days,
        "Gross Amount": car.gross_amount.toFixed(2),
        "TDS (%)": car.tds_percentage,
        "TDS Amount": car.tds_amount.toFixed(2),
        "Holiday Penalty (%)": car.holiday_penalty_percentage,
        "Holiday Penalty": car.holiday_penalty_amount.toFixed(2),
        "Other Penalty (%)": car.other_penalty_percentage,
        "Other Penalty": car.other_penalty_amount.toFixed(2),
        "Advance Amount": car.advance_amount,
        "Total Deductions": car.total_deductions.toFixed(2),
        "Net Amount": car.net_amount.toFixed(2),
        Remarks: car.remarks,
      }));

      const ws = XLSX.utils.json_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(workbook, ws, "Salary Details");

      // Summary worksheet
      const summaryData = [
        {
          "Calculation ID": calculation.id,
          Period: `${calculation.start_date.toLocaleDateString()} - ${calculation.end_date.toLocaleDateString()}`,
          "Total Cars": calculation.calculation_data.length,
          "Total Gross Amount": calculation.calculation_data
            .reduce((sum, car) => sum + car.gross_amount, 0)
            .toFixed(2),
          "Total Net Amount": calculation.total_amount,
          "Payment Status": calculation.payment_status,
          "Created At": calculation.created_at,
          "Updated At": calculation.updated_at,
        },
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return buffer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get salary calculation details by ID
   * @param {number} id - Calculation ID
   * @returns {Promise<Object>} Salary calculation details
   */
  static async getById(id) {
    try {
      const calculation = await SalaryCalculationsHistory.findByPk(id, {
        include: [
          {
            model: CarSalaryRecord,
            include: [
              {
                model: Cars,
                attributes: ["car_name", "driver_name"],
              },
            ],
          },
        ],
      });

      if (!calculation) {
        throw new Error("Salary calculation not found");
      }

      return calculation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a salary calculation
   * @param {number} id - Calculation ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      const calculation = await SalaryCalculationsHistory.findByPk(id, {
        transaction,
      });
      if (!calculation) {
        throw new Error("Salary calculation not found");
      }

      // Delete related records
      await CarSalaryRecord.destroy({
        where: { calculation_id: id },
        transaction,
      });

      // Delete the main record
      await calculation.destroy({ transaction });

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get salary statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Salary statistics
   */
  static async getStatistics(filters = {}) {
    try {
      const where = {};

      if (filters.startDate && filters.endDate) {
        where.created_at = {
          [Op.between]: [filters.startDate, filters.endDate],
        };
      }

      const statistics = await SalaryCalculationsHistory.findAll({
        where,
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "total_calculations"],
          [
            sequelize.fn("SUM", sequelize.col("total_amount")),
            "total_amount_paid",
          ],
          [
            sequelize.fn("AVG", sequelize.col("total_amount")),
            "average_amount",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal("CASE WHEN payment_status = 'PAID' THEN 1 END")
            ),
            "paid_count",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN payment_status = 'UNPAID' THEN 1 END"
              )
            ),
            "unpaid_count",
          ],
        ],
      });

      return statistics[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SalaryCalculationService;
