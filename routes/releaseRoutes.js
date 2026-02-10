import express from "express";
import { protect } from "../middlewares/authMIddleware.js";
import { createReleaseItem, getAllReleasedItems, getSingleReleasedItem, updateApprovalStatus } from "../controllers/releaseController.js";
import { adminOnly } from "../middlewares/roleMiddleware.js";


const router = express.Router();

// ✅ CREATE release
router.post("/", protect, createReleaseItem);

// ✅ GET all releases
router.get("/", protect, getAllReleasedItems);

// // ✅ GET single release
router.get("/:id", protect, getSingleReleasedItem);

// // ✅ UPDATE release
// router.put("/:id", protect, adminOnly, updateReleasedItem);

// // ✅ DELETE release
// router.delete("/:id", protect, adminOnly, deleteReleasedItem);

// // ✅ APPROVE / CANCEL
 router.patch("/:id/status", protect, adminOnly(["superadmin"]), updateApprovalStatus);
// router.patch("/:id/cancel", protect, adminOnly(["superadmin"]), cancelRelease);
// router.patch("/:id/pending", protect, adminOnly(["superadmin"]), makePending);

// // For users/admins to view all releases
// // show filtered by role


// router.patch("/:id/status", protect, updateReleaseStatus);

export default router;
