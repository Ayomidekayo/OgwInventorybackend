// backend/index.js
import express from "express";
import http from "http";
import mongoose from "mongoose";
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

import createSocketServer from "./jobs/socket.js";
import {
  initAgenda,
  rescheduleAllRemindersIntoAgenda,
  listAgendaJobs,
} from "./jobs/agendaWorker.js";

dotenv.config();

async function startServer() {
  try {
    await connectDB();

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Routes
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

    // Simple test route
    app.get("/", (req, res) => {
      res.send("API is working ✅");
    });

    // Create HTTP server
    const server = http.createServer(app);

    // Attach socket.io
    createSocketServer(server);

    // Start listening first
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Initialize Agenda in background
    initAgenda(mongoose.connection, server)
      .then(() => console.log("✅ Agenda initialized"))
      .catch((err) => console.error("Agenda init failed:", err.message));

    // Admin endpoints
    app.post("/api/agenda/reschedule", async (req, res) => {
      try {
        const count = await rescheduleAllRemindersIntoAgenda();
        return res.json({ success: true, rescheduled: count });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    });

    app.get("/api/agenda/jobs", async (req, res) => {
      try {
        const jobs = await listAgendaJobs();
        return res.json({ success: true, jobs });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
