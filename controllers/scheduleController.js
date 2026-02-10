import mongoose from "mongoose";
import moment from "moment-timezone";

import { Schedule, Reminder } from "../models/Schedule.js";
import Notification from "../models/Notification.js";
import { scheduleReminder } from "../jobs/agenda.js";
import Item from "../models/Item.js";

const TIMEZONE = "Africa/Lagos";

// GET all schedules
// export const getSchedules = async (req, res) => {
//   try {
//     const schedules = await Schedule.find({})
//       .populate("item", "name")
//       .populate("requestedBy", "name email")
//       .sort({ scheduledDate: 1 });

//     return res.status(200).json({ schedules });
//   } catch (error) {
//     console.error("Error fetching schedules:", error);
//     return res.status(500).json({ message: "Failed to fetch schedules", error: error.message });
//   }
// };

// CREATE schedule + reminders
// CREATE schedule + reminders
// export const createSchedule = async (req, res) => {
//   try {
//     const { 
//       item, 
//       category, 
//       quantity, 
//       scheduledDate, 
//       expectedCompletionDate, 
//       remarks, 
//       willRelease, 
//       customReminderMinutes,   // ⬅️ offset in minutes
//       customReminderTime,      // ⬅️ absolute time
//       customReminderSeconds    // ⬅️ optional: offset in seconds for quick testing
//     } = req.body;

//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }
//     if (!item || !category || !quantity || !scheduledDate) {
//       return res.status(400).json({ success: false, message: "Missing required fields" });
//     }

//     // ✅ Resolve item: accept either ObjectId or name string
//     let itemId;
//     if (mongoose.Types.ObjectId.isValid(item)) {
//       itemId = item; // already an ObjectId
//     } else {
//       const itemDoc = await Item.findOne({ name: item });
//       if (!itemDoc) {
//         return res.status(400).json({ success: false, message: `Item '${item}' not found` });
//       }
//       itemId = itemDoc._id;
//     }

//     const returnable = ["repair", "refill", "change-part"].includes(category);

//     const schedule = await Schedule.create({
//       item: itemId,
//       requestedBy: userId,
//       category,
//       quantity,
//       scheduledDate: new Date(scheduledDate),
//       expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
//       status: "pending",
//       willRelease: !!willRelease,
//       isReturnable: returnable,
//       remarks,
//     });

//     const reminders = [];

//     // Standard reminders (09:00 one day before and on the day)
//     const oneDayBefore = moment(schedule.scheduledDate)
//       .tz(TIMEZONE)
//       .subtract(1, "day")
//       .hour(9)
//       .minute(0)
//       .second(0)
//       .toDate();

//     const onTheDay = moment(schedule.scheduledDate)
//       .tz(TIMEZONE)
//       .hour(9)
//       .minute(0)
//       .second(0)
//       .toDate();

//     if (oneDayBefore > new Date()) {
//       reminders.push({ schedule: schedule._id, remindAt: oneDayBefore });
//     }
//     if (onTheDay > new Date()) {
//       reminders.push({ schedule: schedule._id, remindAt: onTheDay });
//     }

//     // ✅ Custom offset in minutes
//     if (customReminderMinutes) {
//       const offsetReminder = moment().add(customReminderMinutes, "minutes").toDate();
//       reminders.push({ schedule: schedule._id, remindAt: offsetReminder });
//     }

//     // ✅ Custom offset in seconds (for quick testing)
//     if (customReminderSeconds) {
//       const offsetReminder = moment().add(customReminderSeconds, "seconds").toDate();
//       reminders.push({ schedule: schedule._id, remindAt: offsetReminder });
//     }

//     // ✅ Custom absolute time
//     if (customReminderTime) {
//       const customTimeReminder = moment(customReminderTime).tz(TIMEZONE).toDate();
//       if (customTimeReminder > new Date()) {
//         reminders.push({ schedule: schedule._id, remindAt: customTimeReminder });
//       }
//     }

//     // Save reminders
//     const createdReminders = await Reminder.insertMany(reminders);

//     // Schedule reminders in Agenda
//     for (const r of createdReminders) {
//       await scheduleReminder(r._id, r.remindAt);
//     }

//     return res.status(201).json({ 
//       success: true, 
//       schedule, 
//       reminders: createdReminders 
//     });
//   } catch (error) {
//     console.error("Error creating schedule:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// APPROVE schedule + re-enqueue reminders
export const approveSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });

    schedule.status = "approved";
    await schedule.save();

    // Re-enqueue pending reminders
    const pendingReminders = await Reminder.find({ schedule: schedule._id, sent: false });
    for (const r of pendingReminders) {
      try {
        if (r.remindAt > new Date()) {
          await scheduleReminder(r._id, r.remindAt, async () => {
            const scheduleDoc = await Schedule.findById(r.schedule).populate("item requestedBy");
            if (!scheduleDoc) return;
            await Notification.create({
              type: scheduleDoc.category,
              item: scheduleDoc.item._id,
              recipient: scheduleDoc.requestedBy._id,
              message: `Reminder: your scheduled ${scheduleDoc.category} for item ${scheduleDoc.item.name} is on ${moment(scheduleDoc.scheduledDate).format("YYYY-MM-DD HH:mm")}`,
            });
            r.sent = true;
            await r.save();
          });
        }
      } catch (err) {
        console.warn("Failed to re-schedule reminder:", err.message || err);
      }
    }

    return res.json({ success: true, schedule });
  } catch (error) {
    console.error("Error approving schedule:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



export const createSchedule = async (req, res) => {
  try {
    const { 
      item, 
      category, 
      quantity, 
      scheduledDate, 
      expectedCompletionDate, 
      remarks, 
      willRelease, 
      customReminderMinutes,   
      customReminderTime,      
      customReminderSeconds    
    } = req.body;

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!item || !category || !quantity || !scheduledDate) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Resolve item
    let itemId;
    if (mongoose.Types.ObjectId.isValid(item)) {
      itemId = item;
    } else {
      const itemDoc = await Item.findOne({ name: item });
      if (!itemDoc) {
        return res.status(400).json({ success: false, message: `Item '${item}' not found` });
      }
      itemId = itemDoc._id;
    }

    const returnable = ["repair", "refill", "change-part"].includes(category);

    const schedule = await Schedule.create({
      item: itemId,
      requestedBy: userId,
      category,
      quantity,
      scheduledDate: new Date(scheduledDate),
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
      status: "pending",
      willRelease: !!willRelease,
      isReturnable: returnable,
      remarks,
      notificationSent: false, // ✅ track notification status
    });

    const reminders = [];
    const now = new Date();

    // Standard reminders
    const oneDayBefore = moment(schedule.scheduledDate).tz(TIMEZONE).subtract(1, "day").hour(9).minute(0).second(0).toDate();
    const onTheDay = moment(schedule.scheduledDate).tz(TIMEZONE).hour(9).minute(0).second(0).toDate();

    if (oneDayBefore > now) reminders.push({ schedule: schedule._id, remindAt: oneDayBefore });
    if (onTheDay > now) reminders.push({ schedule: schedule._id, remindAt: onTheDay });

    // Custom reminders
    if (customReminderMinutes) {
      reminders.push({ schedule: schedule._id, remindAt: moment().add(customReminderMinutes, "minutes").toDate() });
    }
    if (customReminderSeconds) {
      reminders.push({ schedule: schedule._id, remindAt: moment().add(customReminderSeconds, "seconds").toDate() });
    }
    if (customReminderTime) {
      const customTimeReminder = moment(customReminderTime).tz(TIMEZONE).toDate();
      if (customTimeReminder > now) reminders.push({ schedule: schedule._id, remindAt: customTimeReminder });
    }

    const createdReminders = await Reminder.insertMany(reminders);

    // Schedule reminders in Agenda
    for (const r of createdReminders) {
      await scheduleReminder(r._id, r.remindAt);
    }

    return res.status(201).json({ 
      success: true, 
      schedule, 
      reminders: createdReminders 
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};
export const getSchedules = async (req, res) => {
  try {
    const now = new Date();

    const schedules = await Schedule.find({
      status: { $ne: "done" }, // exclude completed
      $or: [
        { expectedCompletionDate: { $gte: now } }, // not expired
        { expectedCompletionDate: { $exists: false } }, // no expected date
      ],
    })
      .populate("item", "name")
      .populate("requestedBy", "name email")
      .sort({ scheduledDate: 1 });

    return res.status(200).json({ schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return res.status(500).json({
      message: "Failed to fetch schedules",
      error: error.message,
    });
  }
};
