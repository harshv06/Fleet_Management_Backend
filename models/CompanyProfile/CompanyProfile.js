// models/CompanyProfile.js
module.exports = (sequelize, DataTypes) => {
  const CompanyProfile = sequelize.define(
    "CompanyProfile",
    {
      profile_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address_line1: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address_line2: {
        type: DataTypes.STRING,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pincode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contact_number: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
        validate: {
          isEmail: true,
        },
      },
      gst_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      pan_number: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      state_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bank_name: {
        type: DataTypes.STRING,
      },
      bank_account_number: {
        type: DataTypes.STRING,
      },
      ifsc_code: {
        type: DataTypes.STRING,
      },
      logo_url: {
        type: DataTypes.STRING,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      nature_of_transaction: {
        type: DataTypes.STRING,
      },
      service_category: {
        type: DataTypes.STRING,
      },
      hsn: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: "company_profile",
      timestamps: true,
      underscored: true,
    }
  );

  return CompanyProfile;
};
