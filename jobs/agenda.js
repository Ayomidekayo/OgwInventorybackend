import Agenda from "agenda";
import moment from "moment-timezone";
import { Reminder } from "../models/Schedule.js";
import Notification from "../models/Notification.js";

const TIMEZONE = "Africa/Lagos";
const mongoConnectionString = process.env.MONGO_URI;

const agenda = new Agenda({
  db: { address: mongoConnectionString, collection: "agendaJobs" },
  processEvery: "1 minute",
  // optionally set a default lock lifetime (ms). Default is 10 minutes. :contentReference[oaicite:0]{index=0}
  defaultLockLifetime: 1000 * 60 * 5, // e.g. 5 minutes
});

// Add event listeners for better debugging
agenda.on("start", (job) => {
  console.log("[Agenda] Job started:", job.attrs.name, job.attrs.data, "nextRunAt:", job.attrs.nextRunAt);
});
agenda.on("complete", (job) => {
  console.log("[Agenda] Job completed:", job.attrs.name, job.attrs._id);
});
agenda.on("success:send-schedule-reminder", (job) => {
  console.log("[Agenda] send-schedule-reminder SUCCESS for reminderId:", job.attrs.data.reminderId);
});
agenda.on("fail:send-schedule-reminder", (err, job) => {
  console.error("[Agenda] send-schedule-reminder FAILED", job.attrs.data, err);
});
agenda.on("error", (err) => {
  console.error("[Agenda] Error in Agenda:", err);
});

// Define job with explicit lockLifetime
// agenda.define(
//   "send-schedule-reminder",
//   { lockLifetime: 1000 * 60 * 10 }, // 10 minutes for this job (you can tune)
//   async (job) => {
//     try {
//       const { reminderId } = job.attrs.data;
//       console.log(`[Job] Running reminder job for id = ${reminderId}`);

//       const reminder = await Reminder.findById(reminderId).populate({
//         path: "schedule",
//         populate: { path: "item requestedBy" },
//       });

//       if (!reminder) {
//         console.warn(`[Job] Reminder not found: ${reminderId}`);
//         return;
//       }

//       if (reminder.sent) {
//         console.log(`[Job] Reminder already sent, skipping: ${reminderId}`);
//         return;
//       }

//       const schedule = reminder.schedule;
//       if (!schedule) {
//         console.warn(`[Job] No schedule for reminder: ${reminderId}`);
//         return;
//       }

//       // Create notification
//       const msg = `Reminder: your scheduled ${schedule.category} for item ${schedule.item.name} is on ${moment(schedule.scheduledDate).tz(TIMEZONE).format("YYYY-MM-DD HH:mm")}`;
//       const notification = await Notification.create({
//         type: schedule.category,
//         item: schedule.item._id,
//         recipient: schedule.requestedBy._id,
//         message: msg,
//       });

//       console.log(`[Job] Notification created:`, notification._id);

//       // Mark reminder as sent
//       reminder.sent = true;
//       await reminder.save();
//       console.log(`[Job] Reminder marked as sent for schedule ${schedule._id}`);
//     } catch (err) {
//       console.error("[Job] Error in send-schedule-reminder job:", err);
//       throw err; // rethrow so Agenda can mark failure if needed
//     }
//   }
// );

agenda.define(
  "send-schedule-reminder",
  { lockLifetime: 1000 * 60 * 10 }, // 10 minutes
  async (job) => {
    try {
      const { reminderId } = job.attrs.data;
      console.log(`[Job] Running reminder job for id = ${reminderId}`);

      const reminder = await Reminder.findById(reminderId).populate({
        path: "schedule",
        populate: { path: "item requestedBy" },
      });

      if (!reminder) {
        console.warn(`[Job] Reminder not found: ${reminderId}`);
        return;
      }

      if (reminder.sent) {
        console.log(`[Job] Reminder already sent, skipping: ${reminderId}`);
        return;
      }

      const schedule = reminder.schedule;
      if (!schedule) {
        console.warn(`[Job] No schedule for reminder: ${reminderId}`);
        return;
      }

      // Create notification
      const msg = `Reminder: your scheduled ${schedule.category} for item ${schedule.item.name} is on ${moment(schedule.scheduledDate).tz(TIMEZONE).format("YYYY-MM-DD HH:mm")}`;
      const notification = await Notification.create({
        type: schedule.category,
        item: schedule.item._id,
        recipient: schedule.requestedBy._id,
        message: msg,
      });

      console.log(`[Job] Notification created:`, notification._id);

      // Mark reminder as sent
      reminder.sent = true;
      await reminder.save();

      // ✅ Update schedule to reflect notification sent
      schedule.notificationSent = true;
      await schedule.save();

      console.log(`[Job] Reminder marked as sent and schedule updated: ${schedule._id}`);
    } catch (err) {
      console.error("[Job] Error in send-schedule-reminder job:", err);
      throw err; // rethrow so Agenda can mark failure
    }
  }
);

// Helper to schedule a reminder
export const scheduleReminder = async (reminderId, date) => {
  console.log("[Scheduler] Request to schedule reminder", reminderId, "at", date, "now:", new Date());

  if (date < new Date()) {
    console.warn("[Scheduler] Cannot schedule reminder in the past:", reminderId, date);
    return;
  }

  try {
    const job = await agenda.schedule(date, "send-schedule-reminder", { reminderId });
    console.log("[Scheduler] Scheduled job:", job.attrs._id, "to run at", job.attrs.nextRunAt);
  } catch (err) {
    console.error("[Scheduler] Failed to schedule reminder", reminderId, err);
  }
};

// Re-enqueue pending reminders on server start
export const rescheduleAllRemindersIntoAgenda = async () => {
  const pending = await Reminder.find({ sent: false });
  console.log("[Startup] Re-enqueueing pending reminders count:", pending.length);

  for (const r of pending) {
    try {
      await scheduleReminder(r._id, r.remindAt);
    } catch (err) {
      console.error("[Startup] Error re-scheduling reminder", r._id, err);
    }
  }
};

// Start Agenda
(async function startAgenda() {
  try {
    await agenda.start();
    console.log("✅ Agenda started");

    // Re-enqueue any pending reminders
    await rescheduleAllRemindersIntoAgenda();
  } catch (err) {
    console.error("Failed to start Agenda", err);
    process.exit(1);
  }
})();

// Graceful shutdown (unlock jobs on stop)
process.on("SIGTERM", async () => {
  console.log("SIGTERM received: stopping Agenda...");
  await agenda.stop();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("SIGINT received: stopping Agenda...");
  await agenda.stop();
  process.exit(0);
});

export default agenda;
