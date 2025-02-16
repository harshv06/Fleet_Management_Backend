const PERMISSIONS = {
  CARS: {
    VIEW: "cars:view",
    CREATE: "cars:create",
    UPDATE: "cars:update",
    DELETE: "cars:delete",
  },
  PAYMENTS: {
    VIEW: "payments:view",
    CREATE: "payments:create",
    UPDATE: "payments:update",
    DELETE: "payments:delete",
  },
  COMPANIES: {
    VIEW: "companies:view",
    CREATE: "companies:create",
    UPDATE: "companies:update",
    DELETE: "companies:delete",
  },
  USERS: {
    VIEW: "users:view",
    CREATE: "users:create",
    UPDATE: "users:update",
    DELETE: "users:delete",
  },
  DASHBOARD: {
    VIEW: "dashboard:view",
  },
};

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    ...Object.values(PERMISSIONS.CARS),
    ...Object.values(PERMISSIONS.PAYMENTS),
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.COMPANIES),
    ...Object.values(PERMISSIONS.DASHBOARD),
  ],
  ADMIN: [
    PERMISSIONS.CARS.VIEW,
    PERMISSIONS.CARS.CREATE,
    PERMISSIONS.CARS.UPDATE,
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.PAYMENTS.CREATE,
  ],
  MANAGER: [
    PERMISSIONS.CARS.VIEW,
    PERMISSIONS.CARS.CREATE,
    PERMISSIONS.PAYMENTS.CREATE,
    PERMISSIONS.PAYMENTS.VIEW,
    PERMISSIONS.COMPANIES.VIEW,
    PERMISSIONS.COMPANIES.CREATE,
  ],
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
  VIEWER: [PERMISSIONS.CARS.VIEW],
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
};
