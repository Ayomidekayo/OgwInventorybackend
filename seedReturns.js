import mongoose from "mongoose";
import dotenv from "dotenv";
import Item from "./models/Item.js";
import Release from "./models/Release.js";
import User from "./models/User.js";
import ReturnModel from "./models/Return.js";

dotenv.config();

async function seedReturns() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const items = await Item.find();
    const releases = await Release.find();
    const users = await User.find();

    if (items.length === 0 || releases.length === 0 || users.length === 0) {
      console.error("You need to have items, releases and users seeded first.");
      process.exit(1);
    }

    function rand(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const returns = [];

    for (let i = 0; i < 20; i++) {
      const item = rand(items);
      const release = rand(releases);
      const returnedByUser = rand(users);

      const qtyReturned = Math.ceil(
        Math.random() * Math.max(1, release.qtyReleased || 1)
      );

      // Decide if this return will be overdue or not
      const makeOverdue = Math.random() < 0.3; // ~30% of them will be overdue

      // Calculate dates
      let expectedReturnBy = release.expectedReturnBy
        ? new Date(release.expectedReturnBy)
        : new Date(release.dateReleased.getTime() + 7 * 24 * 60 * 60 * 1000);

      let dateReturned;
      if (makeOverdue) {
        // Return AFTER the expected return date
        dateReturned = new Date(expectedReturnBy.getTime() + (1 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000);
      } else {
        // Return before or on expected return date
        const offsetDays = Math.floor(Math.random() * 5); // up to 4 days before or on
        dateReturned = new Date(expectedReturnBy.getTime() - offsetDays * 24 * 60 * 60 * 1000);
      }

      const conditions = ["good", "damaged", "expired", "lost", "other"];
      const condition = rand(conditions);

      const statuses = ["processed", "pending_review", "archived"];
      const status = rand(statuses);

      returns.push({
        item: item._id,
        release: release._id,
        returnedBy: returnedByUser.name,
        returnedByEmail: returnedByUser.email,
        quantityReturned: qtyReturned,
        dateReturned,
        expectedReturnBy,
        condition,
        remarks: `Seed remark ${i + 1}`,
        processedBy: returnedByUser._id,
        status,
      });
    }

    // Use `create()` instead of `insertMany` so that pre('save') runs (for your hook)
    for (const ret of returns) {
      const doc = new ReturnModel(ret);
      await doc.save();
    }

    console.log("Inserted return documents successfully (including overdue ones)");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.error("Seeding returns failed:", err);
    process.exit(1);
  }
}

seedReturns();
