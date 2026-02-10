import mongoose from "mongoose";
import dotenv from "dotenv";
import Report from "./models/Report.js"; // adjust path

dotenv.config(); // <-- this loads .env variables

const MONGO_URI = process.env.MONGO_URI;

async function migrateReports() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is undefined. Check your .env file.");
    }

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    const reports = await Report.find();
    console.log(`Found ${reports.length} reports`);

    for (const r of reports) {
      if (r.month.includes("-")) {
        const [year, month] = r.month.split("-");
        r.month = month;
        r.year = year;
        await r.save();
        console.log(`Migrated report: ${year}-${month}`);
      }
    }

    console.log("Migration complete");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrateReports();
