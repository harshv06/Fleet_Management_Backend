// utils/cacheService.js
const { query } = require("express");
const NodeCache = require("node-cache");

// Cache key generator for company list
const generateCompanyListCacheKey = (query = {}) => {
  const {
    page = 1,
    limit = 5,
    search = "",
    sortBy = "created_at",
    sortOrder = "DESC",
  } = query;
  return `companies_list_${page}_${limit}_${search}_${sortBy}_${sortOrder}`;
};

const generateCarsAssignedToCompanyKey = (carId, query = {}) => {
  const { sortBy = "created_at", sortOrder = "DESC" } = query;

  return `Cars_Assigned_To_Company_${carId}_${sortBy}_${sortOrder}`;
};

const generateAvailableCompaniesToAssignKey = (carId, query = {}) => {
  const { sortBy = "created_at", sortOrder = "DESC" } = query;

  return `Companies_Available_To_Assign_${carId}_${sortBy}_${sortOrder}`;
};

// Cache key generator for payment history
const generatePaymentHistoryCacheKey = (carId, query = {}) => {
  const {
    page = 1,
    limit = 10,
    startDate = "",
    endDate = "",
    status = "",
    payment_method = "",
  } = query;
  return `payment_history_${carId}_${page}_${limit}_${startDate}_${endDate}_${status}_${payment_method}`;
};

const generateCarListCacheKey = (query = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    sortBy = "car_id",
    sortOrder = "ASC",
  } = query;
  return `cars_list_${page}_${limit}_${search}_${sortBy}_${sortOrder}`;
};

const generateCarDetailsCacheKey = (carId) => {
  return `car_${carId}`;
};

const generateCarPaymentsCacheKey = (carId) => {
  return `car_payments_${carId}`;
};

const generateCompanyDetailsCacheKey = (companyId) => {
  return `company_${companyId}`;
};

const generateMonthlySumCacheKey = (companyId = "all") => {
  return `monthly_sum_${companyId}`;
};

const generateDashboardDataCacheKey = (query = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    sortBy = "car_id",
    sortOrder = "ASC",
  } = query;
  return `dashboard_data_`;
};




class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600,
      checkperiod: 120,
      useClones: false,
    });
  }

  async get(key) {
    const value = this.cache.get(key);
    console.log(`Cache get for key ${key}:`, value ? "HIT" : "MISS");
    return value;
  }

  async set(key, value, ttl = 300) {
    console.log(`Cache set for key ${key}`);
    const result = this.cache.set(key, value, ttl);
    console.log(`Cache keys after set:`, this.cache.keys());
    return result;
  }

  async del(key) {
    console.log(`Cache deleted for key ${key}`);
    const result = this.cache.del(key);
    console.log(`Cache keys after delete:`, this.cache.keys());
    return result;
  }

  async flush() {
    console.log("Cache flushed");
    return this.cache.flushAll();
  }

  async keys(pattern) {
    const allKeys = this.cache.keys();
    if (!pattern) return allKeys;
    return allKeys.filter((key) => key.includes(pattern));
  }

  async clearMultiplePatterns(patterns) {
    try {
      const allPromises = patterns.map(async (pattern) => {
        const keys = await this.keys(pattern);
        console.log(`Clearing cache keys for pattern ${pattern}:`, keys);
        return Promise.all(keys.map((key) => this.del(key)));
      });

      await Promise.all(allPromises);
      console.log("Cleared caches for patterns:", patterns);
    } catch (error) {
      console.error("Error clearing multiple cache patterns:", error);
      throw error;
    }
  }
  async clearPaymentHistoryCache(companyId) {
    const keys = await this.keys(`payment_history_${companyId}`);
    console.log(
      `Clearing payment history cache keys for company ${companyId}:`,
      keys
    );
    const results = await Promise.all(keys.map((key) => this.del(key)));
    console.log("Cache clear results:", results);
    console.log("Remaining cache keys:", this.cache.keys());
    return results;
  }

  async clearCompanyListCache() {
    const keys = await this.keys("companies_list_");
    console.log("Clearing company list cache keys:", keys);
    const results = await Promise.all(keys.map((key) => this.del(key)));
    console.log("Cache clear results:", results);
    console.log("Remaining cache keys:", this.cache.keys());
    return results;
  }

  async clearPaymentCache(carId) {
    try {
      // Clear specific car's payment history cache
      if (carId) {
        await this.clearMultiplePatterns([
          `payment_history_${carId}_*`
        ]);
      }

      // Clear global payment-related caches
      await this.clearMultiplePatterns([
        'payments_list_*',
        'payments_history_*',
        'car_payments_*'
      ]);
    } catch (error) {
      console.error('Error clearing payment cache:', error);
    }
  }


}

const cacheService = new CacheService();

module.exports = {
  cacheService,
  generateCompanyListCacheKey,
  generatePaymentHistoryCacheKey,
  generateCompanyDetailsCacheKey,
  generateMonthlySumCacheKey,
  generateCarListCacheKey,
  generateCarDetailsCacheKey,
  generateCarPaymentsCacheKey,
  generateCarsAssignedToCompanyKey,
  generateAvailableCompaniesToAssignKey,
  generateDashboardDataCacheKey
};
