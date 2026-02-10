import mongoose from "mongoose";
import Item from "../models/Item.js";
import Return from "../models/Return.js";
import Release from "../models/Release.js";
import Notification from "../models/Notification.js";
import ActionLog from "../models/ActionLog.js";
import { emailTemplates } from "../utils/emailTemplates.js";
import sendEmail from "../utils/sendEmail.js";
import User from "../models/User.js";
export const addReturn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const {
      itemId,
      releaseId,
      returnedBy,
      returnedByEmail,
      quantityReturned,
      condition,
      remarks,
      processedBy
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid item id" });
    }
    if (!quantityReturned || quantityReturned <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid quantity returned" });
    }

    const item = await Item.findById(itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Item not found" });
    }

    const [returnRecord] = await Return.create([{
      item: item._id,
      release: releaseId || null,
      returnedBy,
      returnedByEmail,
      quantityReturned: Number(quantityReturned),
      condition: condition || "good",
      remarks: remarks || "",
      processedBy: processedBy || req.user._id
    }], { session });

    item.quantity = (item.quantity || 0) + Number(quantityReturned);
    if (item.quantity > 0) item.currentStatus = "in";
    await item.save({ session });

    if (releaseId && mongoose.Types.ObjectId.isValid(releaseId)) {
      const release = await Release.findById(releaseId).session(session);
      if (release) {
        release.qtyReturned = (release.qtyReturned || 0) + Number(quantityReturned);
        release.returnStatus =
          (release.qtyReturned >= release.qtyReleased)
            ? "fully returned"
            : "partially returned";
        await release.save({ session });
      }
    }

    await Notification.create([{
      message: `${quantityReturned} ${item.measuringUnit}(s) of ${item.name} returned by ${returnedBy}`,
      item: item._id
    }], { session });

    await ActionLog.create([{
      user: processedBy || req.user._id,
      action: "return_item",
      details: { itemId: item._id, returnId: returnRecord._id, quantityReturned: Number(quantityReturned) }
    }], { session });

    await session.commitTransaction();

    // End session before sending emails
    session.endSession();

    // Now send emails outside of transaction
    const releaseDoc = releaseId
      ? await Release.findById(releaseId).populate('releasedBy', 'name email')
      : null;

    const recipientList = [];

    // Email to person who returned
    recipientList.push({
      to: returnedByEmail,
      subject: `Return recorded for ${item.name}`,
      html: emailTemplates.itemReturned({
        item: item.name,
        returnedBy,
        quantity: Number(quantityReturned),
        condition,
        remarks,
        processedBy: processedBy || req.user.name,
        status: "Return recorded"
      })
    });

    // Email to person who released (if available)
    if (releaseDoc && releaseDoc.releasedBy && releaseDoc.releasedBy.email) {
      recipientList.push({
        to: releaseDoc.releasedBy.email,
        subject: `Item returned: ${item.name}`,
        html: emailTemplates.itemReturned({
          item: item.name,
          returnedBy,
          quantity: Number(quantityReturned),
          condition,
          remarks,
          processedBy: processedBy || req.user.name,
          status: "Return recorded"
        })
      });
    }

    await Promise.all(recipientList.map(emailData => sendEmail(emailData)));

    return res.status(201).json({
      message: "Return recorded",
      returnRecord,
      item
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_abortErr) {
      console.error("Abort transaction failed:", _abortErr);
    }
    session.endSession();
    console.error("addReturn error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ CREATE RETURN RECORD
// export const createReturn = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     const {
//       releaseId,
//       itemId,
//       quantityReturned,
//       returnedBy,
//       returnedByEmail,
//       condition,
//       remarks,
//     } = req.body;

//     const processedBy = req.user._id;

//     if (!mongoose.Types.ObjectId.isValid(itemId) || !mongoose.Types.ObjectId.isValid(releaseId)) {
//       return res.status(400).json({ message: "Invalid release or item ID" });
//     }

//     if (!quantityReturned || quantityReturned <= 0)
//       return res.status(400).json({ message: "Quantity returned must be greater than zero." });

//     session.startTransaction();

//     // ✅ 1. Find release record
//     const release = await Release.findById(releaseId).session(session);
//     if (!release) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Release not found" });
//     }

//     // ✅ 2. Find item record
//     const item = await Item.findById(itemId).session(session);
//     if (!item) {
//       await session.abortTransaction();
//       return res.status(404).json({ message: "Item not found" });
//     }

//     // ✅ 3. Create Return Record
//     const [ret] = await Return.create(
//       [
//         {
//           item: item._id,
//           returnedBy,
//           returnedByEmail,
//           quantityReturned,
//           expectedReturnBy: release.expectedReturnBy || null,
//           condition: condition || "good",
//           remarks: remarks || "",
//           processedBy,
//           status: "processed",
//         },
//       ],
//       { session }
//     );

//     // ✅ 4. Update Item Stock
//     item.quantity += quantityReturned;
//     item.currentStatus = "in";
//     await item.save({ session });

//     // ✅ 5. Update Release Return Status
//     const totalReturned = await Return.aggregate([
//       { $match: { item: item._id } },
//       { $group: { _id: null, totalQty: { $sum: "$quantityReturned" } } },
//     ]);

//     const totalQtyReturned = totalReturned.length ? totalReturned[0].totalQty : 0;
//     const expectedQty = release.qtyReleased;

//     if (totalQtyReturned >= expectedQty) {
//       release.returnStatus = "fully returned";
//     } else if (totalQtyReturned > 0 && totalQtyReturned < expectedQty) {
//       release.returnStatus = "partially returned";
//     } else {
//       release.returnStatus = "pending";
//     }

//     release.qtyReturned = totalQtyReturned;
//     await release.save({ session });

//     // ✅ 6. Create Notification
//     await Notification.create(
//       [
//         {
//           message: `${quantityReturned} ${item.measuringUnit}(s) of "${item.name}" returned by ${returnedBy}`,
//           item: item._id,
//         },
//       ],
//       { session }
//     );

//     // ✅ 7. Log the Action
//     await ActionLog.create(
//       [
//         {
//           user: processedBy,
//           action: "return_item",
//           details: {
//             itemId: item._id,
//             releaseId: release._id,
//             quantityReturned,
//             returnedBy,
//           },
//         },
//       ],
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     res.status(201).json({
//       message: "Return recorded successfully",
//       return: ret,
//       updatedItemQuantity: item.quantity,
//       releaseReturnStatus: release.returnStatus,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error(error);
//     res.status(500).json({ message: "Failed to process return", error: error.message });
//   }
// };


export const createReturnForRelease = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let retRecord, updatedItem, updatedRelease;

    await session.withTransaction(async () => {
      const {
        releaseId,
        itemId,
        quantityReturned,
        returnedBy,
        returnedByEmail,
        condition,
        remarks,
      } = req.body;
      const processedBy = req.user._id;

      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(itemId) || !mongoose.Types.ObjectId.isValid(releaseId)) {
        throw new Error("Invalid release or item ID");
      }

      // Convert and validate quantityReturned
      const qtyReturned = Number(quantityReturned);
      if (isNaN(qtyReturned) || qtyReturned <= 0) {
        throw new Error("Quantity returned must be a valid number greater than zero.");
      }

      // Fetch release and item
      const [release, item] = await Promise.all([
        Release.findById(releaseId).session(session),
        Item.findById(itemId).session(session),
      ]);
      if (!release) throw new Error("Release not found");
      if (!item) throw new Error("Item not found");

      // Validate that you're not returning more than what's remaining
      const remaining = (release.qtyRemaining != null)
        ? release.qtyRemaining
        : (release.qtyReleased - (release.qtyReturned || 0));

      if (qtyReturned > remaining) {
        throw new Error(`Cannot return more than remaining quantity (${remaining}).`);
      }

      // Create return record
      [retRecord] = await Return.create(
        [
          {
            item: item._id,
            release: release._id,
            returnedBy,
            returnedByEmail,
            quantityReturned: qtyReturned,
            expectedReturnBy: release.expectedReturnBy ?? null,
            condition: condition || "good",
            remarks: remarks || "",
            processedBy,
            status: "processed",
          },
        ],
        { session }
      );

      // Update item quantity (stock back to inventory)
      item.quantity += qtyReturned;
      item.currentStatus = "in";
      await item.save({ session });
      updatedItem = item;

      release.qtyReturned = (release.qtyReturned || 0) + qtyReturned;

// Calculate remaining
release.qtyRemaining = release.qtyReleased - release.qtyReturned;

// Determine return status
if (release.qtyRemaining > 0 && release.qtyReturned > 0) {
  release.returnStatus = "partially returned";
  release.archived = false;
} else if (release.qtyRemaining <= 0) {
  release.returnStatus = "fully returned";
  release.archived = true;
} else {
  release.returnStatus = "pending";
  release.archived = false;
}
      // Because of pre-save hook, qtyRemaining will be recalculated
      await release.save({ session });
      updatedRelease = release;

      // Notification
      await Notification.create(
        [
          {
            message: `${qtyReturned} ${item.measuringUnit}(s) of "${item.name}" returned by ${returnedBy}`,
            item: item._id,
          },
        ],
        { session }
      );

      // Action log
      await ActionLog.create(
        [
          {
            user: processedBy,
            action: "return_item",
            details: {
              itemId: item._id,
              releaseId: release._id,
              quantityReturned: qtyReturned,
              returnedBy,
            },
          },
        ],
        { session }
      );
    });

    // After transaction: send emails
    const superadmin = await User.findOne({ role: "superadmin" });
    const emailPromises = [];

    if (superadmin?.email) {
      emailPromises.push(
        sendEmail({
          to: superadmin.email,
          subject: `Item Returned: ${updatedItem.name}`,
          html: emailTemplates.itemReturned({
            item: updatedItem.name,
            returnedBy: retRecord.returnedBy,
            quantity: retRecord.quantityReturned,
            condition: retRecord.condition,
            remarks: retRecord.remarks,
            processedBy: req.user.name,
            status: "Return recorded",
          }),
        })
      );
    }

    if (retRecord.returnedByEmail) {
      emailPromises.push(
        sendEmail({
          to: retRecord.returnedByEmail,
          subject: `Return Recorded: ${updatedItem.name}`,
          html: emailTemplates.itemReturned({
            item: updatedItem.name,
            returnedBy: retRecord.returnedBy,
            quantity: retRecord.quantityReturned,
            condition: retRecord.condition,
            remarks: retRecord.remarks,
            processedBy: req.user.name,
            status: "Return recorded",
          }),
        })
      );
    }

    await Promise.all(emailPromises);

    // Respond with all useful data
    res.status(201).json({
      message: "Return recorded successfully",
      return: retRecord,
      updatedItemQuantity: updatedItem.quantity,
      release: {
        qtyReleased: updatedRelease.qtyReleased,
        qtyReturned: updatedRelease.qtyReturned,
        qtyRemaining: updatedRelease.qtyRemaining,
        returnStatus: updatedRelease.returnStatus,
        archived: updatedRelease.archived,
      },
    });
  } catch (error) {
    console.error("Error in createReturnForRelease:", error);
    res.status(500).json({ message: error.message || "Failed to process return" });
  } finally {
    session.endSession();
  }
};


// ✅ GET ALL RETURNS
export const getAllReturns = async (req, res) => {
  try {
    const returns = await Return.find()
      .populate("item", "name category measuringUnit")
      .populate("processedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: returns.length, returns });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch returns", error: error.message });
  }
};

// ✅ GET SINGLE RETURN
export const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const ret = await Return.findById(id)
      .populate("item", "name category measuringUnit")
      .populate("processedBy", "name email role");

    if (!ret) return res.status(404).json({ message: "Return record not found" });

    res.status(200).json(ret);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return record", error: error.message });
  }
};
// GET a single return record (or release with return) by release ID
export const getReturnByReleaseId = async (req, res) => {
  const { releaseId } = req.params;
  console.log("getReturnByReleaseId called with releaseId:", releaseId);

  if (!mongoose.Types.ObjectId.isValid(releaseId)) {
    return res.status(400).json({ message: "Invalid release ID format" });
  }

  try {
    const returnRecords = await Return.find({ release: releaseId })
      .populate({
        path: "release",
        populate: {
          path: "item",
          select: "name measuringUnit category quantity",
        },
      })
      .populate("processedBy", "name email")
      .exec();

    if (!returnRecords || returnRecords.length === 0) {
      return res.status(404).json({ message: "No return records found for this release" });
    }

    return res.status(200).json({ data: returnRecords });
  } catch (error) {
    console.error("Error fetching return records:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch return records", error: error.message });
  }
};

//GET Overdue Returns

export const getOverdueReturns = async (req, res) => {
  try {
    const today = new Date();
    const overdueReturns = await Return.find({
      expectedReturnBy: { $lt: today },
      status: { $ne: "archived" },
    }).populate("item", "name category measuringUnit");

    res.status(200).json({
      count: overdueReturns.length,
      overdueReturns,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching overdue returns", error: error.message });
  }
};

// In controllers/reportController.js (or wherever your report controllers are)

/**
 * Return aggregated data for chart: by item category, sums of released, returned, overdue.
 */

