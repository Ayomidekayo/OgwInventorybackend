import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

import Item from "../models/Item.js";
import Release from "../models/Release.js";

import Report from "../models/Report.js";
import User from "../models/User.js";
import { Schedule } from "../models/Schedule.js";
import monthlyReportWithChart from "../cron/monthlyReportWithChart.js";
import Return from "../models/Return.js";

/**
 * Run monthly report generation (with chart) manually via API
 */
export const runMonthlyReportNow = async (req, res) => {
  try {
    const result = await monthlyReportWithChart();
    return res.status(200).json({
      message: "Monthly report generated successfully",
      report: result,
    });
  } catch (error) {
    console.error("Error generating monthly chart report:", error);
    return res.status(500).json({
      message: "Error generating monthly report",
      error: error.message,
    });
  }
};

/**
 * List months for which monthly reports exist (metadata)
 */
export const listMonthlyReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .select("month")
      .sort({ month: -1 })
      .lean();
    res.json(reports);
  } catch (error) {
    console.error("Error listing monthly reports:", error);
    res.status(500).json({ message: "Failed to list monthly reports", error: error.message });
  }
};

/**
 * Download a monthly report PDF by month key
 */


export const downloadMonthlyReport = async (req, res) => {
  const { month, year } = req.params;

  if (!/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
    return res.status(400).json({ message: "Invalid month or year format. Month must be 2 digits, year must be 4 digits." });
  }

  const monthYear = `${month}-${year}`; // "11-2025"
  const fileName = `report-${monthYear}.pdf`;
  const pdfPath = path.join(process.cwd(), "pdf-reports", fileName);

  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ message: `Report not found for ${monthYear}` });
  }

  res.download(pdfPath, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: "Failed to download report", error: err.message });
    }
  });
};




// export async function monthlyReport(req, res) {
//   try {
//     const { month, year } = req.query;

//     if (!month || !year) {
//       return res.status(400).json({ message: "Both month and year are required (e.g., ?month=10&year=2025)." });
//     }

//     const m = parseInt(month, 10);
//     const y = parseInt(year, 10);

//     if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
//       return res.status(400).json({ message: "Invalid month or year format. Use numeric values (e.g., month=1-12, year=2025)." });
//     }

//     const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
//     const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

//     console.log("Start:", start, "End:", end);

//     // Items added this month
//     const added = await Item.find({ createdAt: { $gte: start, $lt: end } })
//       .populate("addedBy", "name");

//     // Items released this month
//     const released = await Release.find({ dateReleased: { $gte: start, $lt: end } })
//       .populate("releasedBy", "name")
//       .populate("item", "name");

//     // Items returned this month
//     const returned = await Return.find({ dateReturned: { $gte: start, $lt: end } })
//       .populate("item", "name")
//       .populate("processedBy", "name");

//     // Scheduled actions this month
//     const scheduled = await Schedule.find({ scheduledDate: { $gte: start, $lt: end } })
//       .populate("item", "name")
//       .populate("requestedBy", "name");

//     console.log("Added:", added.length, "Released:", released.length, "Returned:", returned.length, "Scheduled:", scheduled.length);

//     // Build PDF
//     const doc = new PDFDocument();
//     res.setHeader("Content-Type", "application/pdf");
//     doc.pipe(res);

//     doc.fontSize(18).text(`Inventory Report for ${month}/${year}`, { align: "center" });
//     doc.moveDown();

//     // Added items
//     doc.fontSize(14).text("Items Added:", { underline: true });
//     if (added.length === 0) {
//       doc.text("No items added this month.");
//     } else {
//       added.forEach(i => {
//         doc.text(`${i.name} | Type: ${i.category} | Qty: ${i.quantity} | Added By: ${i.addedBy?.name || "N/A"}`);
//       });
//     }

//     // Released items
//     doc.addPage();
//     doc.fontSize(14).text("Items Released:", { underline: true });
//     if (released.length === 0) {
//       doc.text("No items released this month.");
//     } else {
//       released.forEach(r => {
//         doc.text(`${r.item?.name || "Unknown"} | Qty: ${r.qtyReleased} | Released To: ${r.releasedTo} | Released By: ${r.releasedBy?.name || "N/A"}`);
//       });
//     }

//     // Returned items
//     doc.addPage();
//     doc.fontSize(14).text("Items Returned:", { underline: true });
//     if (returned.length === 0) {
//       doc.text("No items returned this month.");
//     } else {
//       returned.forEach(ret => {
//         doc.text(`${ret.item?.name || "Unknown"} | Qty: ${ret.quantityReturned} | Returned By: ${ret.returnedBy} | Processed By: ${ret.processedBy?.name || "N/A"}`);
//       });
//     }

//     // Scheduled actions
//     doc.addPage();
//     doc.fontSize(14).text("Scheduled Actions:", { underline: true });
//     if (scheduled.length === 0) {
//       doc.text("No scheduled actions this month.");
//     } else {
//       scheduled.forEach(s => {
//         doc.text(`${s.item?.name || "Unknown"} | Qty: ${s.quantity} | Category: ${s.category} | Requested By: ${s.requestedBy?.name || "N/A"} | Scheduled Date: ${s.scheduledDate.toDateString()}`);
//       });
//     }

//     doc.end();

//   } catch (error) {
//     console.error("Error generating monthly report:", error);
//     res.status(500).json({ message: "An unexpected error occurred while generating the report." });
//   }
// }

export async function monthlyReport(req, res) {
  try {
 const { month, year } = req.query;

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));

    console.log("Start:", start, "End:", end);

    // Items
    const added = await Item.find({ createdAt: { $gte: start, $lt: end } })
      .populate("addedBy", "name");
    console.log("Added raw:", added);

    // Releases
    const released = await Release.find({ dateReleased: { $gte: start, $lt: end } })
      .populate("releasedBy", "name")
      .populate("item", "name");
    console.log("Released raw:", released);

    // Returns
    const returned = await Return.find({ dateReturned: { $gte: start, $lt: end } })
      .populate("item", "name")
      .populate("processedBy", "name");
    console.log("Returned raw:", returned);

    // Schedules
    const scheduled = await Schedule.find({ scheduledDate: { $gte: start, $lt: end } })
      .populate("item", "name")
      .populate("requestedBy", "name");
    console.log("Scheduled raw:", scheduled);

    // Schedules
   
    // Build PDF as before...
    // ...
     const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(18).text(`Inventory Report for ${month}/${year}`, { align: "center" });
    doc.moveDown();

    // Added items
    doc.fontSize(14).text("Items Added:", { underline: true });
    if (added.length === 0) {
      doc.text("No items added this month.");
    } else {
      added.forEach(i => {
        doc.text(`${i.name} | Type: ${i.category} | Qty: ${i.quantity} | Added By: ${i.addedBy?.name || "N/A"}`);
      });
    }

    // Released items
    doc.addPage();
    doc.fontSize(14).text("Items Released:", { underline: true });
    if (released.length === 0) {
      doc.text("No items released this month.");
    } else {
      released.forEach(r => {
        doc.text(`${r.item?.name || "Unknown"} | Qty: ${r.qtyReleased} | Released To: ${r.releasedTo} | Released By: ${r.releasedBy?.name || "N/A"}`);
      });
    }

    // Returned items
    doc.addPage();
    doc.fontSize(14).text("Items Returned:", { underline: true });
    if (returned.length === 0) {
      doc.text("No items returned this month.");
    } else {
      returned.forEach(ret => {
        doc.text(`${ret.item?.name || "Unknown"} | Qty: ${ret.quantityReturned} | Returned By: ${ret.returnedBy} | Processed By: ${ret.processedBy?.name || "N/A"}`);
      });
    }

    // Scheduled actions
    doc.addPage();
    doc.fontSize(14).text("Scheduled Actions:", { underline: true });
    if (scheduled.length === 0) {
      doc.text("No scheduled actions this month.");
    } else {
      scheduled.forEach(s => {
        doc.text(`${s.item?.name || "Unknown"} | Qty: ${s.quantity} | Category: ${s.category} | Requested By: ${s.requestedBy?.name || "N/A"} | Scheduled Date: ${s.scheduledDate.toDateString()}`);
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error generating monthly report:", error);
    res.status(500).json({ message: "Unexpected error", error: error.message });
  }
}

/**
 * List years for which yearly reports exist.
 * (You need to store `year` in your Report model for this to work.)
 */
export const listYearlyReports = async (req, res) => {
  try {
    const years = await Report.find()
      .select("year")
      .sort({ year: -1 })
      .lean();
    res.json(years);
  } catch (error) {
    console.error("Error listing yearly reports:", error);
    res.status(500).json({ message: "Failed to list yearly reports", error: error.message });
  }
};


/**
 * Download a yearly report PDF by year
 */
export const downloadYearlyReport = async (req, res) => {
  const { year } = req.params;
  const fileName = `report-${year}.pdf`;
  const pdfPath = path.join(process.cwd(), "pdf-reports", fileName);

  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ message: `Yearly report not found for year ${year}` });
  }

  res.download(pdfPath, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: "Failed to download yearly report", error: err.message });
    }
  });
};


/**
 * Generate activity report for a user (releases + returns)
 */
export const generateUserReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const queryName = req.query.name;

    // Find user by ID or name
    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user) {
      user = await User.findOne({ name: new RegExp(`^${userId}$`, "i") });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userName = queryName || user.name;

    const [userReleases, userReturns] = await Promise.all([
      Release.find({ releasedBy: user._id }).populate("item"),
      Return.find({ processedBy: user._id }).populate("item"),
    ]);

    const doc = new PDFDocument();
    const reportsDir = path.join(process.cwd(), "pdf-reports", "users");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const fileName = `user-report-${user._id}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Title
    doc.fontSize(18).text(`Activity Report: ${userName}`, { align: "center" });
    doc.moveDown();

    // Released
    doc.fontSize(14).text("Released Items:", { underline: true });
    userReleases.forEach((rel, i) => {
      doc.fontSize(12).text(
        `${i + 1}. ${rel.item?.name || "Unknown"} — Qty: ${rel.qtyReleased || 0} — Date: ${new Date(rel.dateReleased).toDateString()}`
      );
    });
    doc.moveDown();

    // Returned
    doc.fontSize(14).text("Returned Items:", { underline: true });
    userReturns.forEach((ret, i) => {
      doc.fontSize(12).text(
        `${i + 1}. ${ret.item?.name || "Unknown"} — Qty: ${ret.quantityReturned || 0} — Date: ${new Date(ret.dateReturned).toDateString()}`
      );
    });
    doc.moveDown(2);

    doc.text("Generated by Inventory System", { align: "center" });
    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, fileName);
    });
    writeStream.on("error", (err) => {
      console.error("Error writing user PDF:", err);
      res.status(500).json({ message: "Error generating user report", error: err.message });
    });

  } catch (error) {
    console.error("Error in generateUserReport:", error);
    res.status(500).json({ message: "Error generating user report", error: error.message });
  }
};

/**
 * Generate activity report for a role (all releases / returns by users in that role)
 */
export const generateRoleReport = async (req, res) => {
  try {
    const { roleName } = req.params;

    const allReleases = await Release.find().populate("releasedBy item");
    const allReturns = await Return.find().populate("processedBy item");

    const roleReleases = allReleases.filter(rel => rel.releasedBy?.role === roleName);
    const roleReturns = allReturns.filter(ret => ret.processedBy?.role === roleName);

    const doc = new PDFDocument();
    const reportsDir = path.join(process.cwd(), "pdf-reports", "roles");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const fileName = `role-report-${roleName}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(18).text(`Role Report: ${roleName}`, { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Releases by Role:", { underline: true });
    roleReleases.forEach((rel, i) => {
      doc.fontSize(12).text(
        `${i + 1}. ${rel.item?.name || "Unknown"} — Qty: ${rel.qtyReleased} — By: ${rel.releasedBy?.name} — Date: ${new Date(rel.dateReleased).toDateString()}`
      );
    });
    doc.moveDown();

    doc.fontSize(14).text("Returns by Role:", { underline: true });
    roleReturns.forEach((ret, i) => {
      doc.fontSize(12).text(
        `${i + 1}. ${ret.item?.name || "Unknown"} — Qty: ${ret.quantityReturned} — By: ${ret.processedBy?.name} — Date: ${new Date(ret.dateReturned).toDateString()}`
      );
    });
    doc.moveDown(2);
    doc.text("Generated by Inventory System", { align: "center" });
    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, fileName);
    });
    writeStream.on("error", err => {
      console.error("Error writing role PDF:", err);
      res.status(500).json({ message: "Error generating role report", error: err.message });
    });

  } catch (error) {
    console.error("Error in generateRoleReport:", error);
    res.status(500).json({ message: "Error generating role report", error: error.message });
  }
};

/**
 * Get summary / breakdown inventory report (not PDF)
 */
export const getInventoryReport = async (req, res) => {
  try {
    const [items, releases, returns] = await Promise.all([
      Item.find().lean(),
      Release.find()
        .populate("item", "name category measuringUnit")
        .populate("releasedBy", "name email")
        .lean(),
      Return.find()
        .populate("item", "name category measuringUnit")
        .populate("processedBy", "name email")
        .lean(),
    ]);

    const now = new Date();
    const dueItems = releases
      .filter(r => r.isReturnable && r.expectedReturnBy)
      .map(r => ({
        ...r,
        dueStatus: now > new Date(r.expectedReturnBy) ? "overdue" : "due",
      }));

    const totalItems = items.length;
    const totalReleased = releases.reduce((sum, r) => sum + (r.qtyReleased || 0), 0);
    const totalReturned = returns.reduce((sum, r) => sum + (r.quantityReturned || 0), 0);

    const totalPendingReturn = dueItems.filter(i => i.dueStatus === "due").length;
    const totalOverdue = dueItems.filter(i => i.dueStatus === "overdue").length;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    const filterByDate = (arr, field, startDate) =>
      arr.filter(x => new Date(x[field]) >= startDate);

    const weekly = filterByDate(releases, "dateReleased", startOfWeek);
    const monthly = filterByDate(releases, "dateReleased", startOfMonth);
    const quarterly = filterByDate(releases, "dateReleased", startOfQuarter);

    res.json({
      summary: { totalItems, totalReleased, totalReturned, totalPendingReturn, totalOverdue },
      breakdown: { weekly, monthly, quarterly },
      data: { items, releases, returns, dueItems },
    });
  } catch (err) {
    console.error("Error in getInventoryReport:", err);
    res.status(500).json({ message: "Failed to fetch inventory report", error: err.message });
  }
};
export const getChartData = async (req, res) => {
  try {
    const now = new Date();

    // Aggregate released by category
    const releasedAgg = await Release.aggregate([
      {
        $lookup: {
          from: "items",
          localField: "item",
          foreignField: "_id",
          as: "itemInfo",
        },
      },
      { $unwind: "$itemInfo" },
      {
        $group: {
          _id: "$itemInfo.category",
          totalReleased: { $sum: "$qtyReleased" }
        }
      }
    ]);

    // Aggregate returned by category
    const returnedAgg = await Return.aggregate([
      {
        $lookup: {
          from: "items",
          localField: "item",
          foreignField: "_id",
          as: "itemInfo",
        },
      },
      { $unwind: "$itemInfo" },
      {
        $group: {
          _id: "$itemInfo.category",
          totalReturned: { $sum: "$quantityReturned" }
        }
      }
    ]);

    // Aggregate overdue by category (assuming overdue means expectedReturnBy < now and not fully returned)
    const overdueAgg = await Release.aggregate([
      {
        $match: {
          expectedReturnBy: { $lt: now },
          returnStatus: { $ne: "fully returned" }
        }
      },
      {
        $lookup: {
          from: "items",
          localField: "item",
          foreignField: "_id",
          as: "itemInfo",
        }
      },
      { $unwind: "$itemInfo" },
      {
        $group: {
          _id: "$itemInfo.category",
          totalOverdue: { $sum: "$qtyReleased" } // or use another field if appropriate
        }
      }
    ]);

    // Build a map of categories to combine them
    const categories = new Set();
    releasedAgg.forEach(e => categories.add(e._id));
    returnedAgg.forEach(e => categories.add(e._id));
    overdueAgg.forEach(e => categories.add(e._id));

    const labels = Array.from(categories);

    // Prepare arrays aligned with labels
    const released = labels.map(cat => {
      const r = releasedAgg.find(e => e._id === cat);
      return r ? r.totalReleased : 0;
    });
    const returned = labels.map(cat => {
      const r = returnedAgg.find(e => e._id === cat);
      return r ? r.totalReturned : 0;
    });
    const overdue = labels.map(cat => {
      const o = overdueAgg.find(e => e._id === cat);
      return o ? o.totalOverdue : 0;
    });

    res.json({ labels, released, returned, overdue });
  } catch (error) {
    console.error("Error in getChartData:", error);
    res.status(500).json({ message: "Error fetching chart data", error: error.message });
  }
};