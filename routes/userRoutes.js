import express from "express";
import { createUser, deleteUsers, getAllUsers, getUserById, getUserProfile, setUserActiveStatus, updateUser, updateUserProfile } from "../controllers/userController.js";
import { protect } from "../middlewares/authMIddleware.js";
import { adminOnly } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ----------------------------------------
// Protect all routes
// ----------------------------------------
router.use(protect);

// ----------------------------------------
// User profile routes (any logged-in user)
// ----------------------------------------
router.get("/profile", getUserProfile);
router.put("/profile/update", updateUserProfile);

// ----------------------------------------
// Admin / Superadmin routes
// ----------------------------------------
router.get("/", adminOnly(["admin", "superadmin"]), getAllUsers);

// Superadmin-only routes
router.post("/", adminOnly(["superadmin"]), createUser);
router.put("/:id", adminOnly(["superadmin"]), updateUser);
router.delete("/:id", adminOnly(["superadmin"]), deleteUsers);
router.patch(
  "/:id/active",
  protect,
  adminOnly(["superadmin"]),   // only superadmin can toggle active status
  setUserActiveStatus
);

// ----------------------------------------
// Fetch any user by ID (accessible to logged-in users)
// ----------------------------------------
router.get("/:id", getUserById);

export default router;
