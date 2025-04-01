// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { User } = require("../models/index");
const { PERMISSIONS, ROLE_PERMISSIONS } = require("../utils/Permissions");

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Get token from header
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "MATOSHREE");
      // console.log("req.user", decoded);

      // Attach user to request
      req.user = decoded;
      // Check if user has required permission
      if (!decoded.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
      }

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    }
  };
};

// Middleware to check if user is active
const checkUserActive = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user || !user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const validateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Extract token (handle potential formatting issues)
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== "bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const token = tokenParts[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "MATOSHREE");
    } catch (verifyError) {
      console.error("Token Verification Error:", verifyError);

      // Specific error handling
      if (verifyError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
          error: "TokenExpiredError",
        });
      }

      if (verifyError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          error: "JsonWebTokenError",
        });
      }

      // Catch-all for other JWT errors
      return res.status(401).json({
        success: false,
        message: "Authentication failed",
        error: verifyError.message,
      });
    }

    // Validate decoded token structure
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Find user in database
    const user = await User.findByPk(decoded.id, {
      attributes: [
        "user_id",
        "username",
        "email",
        "role",
        "is_active",
        "permissions",
      ],
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }

    // Parse user permissions
    let userPermissions = [];
    try {
      // First, try to parse permissions from the user model
      if (typeof user.permissions === "string") {
        userPermissions = JSON.parse(user.permissions);
      } else if (Array.isArray(user.permissions)) {
        userPermissions = user.permissions;
      }

      // If no user-specific permissions, use role-based
      if (!userPermissions.length) {
        userPermissions = ROLE_PERMISSIONS[user.role] || [];
      }
    } catch (parseError) {
      console.error("Error parsing user permissions:", parseError);
      userPermissions = ROLE_PERMISSIONS[user.role] || [];
    }

    // Combine role-based and user-specific permissions
    const combinedPermissions = [
      ...new Set([...(ROLE_PERMISSIONS[user.role] || []), ...userPermissions]),
    ];

    // Attach user to request with comprehensive permissions
    req.user = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: combinedPermissions,
    };

    // Log successful authentication
    console.log("User Authenticated:", {
      id: req.user.id,
      role: req.user.role,
      permissionsCount: req.user.permissions.length,
    });

    // Proceed to next middleware
    next();
  } catch (error) {
    // Catch-all error handler
    console.error("Unexpected Error in Token Validation:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
      error: error.message,
    });
  }
};

// Token refresh middleware
const refreshToken = async (req, res) => {
  const oldToken = req.headers.authorization?.split(" ")[1];

  try {
    // Decode (not verify) the old token to get user info
    const decoded = jwt.decode(oldToken);

    if (!decoded) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    // Find user
    const user = await User.findByPk(decoded.id, {
      attributes: ["user_id", "name", "email", "role", "is_active"],
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        message: "User not found or inactive",
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        id: user.user_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token: newToken,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: ROLE_PERMISSIONS[user.role] || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Token refresh failed",
      error: error.message,
    });
  }
};

module.exports = {
  checkPermission,
  checkUserActive,
  validateToken,
  refreshToken,
};
