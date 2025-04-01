// services/AuthService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PERMISSIONS, ROLE_PERMISSIONS } = require("../../utils/Permissions");
const { User } = require("../../models/index.js");
// require("dotenv").config();

const Data = process.env.JWT_SECRET;

class AuthService {
  static async login(email, password) {
    try {
      const user = await User.findOne({
        where: { email },
      });
  
      if (!user) {
        throw new Error("User not found");
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error("Invalid credentials");
      }
  
      if (!user.is_active) {
        throw new Error("User account is not active");
      }
  
      // Parse permissions
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
        // Fallback to role-based permissions
        else {
          parsedPermissions = ROLE_PERMISSIONS[user.role] || [];
        }
      } catch (parseError) {
        console.error("Error parsing permissions:", parseError);
        parsedPermissions = ROLE_PERMISSIONS[user.role] || [];
      }
  
      // Ensure permissions is an array and contains only strings
      parsedPermissions = Array.isArray(parsedPermissions) 
        ? parsedPermissions.filter(p => typeof p === 'string')
        : [];
  
      // Combine role-based and user-specific permissions
      const combinedPermissions = [
        ...new Set([
          ...(ROLE_PERMISSIONS[user.role] || []),
          ...parsedPermissions
        ])
      ];
  
      const token = jwt.sign(
        {
          id: user.user_id,
          email: user.email,
          role: user.role,
          // Ensure permissions is a plain array of strings
          permissions: combinedPermissions,
        },
        "MATOSHREE",
        { 
          expiresIn: "1h",
          // Optional: Add additional encoding to handle complex data
          encoding: 'utf8'
        }
      );
  
      return {
        token,
        user: {
          id: user.user_id,
          email: user.email,
          role: user.role,
          permissions: combinedPermissions,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  static async register(userData) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create(userData);

      return {
        id: user.user_id,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;
