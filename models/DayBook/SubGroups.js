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
      hooks: {
        afterSync: async () => {
          try {
            // First, get the category IDs
            const Category = sequelize.models.Category;
            const directCategory = await Category.findOne({
              where: { name: 'DIRECT' }
            });
            const paymentsCategory = await Category.findOne({
              where: { name: 'PAYMENTS' }
            });

            if (directCategory && paymentsCategory) {
              const defaultSubGroups = [
                {
                  name: 'PURCHASE',
                  description: 'Purchase sub-group',
                  category_id: directCategory.category_id,
                  is_active: true
                },
                {
                  name: 'INVOICE',
                  description: 'Invoice sub-group',
                  category_id: paymentsCategory.category_id,
                  is_active: true
                }
              ];

              for (const subGroup of defaultSubGroups) {
                await SubGroup.findOrCreate({
                  where: {
                    name: subGroup.name,
                    category_id: subGroup.category_id
                  },
                  defaults: subGroup
                });
              }
            }
          } catch (error) {
            console.error('Error creating default sub-groups:', error);
          }
        }
      }
    }
  );

  return SubGroup;
};
