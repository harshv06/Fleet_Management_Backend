const { QueryTypes } = require("sequelize");
const sequelize = require("../config/dbConfig");
const {
  Cars,
  CarPayments,
  CompanyStats,
  Company,
  PaymentHistory,
  CarExpenseStats,
  SubVendor,
  FleetCompany,
} = require("../models/index");
const { cacheService } = require("../utils/cache");
const { Op } = require("sequelize");
const cache = require("../utils/cache");

class CarsService {
  static async getAllCars(
    page = 1,
    limit = 10,
    search = "",
    sortBy = "car_id",
    sortOrder = "ASC",
    status = null
  ) {
    console.log("Status:", status);
    try {
      const offset = (page - 1) * limit;

      // Build where clause for search and status
      const where = {};
      if (search) {
        where[Op.or] = [
          { car_name: { [Op.iLike]: `%${search}%` } },
          { car_model: { [Op.iLike]: `%${search}%` } },
          { car_id: { [Op.iLike]: `%${search}%` } },
        ];
      }

      // Add status filter if provided
      if (status && status !== "ALL") {
        where.status = status;
      }

      const cars = await Cars.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        attributes: [
          "car_id",
          "car_name",
          "car_model",
          "induction_date",
          "type_of_car",
          "driver_name",
          "driver_number",
          "owner_name",
          "owner_number",
          "owner_account_number",
          "ifsc_code",
          "address",
          "payment_type",
          "per_trip_amount",
          "monthly_package_rate",
          "status",
        ],
        include: [
          {
            model: CarPayments,
            as: "carPayments",
            attributes: [],
            required: false,
          },
        ],
        distinct: true,
      });

      // Calculate total payments for each car
      const carsWithPayments = await Promise.all(
        cars.rows.map(async (car) => {
          const totalPayments = await CarPayments.sum("amount", {
            where: { car_id: car.car_id },
          });
          return {
            ...car.toJSON(),
            totalPayments: totalPayments || 0,
          };
        })
      );

      return {
        status: "success",
        data: {
          cars: carsWithPayments,
          pagination: {
            total: cars.count,
            totalPages: Math.ceil(cars.count / limit),
            currentPage: page,
            limit,
          },
        },
      };
    } catch (error) {
      console.error("Error in CarsService.getAllCars:", error);
      throw error;
    }
  }

  // You might want to add a method to clear cache when cars are updated
  static clearCache() {
    cache.flushAll();
  }

  static async getCarById(id) {
    try {
      const car = await Cars.findByPk(id, {
        attributes: [
          "car_id",
          "car_name",
          "car_model",
          "induction_date",
          "type_of_car",
          "driver_name",
          "driver_number",
          "owner_name",
          "owner_number",
          "owner_account_number",
          "ifsc_code",
          "address",
          "payment_type",
          "per_trip_amount",
          "monthly_package_rate",
          "status",
        ],
        include: [
          {
            model: CarPayments,
            as: "carPayments",
            attributes: ["payment_id", "amount", "payment_date"],
          },
        ],
        order: [
          [{ model: CarPayments, as: "carPayments" }, "payment_date", "DESC"],
        ],
      });

      if (!car) {
        throw new Error("Car not found");
      }

      const totalPayments = await CarPayments.sum("amount", {
        where: { car_id: id },
      });

      return {
        status: "success",
        data: {
          ...car.toJSON(),
          totalPayments: totalPayments || 0,
        },
      };
    } catch (error) {
      console.error("Error in getCarById:", error);
      throw error;
    }
  }

  // Update cache clearing methods
  static async clearCarCache(carId) {
    try {
      const patterns = [
        "cars_list_",
        `car_${carId}`,
        `car_payments_${carId}`,
        "dashboard_data_",
      ];

      await cacheService.clearMultiplePatterns(patterns);
      // console.log("Car cache cleared successfully");
    } catch (error) {
      console.error("Error clearing car cache:", error);
      throw error;
    }
  }

  static async recordCarPaymentExpense(paymentData) {
    const transaction = await sequelize.transaction();
    try {
      // Input validation
      // console.log(paymentData);
      if (!paymentData.car_id) {
        throw new Error("Car ID is required");
      }
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error("Invalid payment amount");
      }

      // Convert payment_date string to Date object
      const paymentDate = paymentData.payment_date
        ? new Date(paymentData.payment_date)
        : new Date();
      console.log("Payment Date:", paymentDate);
      // Format amount to ensure it's a number
      const amount = parseFloat(paymentData.amount);

      // Validate car exists
      const car = await Cars.findByPk(paymentData.car_id, {
        attributes: ["car_id"],
      });
      if (!car) {
        throw new Error("Car not found");
      }

      // Create payment record
      const payment = await CarPayments.create(
        {
          car_id: paymentData.car_id,
          amount: amount,
          payment_type: paymentData.payment_type || "advance",
          payment_date: paymentDate,
          notes: paymentData.notes || "",
        },
        { transaction }
      );

      console.log("Payment: ", payment);
      console.log("Payment Data: ", paymentData);
      // Create transaction record
      const transactionRecord = await PaymentHistory.create(
        {
          transaction_type: "EXPENSE_CAR_ADVANCE",
          amount: amount,
          reference_id: payment.payment_id,
          transaction_date: paymentDate,
          description: `Advance payment for car ${paymentData.car_id}`,
          transaction_source: "CAR",
          reference_source_id: paymentData.car_id,
          metadata: {
            car_id: paymentData.car_id,
            payment_type: paymentData.payment_type || "advance",
            month: paymentDate.getMonth() + 1,
            year: paymentDate.getFullYear(),
            payment_date: paymentDate.toISOString(),
          },
        },
        { transaction }
      );

      // Calculate Total Expense
      let totalExpense = 0;
      try {
        const previousTotalExpense =
          await CarExpenseStats.calculateCumulativeExpenses(
            paymentData.car_id,
            paymentDate.getMonth() + 1,
            paymentDate.getFullYear()
          );

        // Ensure totalExpense is a number
        totalExpense = parseFloat(previousTotalExpense || 0) + amount;
      } catch (calcError) {
        console.warn("Failed to calculate cumulative expenses:", calcError);
        // Default to current amount if calculation fails
        totalExpense = amount;
      }

      // Create expense entry
      const expenseEntry = await CarExpenseStats.create(
        {
          car_id: paymentData.car_id,
          category: "ADVANCE", // Using 'ADVANCE' as a category
          amount: amount,
          total_expense: totalExpense, // Ensure this is set before creation
          month: paymentDate.getMonth() + 1,
          year: paymentDate.getFullYear(),
          description:
            paymentData.notes ||
            `Advance payment for car ${paymentData.car_id}`,
          additional_details: {
            payment_id: payment.payment_id,
            payment_type: payment.payment_type,
            reference_id: `CAR-${paymentData.car_id}-${transactionRecord.transaction_id}`,
          },
        },
        { transaction }
      );

      await transaction.commit();

      return {
        status: "success",
        message: "Car payment expense recorded successfully",
        data: {
          payment: {
            payment_id: `CAR-${paymentData.car_id}-${payment.payment_id}`,
            car_id: payment.car_id,
            amount: payment.amount,
            payment_type: payment.payment_type,
            payment_date: payment.payment_date,
            notes: payment.notes,
          },
          transaction: {
            transaction_id: transactionRecord.transaction_id,
            type: transactionRecord.transaction_type,
            amount: transactionRecord.amount,
            date: transactionRecord.transaction_date,
          },
          expenseEntry: {
            id: expenseEntry.id,
            total_expense: expenseEntry.total_expense,
          },
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error in recordCarPaymentExpense:", {
        message: error.message,
        stack: error.stack,
        payload: paymentData,
      });
      throw error;
    }
  }
  static async getCarsWithTotalPayments() {
    const cacheKey = "cars_total_payments";
    // console.log("Checking cache for:", cacheKey);
    try {
      // Check cache with debug logging
      // console.log("Checking cache for:", cacheKey);
      const cachedResult = await cacheService.get(cacheKey);

      if (cachedResult) {
        // console.log("Cache hit for:", cachedResult);
        return cachedResult;
      }

      // console.log("Cache miss for:", cacheKey);

      // Fetch from database
      const cars = await Cars.findAll({
        attributes: [
          "car_id",
          "car_name",
          "car_model",
          "induction_date",
          [
            sequelize.fn(
              "COALESCE",
              sequelize.fn("SUM", sequelize.col("payments.amount")),
              0
            ),
            "totalPayments",
          ],
        ],
        include: [
          {
            model: CarPayments,
            as: "payments",
            attributes: [],
            required: false,
          },
        ],
        group: [
          "Cars.car_id",
          "Cars.car_name",
          "Cars.car_model",
          "Cars.induction_date",
        ],
        order: [["car_name", "ASC"]],
      });

      // Format the result
      const result = cars.map((car) => ({
        car_id: car.car_id,
        car_name: car.car_name,
        car_model: car.car_model,
        induction_date: car.induction_date,
        totalPayments: Number(car.getDataValue("totalPayments")),
      }));

      // Cache the result with debug logging
      // console.log("Setting cache for:", cacheKey);
      await cacheService.set(cacheKey, result, 300);

      // Verify cache was set
      const verifyCacheSet = await cacheService.get(cacheKey);
      // console.log("Cache verification:", verifyCacheSet ? "SUCCESS" : "FAILED");

      return result;
    } catch (error) {
      console.error("Error in getCarsWithTotalPayments:", error);
      throw error;
    }
  }

  static async getCarWithPaymentsDetail(carId) {
    try {
      // Input validation
      if (!carId) {
        throw new Error("Car ID is required");
      }

      // Fetch car with detailed payment information
      const car = await Cars.findOne({
        where: { car_id: carId },
        include: [
          {
            model: CarPayments,
            as: "carPayments",
            attributes: [
              "payment_id",
              "amount",
              "payment_date",
              "payment_type",
              "notes",
              "createdAt",
            ],
            order: [["payment_date", "DESC"]],
          },
          {
            model: Company,
            as: "assignedCompanies", // Matches your many-to-many association
            attributes: ["company_id", "company_name"],
            through: {
              attributes: [], // Exclude junction table attributes
            },
          },
        ],
        attributes: {
          include: [
            [
              sequelize.fn(
                "COALESCE",
                sequelize.fn("SUM", sequelize.col("carPayments.amount")),
                0
              ),
              "totalPayments",
            ],
          ],
        },
        // Simplified group by clause
        group: [
          "Cars.car_id",
          "carPayments.payment_id",
          "assignedCompanies.company_id",
          "assignedCompanies.company_name",
        ],
      });

      if (!car) {
        throw new Error("Car not found");
      }

      // Transform car data
      const carData = car.get({ plain: true });
      // console.log(carData);
      return {
        ...carData,
        totalPayments: parseFloat(carData.totalPayments || 0),
        paymentHistory: (carData.carPayments || []).map((payment) => ({
          ...payment,
          amount: parseFloat(payment.amount),
          payment_date: new Date(payment.payment_date),
        })),
        companies: (carData.assignedCompanies || []).map((company) => ({
          company_id: company.company_id,
          company_name: company.company_name,
        })),
      };
    } catch (error) {
      console.error("Error in getCarWithPaymentsDetail:", {
        carId,
        errorMessage: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  static async addCar(carData) {
    const transaction = await sequelize.transaction();
    try {
      // Validate required fields
      const requiredFields = [
        "car_id",
        "car_name",
        "car_model",
        "driver_name",
        "driver_number",
        // "payment_type",
      ];

      for (const field of requiredFields) {
        if (!carData[field]) {
          throw new Error(`${field.replace("_", " ")} is required`);
        }
      }

      // Validate payment type specific fields
      // if (carData.payment_type === "TRIP_BASED" && !carData.per_trip_amount) {
      //   throw new Error("Per trip amount is required for trip-based payment");
      // }
      // if (
      //   carData.payment_type === "PACKAGE_BASED" &&
      //   !carData.monthly_package_rate
      // ) {
      //   throw new Error(
      //     "Monthly package rate is required for package-based payment"
      //   );
      // }

      // Format the data
      const formattedData = {
        ...carData,
        status: carData.status || "IN_PROCESS",
        induction_date: carData.induction_date
          ? new Date(carData.induction_date)
          : new Date(),
        per_trip_amount:
          carData.payment_type === "TRIP_BASED"
            ? parseFloat(carData.per_trip_amount)
            : null,
        monthly_package_rate:
          carData.payment_type === "PACKAGE_BASED"
            ? parseFloat(carData.monthly_package_rate)
            : null,
        fleet_company_ids: carData.fleet_company_ids,
      };

      console.log(formattedData);

      const newCar = await Cars.create(formattedData, { transaction });
      await this.clearCarCache();
      await transaction.commit();

      return {
        status: "success",
        message: "Car added successfully",
        data: newCar,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  // Method to invalidate cache
  static async invalidateCache() {
    try {
      // Delete specific caches
      await cacheService.del("/api/cars");

      // Delete any cached URLs containing 'cars'
      const keys = cacheService.getKeys();
      for (const key of keys) {
        if (key.includes("cars")) {
          await cacheService.del(key);
        }
      }

      // console.log("Caches invalidated successfully");
    } catch (error) {
      console.error("Error invalidating caches:", error);
    }
  }

  static async updateCar(carId, carData) {
    const transaction = await sequelize.transaction();
    try {
      const car = await Cars.findByPk(carId);
      if (!car) {
        throw new Error("Car not found");
      }

      // Validate payment type specific fields
      if (carData.payment_type === "TRIP_BASED" && !carData.per_trip_amount) {
        throw new Error("Per trip amount is required for trip-based payment");
      }
      if (
        carData.payment_type === "PACKAGE_BASED" &&
        !carData.monthly_package_rate
      ) {
        throw new Error(
          "Monthly package rate is required for package-based payment"
        );
      }

      // Format the update data
      const updateData = {
        ...carData,
        induction_date: carData.induction_date
          ? new Date(carData.induction_date)
          : car.induction_date,
        per_trip_amount:
          carData.payment_type === "TRIP_BASED"
            ? parseFloat(carData.per_trip_amount)
            : null,
        monthly_package_rate:
          carData.payment_type === "PACKAGE_BASED"
            ? parseFloat(carData.monthly_package_rate)
            : null,
      };

      await car.update(updateData, { transaction });
      await this.clearCarCache(carId);
      await transaction.commit();

      return {
        status: "success",
        message: "Car updated successfully",
        data: car,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async deleteCar(carId) {
    const transaction = await sequelize.transaction();
    try {
      // Input validation
      if (!carId) {
        throw new Error("Car ID is required");
      }

      // Find the car with all its associated records
      const car = await Cars.findByPk(carId, {
        include: [
          {
            model: CarPayments,
            as: "carPayments",
          },
          {
            model: CarExpenseStats,
            as: "carExpenses",
          },
          {
            model: PaymentHistory,
            as: "carTransactions",
            where: { transaction_source: "CAR", reference_source_id: carId },
            required: false,
          },
        ],
        transaction,
      });

      if (!car) {
        throw new Error("Car not found");
      }

      const totalExpenses =
        car.carPayments
          .filter((payment) => payment.payment_type === "advance")
          .reduce((total, payment) => total + parseFloat(payment.amount), 0) ||
        0;

      // Delete all associated records
      await Promise.all([
        // Delete payment history records
        PaymentHistory.destroy({
          where: {
            transaction_source: "CAR",
            reference_source_id: carId,
          },
          transaction,
        }),

        // Delete car expense stats
        CarExpenseStats.destroy({
          where: { car_id: carId },
          transaction,
        }),

        // Delete car payments
        CarPayments.destroy({
          where: { car_id: carId },
          transaction,
        }),
      ]);

      // Update company stats
      if (totalExpenses > 0) {
        await CompanyStats.decrement("total_expenses", {
          by: totalExpenses,
          where: { id: 1 },
          transaction,
        });

        // You might want to update monthly/yearly stats as well
        await this.updateMonthlyStats(transaction);
      }

      // Delete the car
      await car.destroy({ transaction });

      // Clear cache
      await this.clearCarCache(carId);

      await transaction.commit();

      return {
        status: "success",
        message: "Car deleted successfully",
        data: {
          carId,
          totalExpensesRemoved: totalExpenses,
          deletedAssociations: {
            payments: car.carPayments.length,
            expenses: car.carExpenses ? car.carExpenses.length : 0,
            transactions: car.paymentHistory ? car.paymentHistory.length : 0,
          },
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error in deleteCar:", {
        message: error.message,
        stack: error.stack,
        carId,
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Failed to delete car: ${error.message}`);
    }
  }

  // Helper method to update monthly stats (if needed)
  static async updateMonthlyStats(transaction) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Recalculate monthly stats
    const monthlyExpenses = await CarExpenseStats.sum("amount", {
      where: {
        month: currentMonth,
        year: currentYear,
      },
      transaction,
    });

    await CompanyStats.update(
      { monthly_expenses: monthlyExpenses || 0 },
      {
        where: { id: 1 },
        transaction,
      }
    );
  }

  static async assignCarToCompany(carId, companyIds) {
    try {
      // Begin transaction
      const result = await sequelize.transaction(async (t) => {
        // Validate car exists
        const car = await Cars.findByPk(carId, { transaction: t });
        if (!car) {
          throw new Error("Car not found");
        }

        // Validate companies exist
        const existingCompanies = await Companies.findAll({
          where: {
            company_id: {
              [Op.in]: companyIds,
            },
          },
          transaction: t,
        });

        if (existingCompanies.length !== companyIds.length) {
          throw new Error("Some companies do not exist");
        }

        // Remove existing assignments
        await CompanyCars.destroy({
          where: { car_id: carId },
          transaction: t,
        });

        // Create new assignments
        const assignments = companyIds.map((companyId) => ({
          car_id: carId,
          company_id: companyId,
          assignment_date: new Date(),
          status: "active",
        }));

        const createdAssignments = await CompanyCars.bulkCreate(assignments, {
          transaction: t,
        });

        return createdAssignments;
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getAssignedCompanies(carId) {
    try {
      // Get companies not already assigned to this car
      const assignedCompanyIds = await CompanyCars.findAll({
        where: { car_id: carId },
        attributes: ["company_id"],
      });

      const excludedIds = assignedCompanyIds.map((a) => a.company_id);

      const availableCompanies = await Companies.findAll({
        where: {
          company_id: {
            [Op.notIn]: excludedIds,
          },
          status: "active",
        },
        attributes: [
          "company_id",
          "company_name",
          "registration_number",
          "email",
          "phone",
          "status",
        ],
      });

      return availableCompanies;
    } catch (error) {
      throw error;
    }
  }

  static async deleteCarPayments(paymentId) {
    const transaction = await sequelize.transaction(); // Missing transaction initialization
    const id = parseInt(paymentId);
    try {
      console.log("Deleting payment with ID:", paymentId);

      const existingPayment = await CarPayments.findByPk(id, {
        transaction,
      });
      // console.log("Existing payment:", existingPayment);
      if (!existingPayment) {
        throw new Error("Payment not found");
      }

      const { CompanyStats } = sequelize.models;
      await CompanyStats.decrement("total_expenses", {
        by: parseFloat(existingPayment.amount),
        where: { id: 1 },
        transaction,
      });

      await CarPayments.destroy({
        where: { payment_id: id },
      });

      // Potential issue with cacheService - ensure it's properly imported and configured
      await cacheService.del("payments_list_");
      await cacheService.del(`payment_history_`);
      // await cacheService.del(`payment_history_`);
      await cacheService.clearMultiplePatterns([
        "payment_history_",
        "payment_list_",
        "dashboard_data_",
      ]);
      // await cacheService.clearPaymentCache(carId);
      await transaction.commit();

      return {
        status: "success",
        message: "Payment deleted successfully",
      };
    } catch (error) {
      // Always rollback the transaction in case of an error
      await transaction.rollback();
      throw error;
    }
  }

  static async updateCarPayment(paymentId, updateData) {
    console.log("Payment ID:", paymentId);
    console.log("Update Data:", updateData);
    const transaction = await sequelize.transaction();
    try {
      // Find the existing payment with associated data
      const existingPayment = await CarPayments.findByPk(paymentId, {
        transaction,
        include: [
          {
            model: PaymentHistory,
            as: "transactionHistory",
            where: { transaction_source: "CAR" },
            required: false,
          },
        ],
      });

      if (!existingPayment) {
        throw new Error("Payment not found");
      }

      // Prepare update data
      const updatedAmount = updateData.amount
        ? parseFloat(updateData.amount)
        : existingPayment.amount;
      const updatedPaymentDate = updateData.payment_date
        ? new Date(updateData.payment_date)
        : existingPayment.payment_date;
      const updatedPaymentType =
        updateData.payment_type || existingPayment.payment_type;

      // Update Payment Record
      const updatedPayment = await existingPayment.update(
        {
          amount: updatedAmount,
          payment_date: updatedPaymentDate,
          payment_type: updatedPaymentType,
          notes: updateData.notes || existingPayment.notes,
        },
        { transaction }
      );

      // Update or Create Transaction History
      let transactionRecord;
      if (
        existingPayment.transactionHistory &&
        existingPayment.transactionHistory.length > 0
      ) {
        // Update existing transaction history
        transactionRecord = await existingPayment.transactionHistory[0].update(
          {
            amount: updatedAmount,
            transaction_date: updatedPaymentDate,
            metadata: {
              ...existingPayment.transactionHistory[0].metadata,
              payment_type: updatedPaymentType,
              month: updatedPaymentDate.getMonth() + 1,
              year: updatedPaymentDate.getFullYear(),
              payment_date: updatedPaymentDate.toISOString(),
            },
          },
          { transaction }
        );
      } else {
        // Create new transaction history if not exists
        transactionRecord = await PaymentHistory.create(
          {
            transaction_type: "EXPENSE_CAR_ADVANCE",
            amount: updatedAmount,
            reference_id: paymentId.toString(),
            transaction_date: updatedPaymentDate,
            description: `Advance payment for car ${existingPayment.car_id}`,
            transaction_source: "CAR",
            reference_source_id: existingPayment.car_id,
            metadata: {
              car_id: existingPayment.car_id,
              payment_type: updatedPaymentType,
              month: updatedPaymentDate.getMonth() + 1,
              year: updatedPaymentDate.getFullYear(),
              payment_date: updatedPaymentDate.toISOString(),
            },
          },
          { transaction }
        );
      }

      // Detailed Total Expense Calculation
      const month = updatedPaymentDate.getMonth() + 1;
      const year = updatedPaymentDate.getFullYear();

      // Find all expense entries for this car in the same month and year
      const monthlyExpenses = await CarExpenseStats.findAll({
        where: {
          car_id: existingPayment.car_id,
          month: month,
          year: year,
        },
        order: [["createdAt", "ASC"]],
        transaction,
      });

      // console.log("Monthly Expenses:", monthlyExpenses);

      // Calculate cumulative expenses up to the current month
      const previousMonthExpenses = await CarExpenseStats.findAll({
        where: {
          car_id: existingPayment.car_id,
          [Op.or]: [
            { year: { [Op.lt]: year } },
            {
              year: year,
              month: { [Op.lt]: month },
            },
          ],
        },
        order: [
          ["year", "ASC"],
          ["month", "ASC"],
        ],
        transaction,
      });

      // Calculate cumulative expenses from previous months
      let cumulativeTotalExpense = previousMonthExpenses.reduce(
        (sum, entry) => sum + parseFloat(entry.amount || 0),
        0
      );

      // Find the existing expense entry for this payment
      const existingExpenseEntry = monthlyExpenses.find(
        (entry) =>
          entry.additional_details &&
          entry.additional_details.payment_id === paymentId.toString()
      );

      // Calculate total monthly expense including all entries
      let totalMonthlyExpense = monthlyExpenses.reduce(
        (sum, entry) => sum + parseFloat(entry.amount || 0),
        0
      );

      // Calculate amount difference
      const amountDifference =
        updatedAmount -
        (existingExpenseEntry ? existingExpenseEntry.amount : 0);

      // Update total monthly and cumulative expenses
      totalMonthlyExpense += amountDifference;
      cumulativeTotalExpense += amountDifference;

      if (existingExpenseEntry) {
        // Update existing expense entry
        await existingExpenseEntry.update(
          {
            amount: updatedAmount,
            total_expense: cumulativeTotalExpense,
            description: updateData.notes || existingExpenseEntry.description,
            additional_details: {
              ...existingExpenseEntry.additional_details,
              payment_type: updatedPaymentType,
              original_amount: existingExpenseEntry.amount,
              adjustment: amountDifference,
            },
          },
          { transaction }
        );
      } else {
        // Create new expense entry only if no existing entry found
        await CarExpenseStats.create(
          {
            car_id: existingPayment.car_id,
            category: "ADVANCE",
            amount: updatedAmount,
            total_expense: cumulativeTotalExpense,
            month: month,
            year: year,
            description:
              updateData.notes ||
              `Updated advance payment for car ${existingPayment.car_id}`,
            additional_details: {
              payment_id: paymentId.toString(),
              payment_type: updatedPaymentType,
              adjustment: amountDifference,
            },
          },
          { transaction }
        );
      }

      // Recalculate cumulative expenses for future months
      await this.recalculateCumulativeExpenses(
        existingPayment.car_id,
        month,
        year,
        transaction
      );

      await transaction.commit();

      return {
        status: "success",
        message: "Payment updated successfully",
        data: {
          payment: updatedPayment,
          totalMonthlyExpense: totalMonthlyExpense,
          cumulativeTotalExpense: cumulativeTotalExpense,
          amountDifference: amountDifference,
        },
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error in updateCarPayment:", {
        message: error.message,
        stack: error.stack,
        paymentId,
        updateData,
      });
      throw error;
    }
  }

  static async getAdvancePayments(carId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const advances = await CarPayments.findAll({
        where: {
          car_id: carId,
          payment_type: "advance",
          payment_date: {
            [Op.between]: [startDate, endDate],
          },
        },
        attributes: [
          [sequelize.fn("SUM", sequelize.col("amount")), "total_advance"],
        ],
        raw: true,
      });

      return advances[0]?.total_advance || 0;
    } catch (error) {
      throw error;
    }
  }

  static async calculateSalary(salaryData) {
    try {
      const calculatedData = salaryData.map((car) => {
        let grossAmount = 0;

        if (car.payment_type === "TRIP_BASED") {
          grossAmount = car.per_trip_amount * car.total_trips;
        } else {
          grossAmount = (car.monthly_package_rate / 30) * car.working_days;
        }

        const tdsAmount = (grossAmount * car.tds_percentage) / 100;
        const holidayPenalty =
          (grossAmount * car.holiday_penalty_percentage) / 100;
        const otherPenalty = (grossAmount * car.other_penalty_percentage) / 100;
        const totalDeductions =
          tdsAmount +
          holidayPenalty +
          otherPenalty +
          parseFloat(car.advance_amount || 0);

        return {
          ...car,
          gross_amount: grossAmount,
          tds_amount: tdsAmount,
          holiday_penalty_amount: holidayPenalty,
          other_penalty_amount: otherPenalty,
          total_deductions: totalDeductions,
          net_amount: grossAmount - totalDeductions,
        };
      });

      return {
        status: "success",
        data: calculatedData,
      };
    } catch (error) {
      throw error;
    }
  }

  static async saveSalaryCalculation(salaryData) {
    const transaction = await sequelize.transaction();
    try {
      const savedCalculations = await Promise.all(
        salaryData.map(async (calculation) => {
          const salaryRecord = await SalaryCalculations.create(
            {
              car_id: calculation.car_id,
              calculation_date: new Date(),
              gross_amount: calculation.gross_amount,
              tds_percentage: calculation.tds_percentage,
              tds_amount: calculation.tds_amount,
              holiday_penalty_percentage:
                calculation.holiday_penalty_percentage,
              holiday_penalty_amount: calculation.holiday_penalty_amount,
              other_penalty_percentage: calculation.other_penalty_percentage,
              other_penalty_amount: calculation.other_penalty_amount,
              advance_amount: calculation.advance_amount,
              total_deductions: calculation.total_deductions,
              net_amount: calculation.net_amount,
              remarks: calculation.remarks,
            },
            { transaction }
          );

          return salaryRecord;
        })
      );

      await transaction.commit();
      return {
        status: "success",
        message: "Salary calculations saved successfully",
        data: savedCalculations,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Modify the recalculateCumulativeExpenses method
  static async recalculateCumulativeExpenses(
    carId,
    startMonth,
    startYear,
    transaction
  ) {
    const { Op } = require("sequelize");

    // Find all expense entries after the updated month, ordered by year and month
    const futureExpenses = await CarExpenseStats.findAll({
      where: {
        car_id: carId,
        [Op.or]: [
          { year: { [Op.gt]: startYear } },
          {
            year: startYear,
            month: { [Op.gt]: startMonth },
          },
        ],
      },
      order: [
        ["year", "ASC"],
        ["month", "ASC"],
      ],
      transaction,
    });

    // Calculate cumulative expenses
    let cumulativeTotalExpense =
      await CarExpenseStats.calculateCumulativeExpenses(
        carId,
        startMonth,
        startYear
      );

    // Update future expense entries
    for (const expense of futureExpenses) {
      cumulativeTotalExpense += parseFloat(expense.amount || 0);

      await expense.update(
        { total_expense: cumulativeTotalExpense },
        { transaction }
      );
    }
  }

  static async getFleetAssignedToCar(carId) {
    try {
      // First, fetch the car with its sub-vendor
      const car = await Cars.findByPk(carId, {
        include: [
          {
            model: SubVendor,
            as: "client_subVendor",
            attributes: ["sub_vendor_name"],
          },
        ],
      });

      if (!car) {
        throw new Error("Car not found");
      }

      console.log(car);
      // Fetch companies separately using the fleet_company_ids
      const companiesDetails = await FleetCompany.findAll({
        where: {
          fleet_company_id: car.fleet_company_ids, // Use the array of company IDs
        },
      });

      // Transform companies details
      const formattedCompanies = companiesDetails.map((company) => ({
        fleet_company_id: company.fleet_company_id,
        company_name: company.company_name,
      }));

      // Prepare the full response
      return {
        car: {
          client_type: car.client_type,
          sub_vendor_name: car.client_subVendor
            ? car.client_subVendor.sub_vendor_name
            : null,
        },
        companies: formattedCompanies,
      };
    } catch (error) {
      console.error("Error in getFleetAssignedToCar controller:", error);
      throw error; // Re-throw to be handled by the controller
    }
  }
  // Add this method to your CarExpenseStats model
}

module.exports = CarsService;
