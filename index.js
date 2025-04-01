const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const CarRoutes = require("./routes/CarRoutes");
const sequelize = require("./config/dbConfig");
const CompanyRouter = require("./routes/CompanyRoutes");
const PaymentRouter = require("./routes/PaymentRoutes");
const InventoryRouter = require("./routes/InventoryRoutes");
const CarsCompanyRouter = require("./routes/CarsCompanyRoutes");
const AuthRouter = require("./routes/AuthRoutes");
const InvoiceRouter = require("./routes/InvoiceRoutes");
const PurchaseInvoiceRouter = require("./routes/PurchaseInvoiceRoutes");
const DayBookRouter = require("./routes/DayBook/DayBookRoutes");
const CategoryRouter = require("./routes/DayBook/CategoryRoutes");
const BankAccountRoutes = require("./routes/BankAccount/BankAccountRoutes");
// const SalaryCalculationRouter=require("./routes/SalaryCalculations/SalaryCalculationsRoutes")
const SalaryCalculation = require("./routes/SalaryCalculations/SalaryCalculationsRoutes");
const financialReportRoutes = require("./routes/FinancialReport/FinancialReportsRoutes");
// const { Sequelize, DataTypes } = require('sequelize');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Routes
app.use("/api", CarRoutes);
app.use("/api", CompanyRouter);
app.use("/api", PaymentRouter);
app.use("/api", InventoryRouter);
app.use("/api", CarsCompanyRouter);
app.use("/api", AuthRouter);
app.use("/api", InvoiceRouter);
app.use("/api", PurchaseInvoiceRouter);
app.use("/api", DayBookRouter);
app.use("/api", CategoryRouter);
app.use("/api", SalaryCalculation);
app.use("/api", BankAccountRoutes);
app.use("/api", financialReportRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

// Database initialization
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");
    // await createCustomSequence();
    // Sync models
    await sequelize.sync({ force: false });
    console.log("Models synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

initializeDatabase();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
