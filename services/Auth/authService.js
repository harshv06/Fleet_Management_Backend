// services/AuthService.js
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { PERMISSIONS,ROLE_PERMISSIONS } = require("../../utils/Permissions");
const { User } = require("../../models/index.js");
// require("dotenv").config();

const Data=process.env.JWT_SECRET

class AuthService {
  static async login(email, password) {
    try {
    //   console.log("Here:", email, password);
      // Find user
      const user = await User.findOne({
        where: { email },
        // include: ['organization']
      });
      if (!user) {
        throw new Error("User not found");
      }

      // Check password
      const isMatch = password === user.password;

      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error("User account is not active");
      }

      // Generate token with permissions
      const token = jwt.sign(
          {
              id: user.user_id,
              email: user.email,
              role: user.role,
              permissions: ROLE_PERMISSIONS[user.role] || [],
            },
            "MATOSHREE",
            { expiresIn: "1h" }
        );
        // console.log("Here:", user.user_id, user.email, user.role,ROLE_PERMISSIONS[user.role]);
        // console.log("Here:", token);

      return {
        token,
        user: {
          id: user.user_id,
          email: user.email,
          role: user.role,
          //   organization: user.organization
        },
      };
    } catch (error) {
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
