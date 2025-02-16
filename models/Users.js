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
    },
    {
      timestamps: true,
      paranoid: true,
    }
  );

  User.initialize = async function () {
    const existingUser = await this.findOne();
    if (!existingUser) {
      await this.create({
        username: "admin",
        email: "admin@example.com",
        password: "123",
        role: "SUPER_ADMIN",
        is_active: true,
      });
    }
  };

  return User;
};
