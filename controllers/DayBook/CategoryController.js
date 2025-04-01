// controllers/CategoryController.js
const { where } = require("sequelize");
const { Category, SubGroups } = require("../../models/index");
const CategoryService = require("../../services/DayBookService/CategoryService");
const { Op } = require("sequelize");

class CategoryController {
  static async getAllCategories(req, res) {
    try {
      const categories = await CategoryService.getAllCategories();
      res.json({ status: "success", data: categories });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async fetchSubGroups(req, res) {
    try {
      const { categoryId } = req.params;

      // Validate category ID
      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
      }

      // Find sub-groups for the specific category
      const subGroups = await SubGroups.findAll({
        where: {
          category_id: categoryId,
          is_active: true,
        },
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["name"],
          },
        ],
        attributes: ["sub_group_id", "name", "description"],
      });

      res.status(200).json({
        success: true,
        data: subGroups,
      });
    } catch (error) {
      console.error("Error fetching sub-groups:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sub-groups",
        error: error.message,
      });
    }
  }
  static async addSubGroup(req, res) {
    try {
      const { name, categoryId, description = "" } = req.body;

      // Validate inputs
      if (!name || !categoryId) {
        return res.status(400).json({
          success: false,
          message: "Name and Category ID are required",
        });
      }

      // Check if category exists
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check if sub-group already exists for this category
      const existingSubGroup = await SubGroups.findOne({
        where: {
          name: { [Op.iLike]: name },
          category_id: categoryId,
        },
      });

      if (existingSubGroup) {
        return res.status(409).json({
          success: false,
          message: "Sub-group already exists in this category",
        });
      }

      // Create new sub-group
      const newSubGroup = await SubGroups.create({
        name,
        category_id: categoryId,
        description,
        is_active: true,
      });

      res.status(201).json({
        success: true,
        message: "Sub-group added successfully",
        data: newSubGroup,
      });
    } catch (error) {
      console.error("Error adding sub-group:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add sub-group",
        error: error.message,
      });
    }
  }

  static async addCategory(req, res) {
    try {
      // console.log("TEMP",req.body);
      const category = await CategoryService.addCategory(req.body);
      res.json({ status: "success", data: category });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  static async updateSubGroup(req, res) {
    try {
      const { subGroupId } = req.params;
      const { name, description, isActive } = req.body;

      const subGroup = await SubGroups.findByPk(subGroupId);
      if (!subGroup) {
        return res.status(404).json({
          success: false,
          message: "Sub-group not found",
        });
      }

      // Update sub-group
      await subGroup.update({
        name: name || subGroup.name,
        description: description || subGroup.description,
        is_active: isActive !== undefined ? isActive : subGroup.is_active,
      });

      res.status(200).json({
        success: true,
        message: "Sub-group updated successfully",
        data: subGroup,
      });
    } catch (error) {
      console.error("Error updating sub-group:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update sub-group",
        error: error.message,
      });
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

  static async deleteSubGroup(req, res) {
    try {
      const { subGroupId } = req.params;

      const subGroup = await SubGroup.findByPk(subGroupId);
      if (!subGroup) {
        return res.status(404).json({
          success: false,
          message: "Sub-group not found",
        });
      }

      // Soft delete
      await subGroup.update({ is_active: false });

      res.status(200).json({
        success: true,
        message: "Sub-group deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting sub-group:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete sub-group",
        error: error.message,
      });
    }
  }
}

module.exports = CategoryController;
