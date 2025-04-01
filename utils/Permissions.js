const PERMISSIONS = {
  DASHBOARD: {
    VIEW: "dashboard:view",
  },
  SALES_INVOICES: {
    VIEW: "sales_invoices:view",
    CREATE: "sales_invoices:create",
    UPDATE: "sales_invoices:update",
    DELETE: "sales_invoices:delete",
  },
  PURCHASE_INVOICES: {
    VIEW: "purchase_invoices:view",
    CREATE: "purchase_invoices:create",
    UPDATE: "purchase_invoices:update",
    DELETE: "purchase_invoices:delete",
  },
  COMPANIES: {
    VIEW: "companies:view",
    CREATE: "companies:create",
    UPDATE: "companies:update",
    DELETE: "companies:delete",
  },
  REPORTS: {
    VIEW: "reports:view",
    CREATE: "reports:create",
    UPDATE: "reports:update",
    DELETE: "reports:delete",
  },
  CARS: {
    VIEW: "cars:view",
    CREATE: "cars:create",
    UPDATE: "cars:update",
    DELETE: "cars:delete",
  },
  DAYBOOK: {
    VIEW: "daybook:view",
    CREATE: "daybook:create",
    UPDATE: "daybook:update",
    DELETE: "daybook:delete",
  },
  BANK_RECONCILIATION: {
    VIEW: "bank_reconciliation:view",
    CREATE: "bank_reconciliation:create",
    UPDATE: "bank_reconciliation:update",
    DELETE: "bank_reconciliation:delete",
  },
  FINANCIAL_REPORTS: {
    VIEW: "financial_reports:view",
    CREATE: "financial_reports:create",
    UPDATE: "financial_reports:update",
    DELETE: "financial_reports:delete",
  },
  ROLE_MANAGEMENT: {
    VIEW: "role_management:view",
    CREATE: "role_management:create",
    UPDATE: "role_management:update",
    DELETE: "role_management:delete",
  },

  PAYMENTS: {
    VIEW: "payments:view",
    CREATE: "payments:create",
    UPDATE: "payments:update",
    DELETE: "payments:delete",
  },

  USERS: {
    VIEW: "users:view",
    CREATE: "users:create",
    UPDATE: "users:update",
    DELETE: "users:delete",
  },
};

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    ...Object.values(PERMISSIONS.CARS),
    ...Object.values(PERMISSIONS.PAYMENTS),
    ...Object.values(PERMISSIONS.COMPANIES),
    // ...Object.values(PERMISSIONS.COMPANIES),
    ...Object.values(PERMISSIONS.DASHBOARD),
    ...Object.values(PERMISSIONS.SALES_INVOICES),
    ...Object.values(PERMISSIONS.PURCHASE_INVOICES),
    ...Object.values(PERMISSIONS.REPORTS),
    ...Object.values(PERMISSIONS.DAYBOOK),
    ...Object.values(PERMISSIONS.BANK_RECONCILIATION),
    ...Object.values(PERMISSIONS.FINANCIAL_REPORTS),
    ...Object.values(PERMISSIONS.ROLE_MANAGEMENT),
    ...Object.values(PERMISSIONS.USERS),
  ],
  ADMIN: [
    PERMISSIONS.CARS.VIEW,
    PERMISSIONS.CARS.CREATE,
    PERMISSIONS.CARS.UPDATE,
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.PAYMENTS.CREATE,
  ],
  MANAGER: [PERMISSIONS.CARS.VIEW, PERMISSIONS.PAYMENTS.VIEW],
  OPERATOR: [
    PERMISSIONS.CARS.VIEW,
    PERMISSIONS.CARS.CREATE,
    PERMISSIONS.CARS.UPDATE,
    PERMISSIONS.PAYMENTS.CREATE,
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.PAYMENTS.UPDATE,
    PERMISSIONS.COMPANIES.VIEW,
    PERMISSIONS.COMPANIES.CREATE,
    PERMISSIONS.COMPANIES.UPDATE,
  ],
  VIEWER: [],
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
};
