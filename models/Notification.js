import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
  type: String,
  enum: ["repair", "refill", "replace", "borrow", "general", "release-item"],
  default: "general",
},

    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    message: { type: String, required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sentAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    date:{type:Date, default:Date.now},
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
