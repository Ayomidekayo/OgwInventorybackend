// backend/jobs/agendaWorker.js
import Agenda from "agenda";
import { Schedule, Reminder } from "../models/Schedule.js";
import Notification from "../models/Notification.js";
import sendEmail from "../utils/sendEmail.js";
import createSocketServer from "./socket.js";
import mongoose from "mongoose";

let agenda = null; // module-level agenda instance

/**
 * Initialize Agenda using an existing mongoose connection.
 * Also attaches socket.io using the provided httpServer.
 */
export async function initAgenda(mongooseConnection, httpServer) {
  if (!mongooseConnection) {
    throw new Error("initAgenda requires a mongoose.connection");
  }

  // Prevent double-initialization
  if (agenda) {
    console.log("Agenda already initialized");
    return agenda;
  }

  agenda = new Agenda({
    mongo: mongooseConnection.db,
    db: { collection: "agendaJobs" },
    processEvery: "30 seconds",
  });

  // attach socket.io (socket.js should return the io instance)
  const io = createSocketServer(httpServer);

  // Define job
  agenda.define(
    "send-schedule-reminder",
    { priority: "high", concurrency: 5 },
    async (job) => {
      const { reminderId } = job.attrs.data || {};
      if (!reminderId) return;

      try {
        const reminder = await Reminder.findById(reminderId).populate({
          path: "schedule",
          populate: [{ path: "item" }, { path: "requestedBy", select: "name email" }],
        });

        if (!reminder || reminder.sent) return;

        const schedule = reminder.schedule;
        if (!schedule) return;

        const user = schedule.requestedBy;
        const message = `Reminder: ${schedule.category} for ${schedule.item?.name || "item"} scheduled at ${schedule.scheduledDate}`;

        // create Notification
        await Notification.create({
          type: schedule.category,
          schedule: schedule._id,
          reminder: reminder._id,
          item: schedule.item?._id,
          message,
          recipient: user?._id,
          channel: user?.email ? "email" : "in-app",
        });

        // send email if user has an email
        if (user?.email) {
          try {
            await sendEmail(
              user.email,
              `Schedule Reminder: ${schedule.category}`,
              `<p>Hi ${user.name || ""},</p><p>${message}</p>`
            );
          } catch (err) {
            console.error("Email send error:", err);
          }
        }

        // Emit via socket (global for now; adapt to per-user rooms if needed)
        io.to("global").emit("reminder", {
          reminderId: reminder._id,
          scheduleId: schedule._id,
          title: schedule.category,
          message,
          scheduledDate: schedule.scheduledDate,
        });

        // Mark reminder as sent and update flags on schedule
        reminder.sent = true;
        await reminder.save();

        const now = new Date();
        const scheduledDate = new Date(schedule.scheduledDate);
        const dayBefore = new Date(scheduledDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        if (now.toDateString() === dayBefore.toDateString()) schedule.reminderSentDayBefore = true;
        if (now.toDateString() === scheduledDate.toDateString()) schedule.reminderSentOnDay = true;
        await schedule.save();
      } catch (err) {
        console.error("Error in send-schedule-reminder job:", err);
      }
    }
  );

  await agenda.start();
  console.log("Agenda started");

  // After starting, schedule pending reminders
  await rescheduleAllRemindersIntoAgenda();

  return agenda;
}

/**
 * Schedule a single reminder into Agenda.
 * Safe for controllers to call after initAgenda() has run.
 */
export async function scheduleReminder(reminderId, remindAt) {
  if (!agenda) {
    throw new Error("Agenda not initialized. Call initAgenda() before scheduling reminders.");
  }
  if (!reminderId || !remindAt) {
    throw new Error("scheduleReminder requires reminderId and remindAt");
  }

  // Cancel any job that might already exist for this reminderId to avoid duplicates
  await agenda.cancel({ "data.reminderId": reminderId.toString() });
  await agenda.schedule(new Date(remindAt), "send-schedule-reminder", { reminderId: reminderId.toString() });
}

/**
 * Reschedule all reminders from DB into Agenda (bulk).
 * Defensive: will throw if agenda is not initialized.
 */
export async function rescheduleAllRemindersIntoAgenda() {
  if (!agenda) {
    throw new Error("Agenda not initialized. Call initAgenda() before rescheduling reminders.");
  }

  const reminders = await Reminder.find({ sent: false, remindAt: { $gte: new Date(0) } });
  let count = 0;
  for (const r of reminders) {
    // Cancel existing agenda jobs for same reminderId (safety)
    await agenda.cancel({ "data.reminderId": r._id.toString() });
    await agenda.schedule(r.remindAt, "send-schedule-reminder", { reminderId: r._id.toString() });
    count++;
  }
  console.log(`Rescheduled ${count} reminders into Agenda`);
  return count;
}

/**
 * List agenda jobs for debugging
 */
export async function listAgendaJobs() {
  if (!agenda) {
    throw new Error("Agenda not initialized.");
  }
  const jobs = await agenda.jobs({});
  return jobs.map((j) => ({
    name: j.attrs.name,
    nextRunAt: j.attrs.nextRunAt,
    data: j.attrs.data,
    lastRunAt: j.attrs.lastRunAt,
    type: j.attrs.type,
    priority: j.attrs.priority,
  }));
}
