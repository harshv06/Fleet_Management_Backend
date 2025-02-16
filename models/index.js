const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/dbConfig");
const { Op } = require("sequelize");

// Import models
const CompanyModel = require("./Company");
const PaymentModel = require("./Payment");
const PaymentHistoryModel = require("./TransactionHistory");
const CarsModel = require("./Cars");
const CompanyCarsModel = require("./CarsAssignedCompany");
const CarPaymentsModel = require("./CarAdvancePayments");
const CompanyStatsModel = require("./CompanyInventory");
const UserModel = require("./Users");
const RolesModel = require("./Roles");
const InvoiceModel = require("./Invoice");
const InvoiceItemsModel = require("./InvoiceItems");

// Initialize models
const Company = CompanyModel(sequelize, DataTypes);
const Payment = PaymentModel(sequelize, DataTypes);
const PaymentHistory = PaymentHistoryModel(sequelize, DataTypes);
const Cars = CarsModel(sequelize, DataTypes);
const CompanyCars = CompanyCarsModel(sequelize, DataTypes);
const CarPayments = CarPaymentsModel(sequelize, DataTypes);
const CompanyStats = CompanyStatsModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Role = RolesModel(sequelize, DataTypes);
const Invoice = InvoiceModel(sequelize, DataTypes);
const InvoiceItems = InvoiceItemsModel(sequelize, DataTypes);

// Comprehensive Associations

// 1. Company Associations
Company.hasMany(Payment, {
  foreignKey: "company_id",
  as: "companyPayments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Company.hasMany(PaymentHistory, {
  foreignKey: "company_id",
  as: "companyPaymentHistories",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Company.hasMany(Invoice, {
  foreignKey: "company_id",
  as: "companyInvoices", // Changed alias
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 2. Payment Associations
Payment.belongsTo(Company, {
  foreignKey: "company_id",
  as: "paymentCompany",
});

Payment.hasMany(PaymentHistory, {
  foreignKey: "payment_id",
  as: "paymentHistories",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 3. PaymentHistory Associations
PaymentHistory.belongsTo(Payment, {
  foreignKey: "payment_id",
  as: "historyPayment",
});

PaymentHistory.belongsTo(Company, {
  foreignKey: "company_id",
  as: "historyCompany",
});

// 4. Cars and Company Associations (Many-to-Many)
Company.belongsToMany(Cars, {
  through: CompanyCars,
  foreignKey: "company_id",
  otherKey: "car_id",
  as: "assignedCars",
});

Cars.belongsToMany(Company, {
  through: CompanyCars,
  foreignKey: "car_id",
  otherKey: "company_id",
  as: "assignedCompanies",
});

// 5. Cars and CarPayments Associations
Cars.hasMany(CarPayments, {
  foreignKey: "car_id",
  as: "carPayments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

CarPayments.belongsTo(Cars, {
  foreignKey: "car_id",
  as: "paymentCar",
});

// 6. CompanyCars Associations
CompanyCars.belongsTo(Company, {
  foreignKey: "company_id",
  as: "companyCarsCompany",
});

CompanyCars.belongsTo(Cars, {
  foreignKey: "car_id",
  as: "companyCar",
});

// 7. Invoice Associations
Invoice.belongsTo(Company, {
  foreignKey: "company_id",
  as: "invoiceCompany",
});

Invoice.hasMany(InvoiceItems, {
  foreignKey: "invoice_id",
  as: "invoiceItems",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// 8. InvoiceItems Associations
InvoiceItems.belongsTo(Invoice, {
  foreignKey: "invoice_id",
  as: "parentInvoice",
});

// 9. CompanyStats Associations
CompanyStats.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

Company.hasMany(CompanyStats, {
  foreignKey: "company_id",
  as: "companyStats",
});

// Remove duplicate associations
// Company.associate = (models) => {
//   // Remove this block as it's redundant
// };

// Optional: Add Scopes or Additional Configuration
Company.addScope("withInvoices", {
  include: [
    {
      model: Invoice,
      as: "companyInvoices", // Updated alias
    },
  ],
});

Invoice.addScope("withItems", {
  include: [
    {
      model: InvoiceItems,
      as: "invoiceItems", // Updated alias
    },
  ],
});

// Export models with associations
module.exports = {
  sequelize,
  Sequelize,
  Op,
  Company,
  Payment,
  PaymentHistory,
  Cars,
  CompanyCars,
  CarPayments,
  CompanyStats,
  User,
  Role,
  Invoice,
  InvoiceItems,
};
