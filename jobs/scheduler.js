import cron from "node-cron";
import Release from "../models/Release.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
import { sendEmail } from "../utils/mailer.js";

// daily at midnight - check due returns in next 7 days or overdue
cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);

  // due soon
  const dueSoon = await Release.find({
    isReturnable: true,
    expectedReturnBy: { $gte: now, $lte: in7 },
    returnStatus: { $ne: "fully returned" }
  }).populate("item releasedBy");

  for (const r of dueSoon) {
    await Notification.create({ message: `Return due soon for ${r.item.name}`, item: r.item._id });
    // optionally email responsible persons
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Return due soon: ${r.item.name}`,
      html: `<p>Release to ${r.releasedTo} is due by ${r.expectedReturnBy}</p>`
    });
  }

  // overdue
  const overdue = await Release.find({
    isReturnable: true,
    expectedReturnBy: { $lt: now },
    returnStatus: { $ne: "fully returned" }
  }).populate("item releasedBy");

  for (const r of overdue) {
    await Notification.create({ message: `Overdue return for ${r.item.name}`, item: r.item._id });
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Overdue return: ${r.item.name}`,
      html: `<p>Release to ${r.releasedTo} was due by ${r.expectedReturnBy} and is overdue.</p>`
    });
  }
});

// monthly report generation: run 1st of month at 01:00
cron.schedule("0 1 1 * *", async () => {
  const monthKey = new Date().toISOString().slice(0,7); // YYYY-MM
  // compute totals with aggregation
  const totalItems = await Item.countDocuments();
  const totalReleased = await Release.aggregate([ /* sum qtyReleased for last month */ ]);
  const totalReturned = await Return.aggregate([ /* sum quantityReturned for last month */ ]);
  const overdueCount = await Return.countDocuments({ isOverdue: true });

  await Report.create({
    month: monthKey,
    totalItems,
    totalReleased: totalReleased[0]?.sum || 0,
    totalReturned: totalReturned[0]?.sum || 0,
    overdueCount
  });
});
