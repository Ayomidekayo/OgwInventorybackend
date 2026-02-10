import Agenda from "agenda";
import moment from "moment-timezone";
import { Reminder } from "../models/Schedule";
import Notification from "../models/Notification";

import Agenda from "agenda";
import moment from "moment-timezone";
import { Reminder, Schedule } from "../models/Schedule.js"; // ✅ import Schedule too
import Notification from "../models/Notification.js";

const TIMEZONE = "Africa/Lagos";
const mongoConnectionString = process.env.MONGO_URI;

const agenda = new Agenda({
  db: { address: mongoConnectionString, collection: "agendaJobs" },
  processEvery: "10 seconds", // faster checks for testing
});

// Define job: send reminder for schedule
agenda.define("send-schedule-reminder", async (job) => {
  try {
    const { reminderId } = job.attrs.data;

    const reminder = await Reminder.findById(reminderId).populate({
      path: "schedule",
      populate: { path: "item requestedBy" },
    });

    if (!reminder || reminder.sent) return;

    const schedule = reminder.schedule;
    if (!schedule) {
      console.warn("Schedule not found for reminder:", reminderId);
      return;
    }

    const itemName = schedule.item?.name || "Unknown item";
    const recipientId = schedule.requestedBy?._id;

    if (!recipientId) {
      console.warn("No recipient for schedule:", schedule._id);
      return;
    }

    await Notification.create({
      type: schedule.category,
      item: schedule.item?._id,
      recipient: recipientId,
      message: `Reminder: your scheduled ${schedule.category} for ${itemName} is on ${moment(schedule.scheduledDate).tz(TIMEZONE).format("YYYY-MM-DD HH:mm")}`,
    });

    reminder.sent = true;
    await reminder.save();

    console.log(`✅ Reminder sent for schedule ${schedule._id}`);
  } catch (err) {
    console.error("Error in send-schedule-reminder job:", err);
  }
});

// Helper to schedule a reminder
export const scheduleReminder = async (reminderId, date) => {
  if (date < new Date()) {
    console.warn("Cannot schedule reminder in the past:", reminderId, date);
    return;
  }
  console.log("📅 Scheduling reminder:", reminderId, date);
  await agenda.schedule(date, "send-schedule-reminder", { reminderId });
};

// Re-enqueue pending reminders (use on server start)
export const rescheduleAllRemindersIntoAgenda = async () => {
  const pending = await Reminder.find({ sent: false });
  for (const r of pending) {
    if (r.remindAt > new Date()) {
      await scheduleReminder(r._id, r.remindAt);
    }
  }
  console.log(`🔄 Re-enqueued ${pending.length} pending reminders`);
};

// Start Agenda
(async function startAgenda() {
  await agenda.start();
  console.log("✅ Agenda started");

  // Re-enqueue any pending reminders
  await rescheduleAllRemindersIntoAgenda();
})();

export default agenda;
