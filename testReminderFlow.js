import mongoose from "mongoose";
import moment from "moment-timezone";

import { Schedule, Reminder } from "./models/Schedule.js";
import Notification from "./models/Notification.js";

import { scheduleReminder } from "./jobs/agenda.js";

const TIMEZONE = "Africa/Lagos";
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
console.log("✅ MongoDB connected");

// 1. Create test schedule
const testSchedule = await Schedule.create({
  item: new mongoose.Types.ObjectId(), // dummy item
  requestedBy: new mongoose.Types.ObjectId(), // dummy user
  category: "repair",
  quantity: 1,
  scheduledDate: new Date(),
  status: "approved",
  willRelease: false,
  isReturnable: true,
  remarks: "Test schedule",
});

console.log("✅ Test schedule created:", testSchedule._id);

// 2. Create reminders 1 & 2 minutes from now
const now = moment().tz(TIMEZONE);

const remindersData = [
  { schedule: testSchedule._id, remindAt: now.clone().add(1, "minute").toDate() },
  { schedule: testSchedule._id, remindAt: now.clone().add(2, "minute").toDate() },
];

const createdReminders = await Reminder.insertMany(remindersData);
console.log("✅ Test reminders created:", createdReminders.map(r => r._id));

// 3. Schedule reminders in Agenda
for (const r of createdReminders) {
  await scheduleReminder(r._id, r.remindAt);
  console.log(`Scheduled reminder ${r._id} for ${r.remindAt}`);
}

// 4. Listen for executed reminders via Notification collection
console.log("⏳ Waiting for reminders to trigger...");

const checkNotifications = setInterval(async () => {
  const notifications = await Notification.find({ recipient: testSchedule.requestedBy });
  if (notifications.length > 0) {
    console.log("✅ Notifications created:", notifications.map(n => ({ id: n._id, message: n.message })));
  }
}, 1000);

// Stop after 3 minutes
setTimeout(() => {
  clearInterval(checkNotifications);
  console.log("⏹ Test complete");
  process.exit(0);
}, 3 * 60 * 1000);
