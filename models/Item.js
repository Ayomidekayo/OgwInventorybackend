import mongoose from "mongoose";
import { MEASURING_UNITS } from "../constant/MeasuringUnits.js";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "stored" },
    description: { type: String, trim: true, default: "" },
    quantity: { type: Number, required: true, min: 0 },
    measuringUnit: {
      type: String,
      enum: MEASURING_UNITS,
      required: true,
    },
    currentStatus: {
      type: String,
      enum: ["in", "out", "deleted"],
      default: "in",
    },
    isRefundable: { type: Boolean, default: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Soft delete fields:
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },

    returns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Return" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for combinedQuantity
itemSchema.virtual("combinedQuantity").get(function () {
  return `${this.quantity} ${this.measuringUnit}`;
});

// Pre “find” / “findOne” hook to exclude soft-deleted records
itemSchema.pre("find", function () {
  this.where({ isDeleted: false });
});
itemSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const Item = mongoose.model("Item", itemSchema);
export default Item;
