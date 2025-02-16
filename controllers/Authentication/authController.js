const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../../models/index");
const { ROLE_PERMISSIONS } = require("../../utils/Permissions");
const AuthService = require("../../services/Auth/authService.js");

class AuthController {
  static async signup(req, res) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          message: "User already exists",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "VIEWER", // Default role
      });

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Signup failed",
        error: error.message,
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      // console.log(email, password);

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      const response = await AuthService.login(email, password);
      if (!response) {
        return res.status(400).json({
          message: "Invalid credentials",
        });
      }
      // console.log(response);
      res.status(200).json({
        message: "Login successful",
        user: response,
      });
    } catch (error) {
      res.status(500).json({
        message: "Login failed",
        error: error.message,
      });
    }
  }

  static async validateToken(req, res) {
    try {
      // If we've reached this point, the token is valid (thanks to middleware)
      // We can simply return the user information
      res.json({
        user: req.user
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Token validation failed',
        error: error.message 
      });
    }
  }
}

module.exports = AuthController;
