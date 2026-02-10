import mongoose from "mongoose";
import Item from "../models/Item.js";
import Release from "../models/Release.js";         
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import ActionLog from "../models/ActionLog.js";
import Return from "../models/Return.js";

// export const createReleaseItem = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     const { itemId, qtyReleased, releasedTo, category, reason, expectedReturnBy } = req.body;
//     const releasedBy = req.user._id;

//     if (!mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ message: "Invalid item id" });
//     if (!qtyReleased || qtyReleased <= 0 || !releasedTo || !category) {
//       return res.status(400).json({ message: "qtyReleased, releasedTo and category are required." });
//     }

//     // categories that imply returnable
//     const returnableCategories = ["repair", "refill", "replace", "borrow"];

//     session.startTransaction();
//     const item = await Item.findById(itemId).session(session);
//     if (!item) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Item not found" });
//     }

//     if (item.quantity < qtyReleased) {
//       await session.abortTransaction();
//       return res.status(400).json({ message: `Insufficient stock. Only ${item.quantity} available.` });
//     }

//     // Deduct stock
//     item.quantity -= qtyReleased;
//     if (item.quantity === 0) item.currentStatus = "out";
//     await item.save({ session });

//     // Create release record
//     const release = await Release.create([{
//       item: item._id,
//       qtyReleased,
//       releasedTo,
//       releasedBy,
//       category,
//       reason: reason || "",
//       expectedReturnBy: expectedReturnBy || null,
//       isReturnable: returnableCategories.includes(category),
//       approvalStatus: req.user.role === "superadmin" ? "approved" : "pending"
//     }], { session });

//     // update item returns/metadata not necessary yet but could push release id to item if desired

//     // Notification & ActionLog
//     const user = await User.findById(releasedBy).session(session);
//     await Notification.create([{
//       message: `${qtyReleased} ${item.measuringUnit}(s) of "${item.name}" released to ${releasedTo}`,
//       item: item._id,
//     }], { session });

//     await ActionLog.create([{
//       user: releasedBy,
//       action: "release_item",
//       details: { itemId: item._id, releaseId: release[0]._id, qtyReleased, releasedTo }
//     }], { session });

//     // optionally email important parties
//     const adminEmails = [process.env.ADMIN_EMAIL].filter(Boolean);
//     for (const to of adminEmails) {
//       await sendEmail({
//         to,
//         subject: `Item released: ${item.name}`,
//         html: `<p>${user.name} released ${qtyReleased} ${item.measuringUnit}(s) of ${item.name} to ${releasedTo}.</p>`
//       });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     res.status(201).json({ message: "Item released", release: release[0], remainingQuantity: item.quantity });
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error(err);
//     res.status(500).json({ message: "Server error releasing item", error: err.message });
//   }
// };


// ✅ CREATE A NEW RELEASE
export const createReleaseItem = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { itemId, qtyReleased, releasedTo, category, reason, expectedReturnBy } = req.body;
    const releasedBy = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid item ID" });
    }

    if (!qtyReleased || qtyReleased <= 0 || !releasedTo || !category) {
      await session.abortTransaction();
      return res.status(400).json({ message: "qtyReleased, releasedTo, and category are required." });
    }

    const returnableCategories = ["repair", "refill", "replace", "borrow"];

    const item = await Item.findById(itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.quantity < qtyReleased) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient stock. Only ${item.quantity} available.`,
      });
    }

    item.quantity -= qtyReleased;
    if (item.quantity === 0) item.currentStatus = "out";
    await item.save({ session });

    const [release] = await Release.create(
      [
        {
          item: item._id,
          qtyReleased,
          releasedTo,
          releasedBy,
          category,
          reason: reason || "",
          expectedReturnBy: expectedReturnBy || null,
          approvalStatus: req.user.role === "superadmin" ? "approved" : "pending",
        },
      ],
      { session }
    );

    // if (returnableCategories.includes(category)) {
    //   await Return.create(
    //     [
    //       {
    //         release: release._id,
    //         item: item._id,
    //         qtyExpected: qtyReleased,
    //         qtyReturned: 0,
    //         status: "pending",
    //       },
    //     ],
    //     { session }
    //   );
    // }

    const user = await User.findById(releasedBy).session(session);
    await Notification.create(
      [
        {
          message: `${qtyReleased} ${item.measuringUnit}(s) of "${item.name}" released to ${releasedTo}`,
          item: item._id,
        },
      ],
      { session }
    );

    await ActionLog.create(
      [
        {
          user: releasedBy,
          action: "release_item",
          details: {
            itemId: item._id,
            releaseId: release._id,
            qtyReleased,
            releasedTo,
          },
        },
      ],
      { session }
    );

    const adminEmails = [process.env.ADMIN_EMAIL].filter(Boolean);
    for (const to of adminEmails) {
      await sendEmail({
        to,
        subject: `Item released: ${item.name}`,
        html: `<p>${user.name} released ${qtyReleased} ${item.measuringUnit}(s) of ${item.name} to ${releasedTo}.</p>`,
      });
    }

    await session.commitTransaction();

    return res.status(201).json({
      message: "Item released successfully",
      release,
      remainingQuantity: item.quantity,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    return res.status(500).json({ message: "Error releasing item", error: error.message });
  } finally {
    session.endSession();
  }
};


// ✅ GET ALL RELEASES
export const getAllReleasedItems = async (req, res) => {
  try {
    const releases = await Release.find()
      .populate("item", "name measuringUnit category quantity")
      .populate("releasedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: releases.length,
      data: releases,
    });
  } catch (error) {
    console.error("❌ Error fetching releases:", error);
    return res.status(500).json({
      message: "Failed to fetch releases",
      error: error.message,
    });
  }
};



// ✅ GET SINGLE RELEASE DETAIL
export const getSingleReleasedItem = async (req, res) => {
  try {
    const { id } = req.params;

    const release = await Release.findById(id)
      .populate("item", "name category measuringUnit quantity")
      .populate("releasedBy", "name email role")
      .lean();

    if (!release) return res.status(404).json({ message: "No Release record for this  item" });

    res.status(200).json(release);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching release", error: error.message });
  }
};

// ✅ UPDATE APPROVAL STATUS
export const updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!["approved", "cancelled", "pending"].includes(approvalStatus)) {
      return res.status(400).json({ message: "Invalid approval status" });
    }

    const release = await Release.findByIdAndUpdate(
      id,
      { approvalStatus },
      { new: true }
    );

    if (!release) return res.status(404).json({ message: "Release not found" });

    res.status(200).json({ message: "Status updated successfully", release });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update approval status", error: error.message });
  }
};

// controllers/releaseController.js
