import cron from "node-cron";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import Item from "../models/Item.js";
import Release from "../models/Release.js";
import Return from "../models/Return.js";
import Report from "../models/Report.js";
import { sendEmail } from "../utils/mailer.js";

cron.schedule("0 1 1 * *", async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthKey = startOfMonth.toISOString().slice(0, 7); // e.g. "2025-11"

    // 1. Aggregate data
    const totalItems = await Item.countDocuments();
    const totalReleasedAgg = await Release.aggregate([
      { $match: { dateReleased: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, sum: { $sum: "$qtyReleased" } } },
    ]);
    const totalReturnedAgg = await Return.aggregate([
      { $match: { dateReturned: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, sum: { $sum: "$quantityReturned" } } },
    ]);
    const overdueCount = await Release.countDocuments({
      expectedReturnBy: { $lt: now },
      returnStatus: { $ne: "fully returned" },
    });

    const totalReleased = totalReleasedAgg[0]?.sum || 0;
    const totalReturned = totalReturnedAgg[0]?.sum || 0;

    // 2. Save report in DB
    const reportDoc = await Report.create({
      month: monthKey,
      totalItems,
      totalReleased,
      totalReturned,
      overdueCount,
    });

    // 3. Generate PDF
    const pdfDoc = new PDFDocument();
    const reportsDir = path.join(process.cwd(), "pdf-reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const pdfPath = path.join(reportsDir, `report-${monthKey}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(writeStream);

    // PDF content — style as you want
    pdfDoc.fontSize(20).text(`Monthly Inventory Report — ${monthKey}`, { align: "center" });
    pdfDoc.moveDown();
    pdfDoc.fontSize(14).text(`Total Items: ${totalItems}`);
    pdfDoc.text(`Total Released: ${totalReleased}`);
    pdfDoc.text(`Total Returned: ${totalReturned}`);
    pdfDoc.text(`Overdue Items: ${overdueCount}`);
    pdfDoc.moveDown();
    pdfDoc.fontSize(12).text(`Generated on ${now.toDateString()}`);

    pdfDoc.end();

    // Wait for file to finish writing
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // 4. Email the PDF
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Monthly Inventory Report — ${monthKey}`,
      html: `<p>Here is the monthly inventory report for <strong>${monthKey}</strong>.</p>`,
      attachments: [
        {
          filename: `report-${monthKey}.pdf`,
          path: pdfPath,
        },
      ],
    });

    console.log(`✅ Monthly PDF report generated: ${pdfPath}`);
  } catch (error) {
    console.error("❌ Error generating monthly PDF report:", error);
  }
});
