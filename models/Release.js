import mongoose from "mongoose";

const releaseSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    category: {
      type: String,
      enum: ["repair", "refill", "replace", "borrow", "consumed"],
      required: true,
    },
    qtyReleased: { type: Number, required: true, min: 1 },
    qtyReturned: { type: Number, default: 0 },            // new
    qtyRemaining: { type: Number, default: null },        // new
    releasedTo: { type: String, required: true },
    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateReleased: { type: Date, default: Date.now },
    expectedReturnBy: { type: Date },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "cancelled"],
      default: "pending",
    },
    returnStatus: {
      type: String,
      enum: ["pending", "partially returned", "fully returned"],
      default: "pending",
    },
    archived: { type: Boolean, default: false },
    isReturnable: { type: Boolean, default: false },
    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// Automatically flag as returnable
releaseSchema.pre("save", function (next) {
  const returnableCategories = ["repair", "refill", "replace", "borrow"];
  this.isReturnable = returnableCategories.includes(this.category);

  // Calculate qtyRemaining before save
  // const returned = this.qtyReturned || 0;
  // const released = this.qtyReleased || 0;
  // this.qtyRemaining = released - returned;
  this.qtyRemaining = Math.max(0, this.qtyReleased - (this.qtyReturned || 0));


  next();
});

export default mongoose.model("Release", releaseSchema);
