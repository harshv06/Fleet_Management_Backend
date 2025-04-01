const router = require("express").Router();
const AuthController = require("../controllers/Authentication/authController");
const {
  validateToken,
  refreshToken,
} = require("../middlewares/authMiddleware");
const { User } = require("../models/index");
const bcrypt = require("bcryptjs");
const { ROLE_PERMISSIONS } = require("../utils/Permissions");
// router.post("/register", AuthController.register);
router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/validate-token", validateToken, AuthController.validateToken);
router.post("/refresh-token", refreshToken);

router.post("/create", validateToken, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const {
      email,
      password,
      username,
      role,
      is_active,
      permissions = [],
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Combine role-based and custom permissions
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    const combinedPermissions = [
      ...new Set([...rolePermissions, ...permissions]),
    ];

    // Create user
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      role,
      is_active,
      permissions: JSON.stringify(combinedPermissions),
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.user_id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email,
        permissions: combinedPermissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/getAllUsers", validateToken, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const users = await User.findAll({
      attributes: [
        "user_id", 
        "username", 
        "email", 
        "role", 
        "is_active", 
        "permissions"  // Include permissions in the query
      ],
      order: [["createdAt", "DESC"]],
    });

    // Map users and parse their permissions
    const processedUsers = users.map(user => {
      let parsedPermissions = [];
      try {
        // First, try to parse as JSON string
        if (typeof user.permissions === "string") {
          parsedPermissions = JSON.parse(user.permissions);
        }
        // If it's already an array, use it directly
        else if (Array.isArray(user.permissions)) {
          parsedPermissions = user.permissions;
        }
        // If null or undefined, use role-based permissions
        else {
          parsedPermissions = ROLE_PERMISSIONS[user.role] || [];
        }
      } catch (parseError) {
        console.error("Error parsing permissions:", parseError);
        // Fallback to role-based permissions if parsing fails
        parsedPermissions = ROLE_PERMISSIONS[user.role] || [];
      }

      return {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        permissions: parsedPermissions
      };
    });

    res.json({ users: processedUsers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/permissions", validateToken, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

    // Combine role-based and custom permissions
    const combinedPermissions = [
      ...new Set([...rolePermissions, ...permissions]),
    ];

    // Update user permissions
    user.permissions = JSON.stringify(combinedPermissions);
    await user.save();

    res.json({
      message: "Permissions updated successfully",
      permissions: combinedPermissions,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/:id/add-permission", validateToken, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { permission } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse existing permissions
    const currentPermissions = user.permissions
      ? JSON.parse(user.permissions)
      : [];

    // Get role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

    // Add new permission if it doesn't already exist
    if (!currentPermissions.includes(permission)) {
      currentPermissions.push(permission);
    }

    // Combine role-based and custom permissions
    const combinedPermissions = [
      ...new Set([...rolePermissions, ...currentPermissions]),
    ];

    // Update user permissions
    user.permissions = JSON.stringify(combinedPermissions);
    await user.save();

    res.json({
      message: "Permission added successfully",
      permissions: combinedPermissions,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// New route to remove a single permission
router.delete("/:id/remove-permission", validateToken, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { permission } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse existing permissions
    const currentPermissions = user.permissions
      ? JSON.parse(user.permissions)
      : [];

    // Get role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

    // Remove the specific permission (except role-based permissions)
    const updatedPermissions = currentPermissions.filter(
      (p) => p !== permission && !rolePermissions.includes(p)
    );

    // Combine role-based and custom permissions
    const combinedPermissions = [
      ...new Set([...rolePermissions, ...updatedPermissions]),
    ];

    // Update user permissions
    user.permissions = JSON.stringify(combinedPermissions);
    await user.save();

    res.json({
      message: "Permission removed successfully",
      permissions: combinedPermissions,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete user
router.delete("/:id", validateToken, async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// router.post("/logout", AuthController.logout);
module.exports = router;
