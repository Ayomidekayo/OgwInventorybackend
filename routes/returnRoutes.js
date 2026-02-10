import express from "express";
import {
  addReturn,
  createReturnForRelease,
  getAllReturns,
  getReturnById,
  getReturnByReleaseId
} from "../controllers/returnController.js";
import { protect } from "../middlewares/authMIddleware.js";
 // note: corrected spelling if needed

const router = express.Router();

// 1. Get all returns
router.get("/", protect, getAllReturns);



// 3. Get return(s) for a specific release
router.get("/release/:releaseId", protect, getReturnByReleaseId);

// 2. Get a specific return record by its _return_ ID
router.get("/:id", protect, getReturnById);

// 4. Create a return record for a specific release
router.post("/release/:releaseId", protect, createReturnForRelease);

// 5. (Optional) Generic create
router.post("/", protect, addReturn);

export default router;
