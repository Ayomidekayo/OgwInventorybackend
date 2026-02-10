import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["repair", "refill", "replace", "change-part"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    scheduledDate: { type: Date, required: true },
    expectedCompletionDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "approved", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    willRelease: { type: Boolean, default: false },
    isReturnable: { type: Boolean, default: false },
    remarks: { type: String, trim: true, default: "" },

    // ✅ New field to track whether a notification has been sent
    notificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const reminderSchema = new mongoose.Schema(
  {
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true },
    remindAt: { type: Date, required: true },
    sent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Schedule = mongoose.model("Schedule", scheduleSchema);
const Reminder = mongoose.model("Reminder", reminderSchema);

export { Schedule, Reminder };
