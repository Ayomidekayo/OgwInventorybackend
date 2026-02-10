import express from "express";

import { protect } from "../middlewares/authMIddleware.js";
import { approveSchedule, createSchedule, getSchedules } from "../controllers/scheduleController.js";



// assuming you have auth

const router = express.Router();
router.use(protect);

// router.post("/",  createSchedule);
// router.patch("/:scheduleId/approve", approveSchedule);
//  router.get("/", getSchedules);
 router.get("/", getSchedules);
router.post("/",createSchedule);
router.put("/:scheduleId/approve",approveSchedule);
// router.put("/:id", updateSchedule);
// router.patch("/:id/mark", markSchedule);
// router.patch("/:id/cancel", cancelSchedule);

export default router;