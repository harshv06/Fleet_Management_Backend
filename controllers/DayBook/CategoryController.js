// controllers/CategoryController.js
const CategoryService = require("../../services/DayBookService/CategoryService");

class CategoryController {
  static async getAllCategories(req, res) {
    try {
      const categories = await CategoryService.getAllCategories();
      res.json({ status: "success", data: categories });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async addCategory(req, res) {
    try {
        console.log("TEMP",req.body);
      const category = await CategoryService.addCategory(req.body);
      res.json({ status: "success", data: category });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async updateCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const category = await CategoryService.updateCategory(
        categoryId,
        req.body
      );
      res.json({ status: "success", data: category });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async deleteCategory(req, res) {
    try {
      const { categoryId } = req.params;
      await CategoryService.deleteCategory(categoryId);
      res.json({ status: "success", message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
}

module.exports = CategoryController;
