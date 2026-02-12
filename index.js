import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { errorHandler } from "./middlewares/errorMiddlewre.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import releaseRoutes from "./routes/releaseRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();

/* =========================
   ✅ PROPER CORS CONFIG
========================= */
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "https://ogwfrontend.vercel.app",
        "https://ogwfrontend-rgfs-anbf8w46d-movie-apps-projects-4b57ba93.vercel.app",
        "https://ogwfrontend-d4ga-5w5brc4tx-movie-apps-projects-4b57ba93.vercel.app"
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

/* =========================
   DATABASE CONNECTION
========================= */
connectDB().catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
});

/* =========================
   ROUTES
========================= */
app.get("/", (req, res) => {
  res.status(200).send("API is working");
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/release", releaseRoutes);
app.use("/api/return", returnRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

/* =========================
   EXPORT FOR VERCEL
========================= */
export default app;

// listening on port 5000 for local development
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => { console.log(`🚀 Server running on port ${PORT}`); });
// 