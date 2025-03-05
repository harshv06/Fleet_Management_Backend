const { Op } = require("sequelize");

// models/CarExpenseStats.js
module.exports = (sequelize, DataTypes) => {
    const CarExpenseStats = sequelize.define(
      "CarExpenseStats",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        car_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: "cars",
            key: "car_id",
          },
        },
        category: {
          type: DataTypes.ENUM(
            'FUEL',
            'MAINTENANCE',
            'REPAIR',
            'INSURANCE',
            'TOLL',
            'MISC',
            'ADVANCE'
          ),
          allowNull: false,
          defaultValue: 'MISC'
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },
        total_expense: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        month: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 12
          }
        },
        year: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 2000,
            max: 2100
          }
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        additional_details: {
          type: DataTypes.JSONB,
          allowNull: true
        }
      },
      {
        tableName: "car_expense_stats",
        timestamps: true,
        indexes: [
          {
            fields: ['car_id', 'year', 'month', 'category']
          }
        ],
        hooks: {
          beforeValidate: (instance, options) => {
            // Ensure month and year are set correctly
            if (!instance.month) {
              instance.month = new Date().getMonth() + 1;
            }
            if (!instance.year) {
              instance.year = new Date().getFullYear();
            }
          }
        }
      }
    );
  
    // Association methods
    CarExpenseStats.associate = (models) => {
      // Associations with Car model
      CarExpenseStats.belongsTo(models.Cars, {
        foreignKey: 'car_id',
        as: 'car',
        onDelete: 'CASCADE'
      });
  
      // Optional: Association with TransactionHistory
      CarExpenseStats.hasOne(models.PaymentHistory, {
        foreignKey: 'reference_id',
        constraints: false,
        scope: {
          transaction_source: 'CAR'
        }
      });
    };
  
    // Class methods for aggregation and reporting
    CarExpenseStats.getMonthlyExpenseSummary = async function(carId, year) {
      return this.findAll({
        where: { 
          car_id: carId, 
          year: year 
        },
        attributes: [
          'month', 
          'category',
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
        ],
        group: ['month', 'category'],
        order: [['month', 'ASC']]
      });
    };
  
    // Method to calculate cumulative expenses
    CarExpenseStats.calculateCumulativeExpenses = async function(carId, month, year) {
      return this.sum('amount', {
        where: {
          car_id: carId,
          year: {
            [Op.lte]: year
          },
          month: {
            [Op.lte]: month
          }
        }
      });
    };
  
    // Method to get expense breakdown by category
    CarExpenseStats.getCategoryBreakdown = async function(carId, year) {
      return this.findAll({
        where: { 
          car_id: carId, 
          year: year 
        },
        attributes: [
          'category',
          [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
        ],
        group: ['category']
      });
    };
  
    // Static method to record expense
    CarExpenseStats.recordExpense = async function(expenseData, options = {}) {
      const transaction = options.transaction || await sequelize.transaction();
  
      try {
        // Validate input
        if (!expenseData.car_id) {
          throw new Error('Car ID is required');
        }
  
        // Prepare expense data
        const currentDate = new Date();
        const month = expenseData.month || currentDate.getMonth() + 1;
        const year = expenseData.year || currentDate.getFullYear();
  
        // Calculate total expense
        const previousTotalExpense = await this.calculateCumulativeExpenses(
          expenseData.car_id, 
          month, 
          year
        );
  
        // Create expense entry
        const expenseEntry = await this.create({
          car_id: expenseData.car_id,
          category: expenseData.category || 'MISC',
          amount: expenseData.amount,
          total_expense: previousTotalExpense + parseFloat(expenseData.amount),
          month: month,
          year: year,
          description: expenseData.description,
          additional_details: expenseData.additional_details
        }, { transaction });
  
        // Commit transaction if not provided
        if (!options.transaction) {
          await transaction.commit();
        }
  
        return expenseEntry;
      } catch (error) {
        // Rollback transaction if not provided
        if (!options.transaction) {
          await transaction.rollback();
        }
        throw error;
      }
    };
  
    return CarExpenseStats;
  };