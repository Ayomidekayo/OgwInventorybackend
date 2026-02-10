// utils/checkLowStock.js
import { STOCK_THRESHOLD } from "../constants/storageConfig.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emailTemplates } from "./emailTemplates.js";
import sendEmail from "./sendEmail.js";


/**
 * Checks and handles low stock + restock recovery alerts.
 * @param {Object} item - The item document.
 * @param {Object} triggeredBy - The user who triggered the update (optional).
 */
export const checkLowStock = async (item, triggeredBy = null) => {
  try {
    if (!item || typeof item.quantity !== "number") return;

    // Fetch all superadmins
    const superadmins = await User.find({ role: "superadmin" }).select("email name _id");
    if (!superadmins.length) return;

    // Get the latest low-stock alert (if any)
    const existingAlert = await Notification.findOne({
      itemId: item._id,
      type: "low_stock",
    }).sort({ createdAt: -1 });

    // --- ⚠️ CASE 1: Low stock ---
    if (item.quantity <= STOCK_THRESHOLD) {
      if (
        existingAlert &&
        existingAlert.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ) {
        console.log(`⏸️ Low-stock alert already sent for "${item.name}"`);
        return;
      }

      const subject = `⚠️ Low Stock Alert: ${item.name}`;
      const html = emailTemplates.lowStockAlert({
        item: item.name,
        category: item.category,
        quantity: item.quantity,
        threshold: STOCK_THRESHOLD,
      });

      const notifications = superadmins.map(admin => ({
        toUser: admin._id,
        createdBy: triggeredBy?._id || null,
        itemId: item._id,
        type: "low_stock",
        message: `Low stock alert: "${item.name}" has only ${item.quantity} left.`,
        meta: { itemQuantity: item.quantity, threshold: STOCK_THRESHOLD },
      }));

      await Notification.insertMany(notifications);

      for (const admin of superadmins) {
        await sendEmail({ to: admin.email, subject, html });
      }

      console.log(`📩 Low-stock alert sent for "${item.name}"`);
    }

    // ---  CASE 2: Restocked ---
    else if (existingAlert) {
      // Check if a restock alert already sent after the last low-stock one
      const restockAlert = await Notification.findOne({
        itemId: item._id,
        type: "restock",
        createdAt: { $gte: existingAlert.createdAt },
      });

      if (restockAlert) {
        console.log(`ℹ️ Restock alert already sent for "${item.name}"`);
        return;
      }

      const restockerName = triggeredBy?.name || "A team member";
      const subject = `✅ Restocked by ${restockerName}: ${item.name}`;
      const html = emailTemplates.restockAlert({
        item: item.name,
        category: item.category,
        quantity: item.quantity,
        restocker: restockerName,
      });

      const notifications = superadmins.map(admin => ({
        toUser: admin._id,
        createdBy: triggeredBy?._id || null,
        itemId: item._id,
        type: "restock",
        message: `✅ "${item.name}" has been restocked above threshold (${item.quantity} available) by ${restockerName}.`,
        meta: {
          itemQuantity: item.quantity,
          threshold: STOCK_THRESHOLD,
          restockedBy: restockerName,
        },
      }));

      await Notification.insertMany(notifications);

      for (const admin of superadmins) {
        await sendEmail({ to: admin.email, subject, html });
      }

      console.log(`📦 Restock alert sent for "${item.name}" by ${restockerName}`);
    }
  } catch (err) {
    console.error("Error in checkLowStock:", err.message);
  }
};
