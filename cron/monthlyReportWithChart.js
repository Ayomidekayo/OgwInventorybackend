import cron from "node-cron";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import Report from "../models/Report.js";
import Item from "../models/Item.js";
import Release from "../models/Release.js";
import Return from "../models/Return.js";
import sendEmail from "../utils/sendEmail.js";


export const monthlyReportWithChart = async () => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const monthKey = startOfMonth.toISOString().slice(0, 7); // e.g. "2025-11"

    // 1. Fetch / aggregate
    const [items, releases, returns] = await Promise.all([
      Item.find().lean(),
      Release.find({
        dateReleased: { $gte: startOfMonth, $lte: endOfMonth },
      }).populate("item"),
      Return.find({
        dateReturned: { $gte: startOfMonth, $lte: endOfMonth },
      }).populate("item"),
    ]);

    // 2. Compute overdue count per category
    // We need to find releases that are overdue in this month (or up to now)
    const overdueReleases = await Release.find({
      expectedReturnBy: { $lt: now },
      dateReleased: { $gte: startOfMonth, $lte: endOfMonth },
      returnStatus: { $ne: "fully returned" },
    }).populate("item");

    // Build category map
    const categoryMap = {};  
    items.forEach((it) => {
      if (!categoryMap[it.category]) {
        categoryMap[it.category] = { released: 0, returned: 0, overdue: 0 };
      }
    });

    // Sum released / returned / overdue
    for (const rel of releases) {
      const c = rel.item?.category ?? "Uncategorized";
      categoryMap[c].released += rel.qtyReleased || 0;
    }
    for (const ret of returns) {
      const c = ret.item?.category ?? "Uncategorized";
      categoryMap[c].returned += ret.quantityReturned || 0;
    }
    for (const over of overdueReleases) {
      const c = over.item?.category ?? "Uncategorized";
      categoryMap[c].overdue += over.qtyReleased || 0; // or another metric
    }

    // Prepare chart data arrays
    const categories = Object.keys(categoryMap);
    const releasedData = categories.map((c) => categoryMap[c].released);
    const returnedData = categories.map((c) => categoryMap[c].returned);
    const overdueData = categories.map((c) => categoryMap[c].overdue);

    // 3. Save report metadata
    await Report.create({
      month: monthKey,
      totalItems: items.length,
      totalReleased: releasedData.reduce((a, b) => a + b, 0),
      totalReturned: returnedData.reduce((a, b) => a + b, 0),
      totalOverdue: overdueData.reduce((a, b) => a + b, 0),
      // you might want to also store category breakdown in Report schema
    });

    // 4. Build HTML + Chart.js with 3 datasets
    const html = `
      <html>
        <head><meta charset="utf-8" />
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { text-align: center; }
            .chart-container { width: 800px; margin: auto; }
          </style>
        </head>
        <body>
          <h1>Inventory Report — ${monthKey}</h1>
          <div class="chart-container">
            <canvas id="categoryChart" width="800" height="500"></canvas>
          </div>
          <script>
            const ctx = document.getElementById("categoryChart").getContext("2d");
            new Chart(ctx, {
              type: "bar",
              data: {
                labels: ${JSON.stringify(categories)},
                datasets: [
                  {
                    label: "Released",
                    data: ${JSON.stringify(releasedData)},
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    stack: "Stack 0"
                  },
                  {
                    label: "Returned",
                    data: ${JSON.stringify(returnedData)},
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    stack: "Stack 0"
                  },
                  {
                    label: "Overdue",
                    data: ${JSON.stringify(overdueData)},
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    stack: "Stack 0"
                  }
                ]
              },
              options: {
                scales: {
                  x: { stacked: true },
                  y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                  title: {
                    display: true,
                    text: "Released / Returned / Overdue by Category"
                  }
                }
              }
            });
          </script>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForSelector("canvas");

    const reportsDir = path.join(process.cwd(), "pdf-reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const pdfPath = path.join(reportsDir, `report-${monthKey}.pdf`);

    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Monthly Report — ${monthKey}`,
      html: `<p>Here’s your monthly report for <strong>${monthKey}</strong>.</p>`,
      attachments: [{ filename: `report-${monthKey}.pdf`, path: pdfPath }],
    });

    console.log("✅ PDF with 3‑series chart generated:", pdfPath);
    return { month: monthKey, path: pdfPath };
  } catch (err) {
    console.error("Error generating 3-series report:", err);
    throw err;
  }
};

cron.schedule("0 1 1 * *", () => {
  monthlyReportWithChart().catch(console.error);
});

export default monthlyReportWithChart;
