module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Role', {
      role_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT
      },
      permissions: {
        type: DataTypes.JSONB,
        defaultValue: []
      }
    });
  
    return Role;
  };