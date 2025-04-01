const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../../models/index");
const { ROLE_PERMISSIONS } = require("../../utils/Permissions");
const AuthService = require("../../services/Auth/authService.js");

class AuthController {
  static async signup(req, res) {
    try {
      const { username, email, password } = req.body;
      // console.log(username,email,password)

     
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        // console.log("allready exists")
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = await User.create({
        username,       
        email: email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
      });

   
      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,        
          name: user.name,       
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Signup error:", error); 
      res.status(500).json({
        success: false,
        message: "Signup failed",
        error: error.message,
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
   

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
