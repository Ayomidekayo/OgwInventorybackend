import ActionLog from "../models/ActionLog.js";
import Item from "../models/Item.js";
import Release from "../models/Release.js";
import Return from "../models/Return.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import sendEmail from '../utils/sendEmail.js';
import { emailTemplates } from "../utils/emailTemplates.js";

// ✅ Create new item
export const addItem = async (req, res) => {
  try {
    const { name, category, quantity, measuringUnit, description } = req.body;

    if (!name || !category || !quantity || !measuringUnit) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // const existing = await Item.findOne({ name });
    // if (existing) return res.status(400).json({ message: "Item already exists" });

    const newItem = await Item.create({
      name,
      category,
      quantity,
      measuringUnit,
      description: description || "",
      addedBy: req.user._id,
    });

    await ActionLog.create({
      user: req.user._id,
      action: "add_item",
      details: { itemId: newItem._id, name },
    });

    await Notification.create({
      message: `New item added: ${name}`,
      item: newItem._id,
    });

    res.status(201).json({ message: "Item added successfully", item: newItem });
  } catch (error) {
    res.status(500).json({ message: "Failed to add item", error: error.message });
  }
};

// ✅ Get all items
export const getItems = async (req, res) => {
  try {
    const items = await Item.find({ isDeleted: false }).sort({ createdAt: -1 });
    //console.log("getItems -> items fetched:", items);  // DEBUG: log items array
    res.status(200).json({ items });
  } catch (error) {
    console.error("getItems error:", error);
    res.status(500).json({ message: "Failed to fetch items", error: error.message });
  }
};



// ✅ Get item by ID
export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("addedBy", "name email");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Fetch release logs linked to the item
    const releases = await Release.find({ item: item._id })
      .populate("releasedBy", "name email")
      .sort({ createdAt: -1 });

    // Fetch return logs linked to the item
    const returns = await Return.find({ item: item._id })
      .populate("processedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      item,
      releases,
      returns,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch item",
      error: error.message,
    });
  }
};


// ✅ Update item
export const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    Object.assign(item, req.body);
    await item.save();

    await ActionLog.create({
      user: req.user._id,
      action: "update_item",
      details: { itemId: item._id },
    });

    res.status(200).json({ message: "Item updated", item });
  } catch (error) {
    res.status(500).json({ message: "Failed to update item", error: error.message });
  }
};

// ✅ Delete item (soft delete)
export const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.deletedAt = new Date();
    item.deletedBy = req.user._id;
    item.isDeleted = true;
    item.currentStatus = "deleted";
    await item.save();

    await ActionLog.create({
      user: req.user._id,
      action: "delete_item",
      details: { itemId: item._id },
    });

    res.status(200).json({ message: "Item deleted (soft)" });
  } catch (error) {
    console.error("deleteItem error:", error);
    res.status(500).json({ message: "Failed to delete item", error: error.message });
  }
};

//release item


export const releaseItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      qtyReleased,
      releasedTo,
      category,
      reason,
      expectedReturnBy,
      remarks,
    } = req.body;

    console.log("Release payload:", req.body);

    // ✅ Validate item ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid item ID." });
    }

    // ✅ Validate auth
    const releasedBy = req.user?._id;
    if (!releasedBy) {
      return res.status(401).json({ message: "Unauthorized. User not found." });
    }

    // ✅ Validate required fields
    if (!qtyReleased || qtyReleased <= 0 || !releasedTo || !category || !reason) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Fetch item
    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found." });

    // ✅ Check stock availability
    if (item.quantity < qtyReleased) {
      return res.status(400).json({
        message: `Insufficient quantity. Only ${item.quantity} ${item.measuringUnit}(s) available.`,
      });
    }

    // ✅ Deduct quantity & update status
    item.quantity -= qtyReleased;
    if (item.quantity === 0) item.currentStatus = "out";
    await item.save();

    // ✅ Handle expectedReturnBy safely
    let expectedReturnDate = null;
    if (expectedReturnBy && !isNaN(Date.parse(expectedReturnBy)) && category !== "consumed") {
      expectedReturnDate = new Date(expectedReturnBy);
    }

    // ✅ Create release record
    const release = await Release.create({
      item: item._id,
      category,
      qtyReleased,
      releasedTo: releasedTo.trim(),
      releasedBy,
      reason: reason.trim(),
      isReturnable: ["repair", "refill", "replace", "borrow"].includes(category),
      expectedReturnBy: expectedReturnDate,
      remarks: remarks?.trim() || "",
    });

    // ✅ Fetch releasing user info
    const user = await User.findById(releasedBy).select("name email role");

    // ✅ Create notification
    const notif = await Notification.create({
      toUser: releasedBy,
      itemId: item._id,
      type: "release-item",
      message: `${qtyReleased} ${item.measuringUnit}(s) of "${item.name}" released to ${releasedTo} by ${user.name}. Category: ${category}`,
      meta: {
        userName: user.name,
        userEmail: user.email,
        itemName: item.name,
        category,
        qtyReleased,
        remainingQty: item.quantity,
        isReturnable: release.isReturnable,
        expectedReturnBy: release.expectedReturnBy,
      },
    });

    // ✅ Log action
    await ActionLog.create({
      user: releasedBy,
      action: "release_item",
      details: {
        itemId: item._id,
        releaseId: release._id,
        qtyReleased,
        releasedTo,
        category,
        reason,
        isReturnable: release.isReturnable,
        expectedReturnBy: release.expectedReturnBy,
        remarks: release.remarks,
      },
    });

    // ✅ Send emails safely
    const superAdmin = await User.findOne({ role: "superadmin" });
    const emailRecipients = [process.env.ADMIN_EMAIL, superAdmin?.email, user.email].filter(Boolean);

    for (const recipient of emailRecipients) {
      try {
        await  sendEmail({
          to: recipient,
          subject: `Item Released: ${item.name}`,
          html: emailTemplates.itemReleased({
            item: item.name,
            releasedTo,
            quantity: qtyReleased,
            measuringUnit: item.measuringUnit,
            releasedBy: user.name,
            category,
            reason,
            isReturnable: release.isReturnable,
            expectedReturnBy: release.expectedReturnBy,
            remarks: release.remarks,
          }),
        });
      } catch (err) {
        console.error(`❌ Email failed for ${recipient}:`, err.message);
      }
    }

    // ✅ Success response
    res.status(201).json({
      message: "Item released successfully.",
      release,
      notification: notif,
      remainingQuantity: item.quantity,
    });

  } catch (err) {
    console.error("❌ Error releasing item:", err);
    res.status(500).json({
      message: "Server error while releasing item.",
      error: err.message,
    });
  }
};