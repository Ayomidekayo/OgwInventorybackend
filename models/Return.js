import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    release: { type: mongoose.Schema.Types.ObjectId, ref: "Release" },
    returnedBy: { type: String, required: true },
    returnedByEmail: { type: String, trim: true },
    quantityReturned: { type: Number, required: true },
    dateReturned: { type: Date, default: Date.now },
    expectedReturnBy: { type: Date },
    condition: {
      type: String,
      enum: ["good", "damaged", "expired", "lost", "other"],
      default: "good",
    },
    remarks: { type: String, trim: true, default: "" },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["processed", "pending_review", "archived"],
      default: "processed",
    },
    isOverdue: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Check overdue status before save
returnSchema.pre("save", function (next) {
  if (this.expectedReturnBy && new Date() > this.expectedReturnBy) {
    this.isOverdue = true;
  }
  next();
});

export default mongoose.model("Return", returnSchema);
