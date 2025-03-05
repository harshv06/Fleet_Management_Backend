// services/CategoryService.js
const { Category, sequelize } = require("../../models/index");

class CategoryService {
  static async getAllCategories() {
    try {
      return await Category.findAll({
        where: { is_active: true },
        order: [["name", "ASC"]],
      });
    } catch (error) {
      throw error;
    }
  }

  static async addCategory(categoryData) {
    const transaction = await sequelize.transaction();
    try {
      const category = await Category.create(categoryData, { transaction });
      await transaction.commit();
      return category;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async updateCategory(categoryId, updateData) {
    const transaction = await sequelize.transaction();
    try {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      await category.update(updateData, { transaction });
      await transaction.commit();
      return category;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async deleteCategory(categoryId) {
    const transaction = await sequelize.transaction();
    try {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
      await category.update({ is_active: false }, { transaction });
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = CategoryService;
