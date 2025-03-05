// routes/category.js
const express = require("express");
const router = express.Router();
const CategoryController = require("../../controllers/DayBook/CategoryController");
// const authenticate = require("../middleware/authenticate");

router.get("/daybook/FetchCategories", CategoryController.getAllCategories);
router.post("/daybook/addCategory",  CategoryController.addCategory);
router.put("/:categoryId",  CategoryController.updateCategory);
router.delete("/:categoryId",  CategoryController.deleteCategory);

module.exports = router;
