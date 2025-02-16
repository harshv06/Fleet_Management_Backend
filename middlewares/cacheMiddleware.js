// middleware/cacheMiddleware.js
const {
  generateCompanyListCacheKey,
  generatePaymentHistoryCacheKey,
  generateCompanyDetailsCacheKey,
  generateMonthlySumCacheKey,
  cacheService,
  generateCarListCacheKey,
  generateCarDetailsCacheKey,
  generateCarPaymentsCacheKey,
  generateCarsAssignedToCompanyKey,
  generateAvailableCompaniesToAssignKey,
  generateDashboardDataCacheKey
} = require("../utils/cache");

// Company list cache middleware
const cacheMiddleware = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    let key;
    if (req.path === "/getAllCompanies") {
      key = generateCompanyListCacheKey(req.query);
    } else {
      key = req.originalUrl;
    }

    console.log(`Checking cache for key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Cache middleware error:", error);
    next();
  }
};

// Payment history cache middleware
const paymentCacheMiddleware = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    const companyId = req.params.companyId;
    const key = generatePaymentHistoryCacheKey(companyId, req.query);

    console.log(`Checking cache for payment history key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for payment history: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for payment history: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Payment cache middleware error:", error);
    next();
  }
};

const carCacheMiddleware = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    let key;
    if (req.path === "/cars") {
      key = generateCarListCacheKey(req.query);
    } else if (req.path.match(/^\/cars\/\w+$/)) {
      key = generateCarDetailsCacheKey(req.params.id);
    } else if (req.path.match(/^\/cars\/payments\/detail\/\w+$/)) {
      key = generateCarPaymentsCacheKey(req.params.carId);
    } else {
      key = req.originalUrl;
    }

    console.log(`Checking cache for car key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for car: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for car: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Car cache middleware error:", error);
    next();
  }
};

// Cache clearing middleware
const clearCacheMiddleware = (patterns) => async (req, res, next) => {
  try {
    const originalJson = res.json;
    res.json = async (body) => {
      try {
        if (body.status === "success") {
          await cacheService.clearMultiplePatterns(patterns);
          console.log(`Cleared cache for patterns:`, patterns);
        }
      } catch (error) {
        console.error(`Error clearing cache patterns:`, error);
      }
      originalJson.call(res, body);
    };
    next();
  } catch (error) {
    console.error("Clear cache middleware error:", error);
    next();
  }
};

const clearPaymentCacheMiddleware = (patterns) => async (req, res, next) => {
  try {
    const originalJson = res.json;
    res.json = async (body) => {
      try {
        if (body.status === "success") {
          await cacheService.clearMultiplePatterns(patterns);
          console.log(`Cleared cache for patterns:`, patterns);
        }
      } catch (error) {
        console.error(`Error clearing cache patterns:`, error);
      }
      originalJson.call(res, body);
    };
    next();
  } catch (error) {
    console.error("Clear cache middleware error:", error);
    next();
  }
};

const AssignedCarsCacheMiddleware = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    const carId = req.params.carId;
    const key = generateCarsAssignedToCompanyKey(carId, req.query);
    console.log(key);

    console.log(`Checking cache for payment history key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for payment history: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for payment history: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Payment cache middleware error:", error);
    next();
  }
};

const AvailableCompaniesToAssing = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    const carId = req.params.carId;
    const key = generateAvailableCompaniesToAssignKey(carId, req.query);
    console.log(key);

    console.log(`Checking cache for payment history key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for payment history: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for payment history: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Payment cache middleware error:", error);
    next();
  }
};

const AdvancepaymentCacheMiddleware = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    const carId = req.params.carId;
    const key = generatePaymentHistoryCacheKey(carId, req.query);

    console.log(`Checking cache for payment history key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for payment history: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for payment history: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Payment cache middleware error:", error);
    next();
  }
};

const DashboardDataCacheMiddleware = (duration) => async (req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  try {
    const key = generateDashboardDataCacheKey(req.query);

    console.log(`Checking cache for Dashboard history key: ${key}`);
    const cachedResponse = await cacheService.get(key);
    if (cachedResponse) {
      console.log(`Cache hit for Dashboard history: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`Cache miss for Dashboard history: ${key}`);
    res.originalJson = res.json;
    res.json = (body) => {
      cacheService.set(key, body, duration);
      res.originalJson(body);
    };

    next();
  } catch (error) {
    console.error("Payment cache middleware error:", error);
    next();
  }
};

module.exports = {
  cacheMiddleware,
  paymentCacheMiddleware,
  clearCacheMiddleware,
  carCacheMiddleware,
  clearPaymentCacheMiddleware,
  AdvancepaymentCacheMiddleware,
  AssignedCarsCacheMiddleware,
  AvailableCompaniesToAssing,
  DashboardDataCacheMiddleware
};
