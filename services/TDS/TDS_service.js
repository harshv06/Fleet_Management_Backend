const { TDS, Company, DayBook, sequelize } = require("../../models/index");
const { Op } = require("sequelize");
const moment = require("moment");

class TDSService {
  // Get Financial Year
  static getFinancialYear(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  // Get TDS Report for Current Month
  static async getTDSReport(year, month) {
    // Ensure year and month are converted to numbers
    year = Number(year);
    month = Number(month);

    // Create start and end dates using moment.js
    const startDate = moment([year, month - 1])
      .startOf("month")
      .toDate();
    const endDate = moment([year, month - 1])
      .endOf("month")
      .toDate();

    const tdsRecords = await TDS.findAll({
      where: {
        payment_date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["company_name"],
        },
      ],
      order: [["payment_date", "DESC"]],
    });

    // Calculate Summary
    const summary = this.calculateTDSSummary(tdsRecords);
    console.log(tdsRecords)
    return {
      summary,
      tds_records: tdsRecords,
    };
  }

  // Calculate TDS Summary
  static calculateTDSSummary(tdsRecords) {
    const summary = {
      total_tds_collected: 0,
      total_invoices: tdsRecords.length,
      pending_deposit: 0,
      deposited: 0,
      tds_by_section: {},
      status: {
        collected: 0,
        deposited: 0,
        pending: 0,
      },
    };

    tdsRecords.forEach((record) => {
      // Total TDS
      summary.total_tds_collected += parseFloat(record.tds_amount);

      // TDS by Section
      if (!summary.tds_by_section[record.tds_section]) {
        summary.tds_by_section[record.tds_section] = {
          amount: 0,
          count: 0,
        };
      }
      summary.tds_by_section[record.tds_section].amount += parseFloat(
        record.tds_amount
      );
      summary.tds_by_section[record.tds_section].count++;

      // Status Calculation
      switch (record.payment_status) {
        case "COLLECTED":
          summary.pending_deposit += parseFloat(record.tds_amount);
          summary.status.collected++;
          break;
        case "DEPOSITED":
          summary.deposited += parseFloat(record.tds_amount);
          summary.status.deposited++;
          break;
        case "PENDING":
          summary.status.pending++;
          break;
      }
    });

    // Calculate Percentages
    const total =
      summary.status.collected +
      summary.status.deposited +
      summary.status.pending;
    summary.status.collected = total
      ? Math.round((summary.status.collected / total) * 100)
      : 0;
    summary.status.deposited = total
      ? Math.round((summary.status.deposited / total) * 100)
      : 0;
    summary.status.pending = total
      ? Math.round((summary.status.pending / total) * 100)
      : 0;

    return summary;
  }

  // Deposit TDS
  static async depositTDS(depositData) {
    const transaction = await sequelize.transaction();
    try {
      const tdsRecord = await TDS.findByPk(depositData.tds_record_id, {
        transaction,
      });

      if (!tdsRecord) {
        throw new Error("TDS Record not found");
      }

      const updatedRecord = await tdsRecord.update(
        {
          payment_status: "DEPOSITED",
          deposited_date: new Date(),
          challan_number: depositData.challan_number,
          remarks: depositData.remarks,
        },
        { transaction }
      );

      await transaction.commit();
      return updatedRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Get TDS Sections
  static async getTDSSections() {
    return ["194C", "194J", "194I", "194H", "192", "193", "195", "196D"];
  }

  // Get Detailed TDS Records
  static async getTDSRecords(filters) {
    const {
      company_id,
      financial_year,
      payment_status,
      start_date,
      end_date,
      page = 1,
      limit = 20,
    } = filters;

    const whereConditions = {};

    if (company_id) whereConditions.company_id = company_id;
    if (financial_year) whereConditions.financial_year = financial_year;
    if (payment_status) whereConditions.payment_status = payment_status;

    if (start_date && end_date) {
      whereConditions.payment_date = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    const { count, rows } = await TDS.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["company_name"],
        },
      ],
      order: [["payment_date", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      tds_records: rows,
      pagination: {
        total: count,
        page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }
}

module.exports = TDSService;
