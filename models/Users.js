module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      user_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(
          "SUPER_ADMIN",
          "ADMIN",
          "MANAGER",
          "OPERATOR",
          "VIEWER"
        ),
        defaultValue: "VIEWER",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      permissions: {
        type: DataTypes.TEXT,
        get() {
          const rawValue = this.getDataValue("permissions");
          return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
          this.setDataValue("permissions", JSON.stringify(value));
        },
      },
    },
    {
      timestamps: true,
      paranoid: true,
    }
  );

  User.initialize = async function () {
    try {
      const existingUser = await this.findOne({
        where: {
          role: "SUPER_ADMIN",
        },
      });
      if (!existingUser) {
        await this.create({
          username: "admin",
          email: "admin@gmail.com",
          password: "123456", // This will be hashed by the hook
          role: "SUPER_ADMIN",
          is_active: true,
          permissions: ROLE_PERMISSIONS["SUPER_ADMIN"] || [],
        });
      }
    } catch (e) {
      console.log("Error creating SUPER_ADMIN user:", e.message);
    }
  };

  return User;
};
