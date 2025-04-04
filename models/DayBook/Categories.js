// models/Category.js
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category",
    {
      category_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "categories",
      timestamps: true,
      underscored: true,
      hooks: {
        afterSync: async () => {
          try {
            const defaultCategories = [
              {
                name: "DIRECT",
                description: "Direct category",
                is_active: true,
              },
              {
                name: "PAYMENTS",
                description: "Payments category",
                is_active: true,
              },
            ];

            for (const category of defaultCategories) {
              await Category.findOrCreate({
                where: { name: category.name },
                defaults: category,
              });
            }
          } catch (error) {
            console.error("Error creating default categories:", error);
          }
        },
      },
    }
  );

  return Category;
};
