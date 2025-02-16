const router = require("express").Router();
const AuthController = require("../controllers/Authentication/authController");
const { validateToken, refreshToken } = require("../middlewares/authMiddleware");

// router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/validate-token", validateToken, AuthController.validateToken);
router.post("/refresh-token", refreshToken);
// router.post("/logout", AuthController.logout);
module.exports = router;
