import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
   
     month: { type: String, required: true }, // "11"
    year: { type: String, required: true },  // "2025
    totalItems: { type: Number, default: 0 },
    totalReleased: { type: Number, default: 0 },
    totalReturned: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
