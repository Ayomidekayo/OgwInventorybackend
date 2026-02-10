// utils/reportScheduler.js
import cron from "node-cron";
import dayjs from "dayjs";
import User from "../models/User.js";
import { generateInventoryReport } from "./generateReport.js";
import { sendEmail } from "./sendEmail.js";
import { emailTemplates } from "./emailTemplates.js";
import path from "path";

const sendReportToAdmins = async (type, pdfPath, csvPath, summary) => {
  const admins = await User.find({ role: "superadmin" }).select("email name");
  const recipients = admins.map(a => a.email).filter(Boolean);
  if (!recipients.length) {
    console.log("No superadmin emails found for report sending.");
    return;
  }

  const subject = `${type} Inventory Activity Report — ${dayjs().format("YYYY-MM-DD")}`;
  const html = `
    <p>Hello Superadmin,</p>
    <p>Please find attached the <b>${type.toLowerCase()}</b> inventory activity report (released & returned items) for the period.</p>
    <p><b>Totals</b>: Releases: ${summary.totalReleases}, Returns: ${summary.totalReturns}, Qty Released: ${summary.totalQtyReleased}, Qty Returned: ${summary.totalQtyReturned}</p>
    <p>Regards,<br/>Inventory System</p>
  `;

  // send to each admin separately (so personalization / deliverability are better)
  for (const admin of admins) {
    if (!admin.email) continue;
    await sendEmail({
      to: admin.email,
      subject,
      html,
      attachments: [
        { filename: path.basename(pdfPath), path: pdfPath },
        { filename: path.basename(csvPath), path: csvPath },
      ],
    });
  }

  console.log(`${type} report emailed to ${recipients.length} superadmin(s).`);
};

/**
 * Schedule weekly (Monday 08:00) and monthly (1st day 08:00).
 * Adjust the cron expressions and timezone as you prefer.
 */
export const scheduleReports = () => {
  // Weekly: Every Monday at 08:00
  cron.schedule("0 8 * * 1", async () => {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { pdfPath, csvPath, summary } = await generateInventoryReport(start, end, "weekly");
      await sendReportToAdmins("Weekly", pdfPath, csvPath, summary);
    } catch (err) {
      console.error("Error running weekly report job:", err);
    }
  });

  // Monthly: 1st day of each month at 08:00
  cron.schedule("0 8 1 * *", async () => {
    try {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
      // better: start of previous month to end of previous month
      const startOfPrevMonth = dayjs().subtract(1, "month").startOf("month").toDate();
      const endOfPrevMonth = dayjs().subtract(1, "month").endOf("month").toDate();
      const { pdfPath, csvPath, summary } = await generateInventoryReport(startOfPrevMonth, endOfPrevMonth, "monthly");
      await sendReportToAdmins("Monthly", pdfPath, csvPath, summary);
    } catch (err) {
      console.error("Error running monthly report job:", err);
    }
  });

  console.log("Report scheduler initialized (weekly & monthly jobs).");
};

// Auto-start when imported
scheduleReports();


/////// index.js or server.js (your main file)
import "./utils/reportScheduler.js"; // runs scheduleReports() on import
/////
// routes/adminTestRoutes.js
import express from "express";
import { generateInventoryReport } from "../utils/generateReport.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

router.get("/test-report", async (req, res) => {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 7*24*60*60*1000);
    const { pdfPath, csvPath, summary } = await generateInventoryReport(start, end, "weekly");
    res.json({ pdfPath, csvPath, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

