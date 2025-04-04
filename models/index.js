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
const CarExpenseStatsModel = require("./ExpenseStats");
const PurchaseInvoiceModel = require("./PurchaseInvoice");
const PurchaseInvoiceItemModel = require("./PurchaseInvoiceItem");
const PurchaseTransactionModel = require("./PurchaseTransactions");
const DayBookModel = require("./DayBook/DayBook");
const MonthlyBalanceModel = require("./DayBook/MonthlyBalance");
const OpeningBalanceModel = require("./DayBook/OpeningBalance");
const CategoryModel = require("./DayBook/Categories");
const SubGroupsModel = require("./DayBook/SubGroups");
const SalaryCalculationsModel = require("./SalaryCalculations/SalaryCalculations");
const SalaryCalculationsHistoryModel = require("./SalaryCalculations/SalaryCalculationsHistory");
const CarSalaryRecordModel = require("./SalaryCalculations/CarSalaryRecord");
const BankAccount = require("./BankAccount/BankAccount");
const BankTransaction = require("./BankAccount/BankTransaction");
const CompanyProfileModel = require("./CompanyProfile/CompanyProfile");

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
const CarExpenseStats = CarExpenseStatsModel(sequelize, DataTypes);
const PurchaseInvoice = PurchaseInvoiceModel(sequelize, DataTypes);
const PurchaseInvoiceItem = PurchaseInvoiceItemModel(sequelize, DataTypes);
const PurchaseTransaction = PurchaseTransactionModel(sequelize, DataTypes);
const DayBook = DayBookModel(sequelize, DataTypes);
const MonthlyBalance = MonthlyBalanceModel(sequelize, DataTypes);
const OpeningBalance = OpeningBalanceModel(sequelize, DataTypes);
const Category = CategoryModel(sequelize, DataTypes);
const SubGroups = SubGroupsModel(sequelize, DataTypes);
const SalaryCalculations = SalaryCalculationsModel(sequelize, DataTypes);
const SalaryCalculationsHistory = SalaryCalculationsHistoryModel(
  sequelize,
  DataTypes
);
const CarSalaryRecord = CarSalaryRecordModel(sequelize, DataTypes);
const BankAccountModel = BankAccount(sequelize, DataTypes);
const BankTransactionModel = BankTransaction(sequelize, DataTypes);
const CompanyProfile = CompanyProfileModel(sequelize, DataTypes);

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

// 10. CarPayments and TransactionHistory Associations
CarPayments.hasOne(PaymentHistory, {
  foreignKey: {
    name: "payment_id",
    allowNull: true,
  },
  as: "transactionHistory",
  constraints: false,
  scope: {
    transaction_source: "CAR",
  },
});

PaymentHistory.belongsTo(CarPayments, {
  foreignKey: "payment_id",
  as: "carPayment",
  constraints: false,
  scope: {
    transaction_source: "CAR",
  },
});

Cars.hasMany(PaymentHistory, {
  foreignKey: "reference_source_id",
  constraints: false,
  scope: {
    transaction_source: "CAR",
  },
  as: "carTransactions",
});

PaymentHistory.belongsTo(Cars, {
  foreignKey: "reference_source_id",
  constraints: false,
  scope: {
    transaction_source: "CAR",
  },
  as: "car",
});

// Cars and CarExpenseStats Associations
Cars.hasMany(CarExpenseStats, {
  foreignKey: "car_id",
  as: "carExpenses",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

CarExpenseStats.belongsTo(Cars, {
  foreignKey: "car_id",
  as: "car",
});

// Optional: Add association between CarPayments and CarExpenseStats if needed
CarPayments.hasMany(CarExpenseStats, {
  foreignKey: "car_id",
  as: "expenseStats",
  constraints: false,
});

CarExpenseStats.belongsTo(CarPayments, {
  foreignKey: "car_id",
  as: "payment",
  constraints: false,
});

// Set up associations
// Replace the existing PurchaseInvoice and PurchaseTransaction associations with these:

// PurchaseInvoice Associations
PurchaseInvoice.belongsTo(Company, {
  foreignKey: "vendor_id", // This should match the column in purchase_invoices table
  as: "vendor",
});

Company.hasMany(PurchaseInvoice, {
  foreignKey: "vendor_id",
  as: "vendorPurchases",
});

// PurchaseInvoice and PurchaseInvoiceItem Associations
PurchaseInvoice.hasMany(PurchaseInvoiceItem, {
  foreignKey: "purchase_invoice_id",
  as: "items",
  onDelete: "CASCADE",
});

PurchaseInvoiceItem.belongsTo(PurchaseInvoice, {
  foreignKey: "purchase_invoice_id",
  as: "invoice",
});

// PurchaseTransaction Associations
PurchaseTransaction.belongsTo(Company, {
  foreignKey: "vendor_id",
  as: "vendor",
});

Company.hasMany(PurchaseTransaction, {
  foreignKey: "vendor_id",
  as: "vendorTransactions",
});

PurchaseTransaction.belongsTo(PurchaseInvoice, {
  foreignKey: "purchase_invoice_id",
  as: "invoice",
});

PurchaseInvoice.hasMany(PurchaseTransaction, {
  foreignKey: "purchase_invoice_id",
  as: "transactions",
});

SalaryCalculationsHistory.hasMany(CarSalaryRecord, {
  foreignKey: "calculation_id",
  sourceKey: "id",
  as: "carSalaryRecords",
});

CarSalaryRecord.belongsTo(SalaryCalculationsHistory, {
  foreignKey: "calculation_id",
  targetKey: "id",
  as: "calculation",
});

CarSalaryRecord.belongsTo(Cars, {
  foreignKey: "car_id",
  as: "car",
});

DayBook.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

Company.hasMany(DayBook, {
  foreignKey: "company_id",
  as: "transactions",
});

DayBook.belongsTo(Cars, {
  foreignKey: "car_id",
  as: "cars",
});

Cars.hasMany(DayBook, {
  foreignKey: "car_id",
  as: "DayBookCarTransactions",
});

DayBook.associate = (models) => {
  // Bank Account Association
  DayBook.belongsTo(models.BankAccountModel, {
    foreignKey: "account_id",
    as: "bankAccount",
    onDelete: "SET NULL",
  });
};

// PaymentHistory.belongsTo
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

SubGroups.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

Category.hasMany(SubGroups, {
  foreignKey: "category_id",
  as: "subGroups",
});

PaymentHistory.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

PaymentHistory.belongsTo(Invoice, {
  foreignKey: "reference_id",
  targetKey: "invoice_id",
  as: "invoice",
  constraints: false,
});

PaymentHistory.belongsTo(Cars, {
  foreignKey: "reference_source_id",
  as: "carPaymentHistory",
  constraints: false,
  scope: {
    transaction_source: "CAR",
  },
});

// Invoice Associations (additional to existing ones)
Invoice.hasMany(PaymentHistory, {
  foreignKey: "reference_id",
  sourceKey: "invoice_id",
  as: "transactionHistories",
  constraints: false,
  scope: {
    transaction_type: [
      "INCOME_INVOICE",
      "INVOICE_REVENUE",
      "INVOICE_STATUS_CHANGE",
    ],
  },
});

// Payments Association
Invoice.hasMany(Payment, {
  foreignKey: "invoice_id",
  as: "payments",
});

Payment.belongsTo(Invoice, {
  foreignKey: "invoice_id",
  as: "invoice",
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
  CarExpenseStats,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseTransaction,
  DayBook,
  MonthlyBalance,
  OpeningBalance,
  Category,
  SalaryCalculations,
  SalaryCalculationsHistory,
  CarSalaryRecord,
  BankAccountModel,
  BankTransactionModel,
  SubGroups,
  CompanyProfile,
};
