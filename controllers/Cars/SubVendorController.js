const { SubVendor, FleetCompany } = require("../../models/index");

exports.createSubVendor = async (req, res) => {
  try {
    const { sub_vendor_name, contact_person, contact_number, email } = req.body;

    console.log(req.body);
    const subVendor = await SubVendor.create({
      sub_vendor_name,
      contact_person,
      contact_number,
      email,
    });
    console.log(subVendor);
    res.status(201).json(subVendor);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
};

exports.getAllSubVendors = async (req, res) => {
  try {
    const subVendors = await SubVendor.findAll({
      include: [{ model: FleetCompany, as: "fleet_companies" }],
    });
    res.status(200).json(subVendors);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSubVendorsWithCompanies = async (req, res) => {
  try {
    const subVendors = await SubVendor.findAll({
      include: [
        {
          model: FleetCompany,
          as: "fleet_companies",
          attributes: ["fleet_company_id", "company_name"],
        },
      ],
      attributes: ["sub_vendor_id", "sub_vendor_name"],
    });

    res.json({
      subVendors: subVendors.map((vendor) => ({
        sub_vendor_id: vendor.sub_vendor_id,
        sub_vendor_name: vendor.sub_vendor_name,
        companies: vendor.fleet_companies || [],
      })),
    });
  } catch (error) {
    console.error("Error fetching sub-vendors with companies:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
