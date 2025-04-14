const { FleetCompany, SubVendor } = require("../../models/index");

exports.createCompany = async (req, res) => {
  try {
    const {
      company_name,
      contact_person,
      contact_number,
      email,
      sub_vendor_id,
    } = req.body;

    const newCompany = await FleetCompany.create({
      company_name,
      contact_person,
      contact_number,
      email,
      sub_vendor_id: sub_vendor_id || null,
    });

    res.status(201).json(newCompany);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getCompaniesBySubVendor = async (req, res) => {
  try {
    const { sub_vendor_id } = req.query;
    console.log(req.params);
    const companies = await FleetCompany.findAll({
      where: { sub_vendor_id },
    });
    res.status(200).json(companies);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
