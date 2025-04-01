// models/SubGroup.js
module.exports = (sequelize, DataTypes) => {
  const SubGroup = sequelize.define(
    "SubGroup",
    {
      sub_group_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "categories",
          key: "category_id",
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "sub_groups",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["name", "category_id"],
        },
      ],
    }
  );


  return SubGroup;
};
