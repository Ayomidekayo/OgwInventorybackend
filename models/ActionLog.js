import mongoose from "mongoose";

const actionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // e.g., 'add_item', 'release_item', 'return_item', 'delete_item'
  details: { type: mongoose.Schema.Types.Mixed }, // free-form object containing relevant ids, names, qty
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("ActionLog", actionLogSchema);
