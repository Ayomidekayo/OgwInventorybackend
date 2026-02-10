import express from 'express';
import { addItem, deleteItem, getItemById, getItems, releaseItem, updateItem } from '../controllers/itemController.js';
import { protect } from '../middlewares/authMIddleware.js';
import { adminOnly } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ----------------------------------------
// Protect all routes
// ----------------------------------------
router.use(protect);

// ----------------------------------------
// Item routes (any logged-in user)
// ----------------------------------------
router.post("/add", addItem);
router.get("/get", getItems);
 router.get("/:id", getItemById);
 router.post("/release/:id", releaseItem);
// router.post("/return/:id", returnItem);

// ----------------------------------------
// Admin / Superadmin routes
// ----------------------------------------
 router.put("/:id", adminOnly(["superadmin"]), updateItem);
router.delete("/:id", adminOnly(["superadmin"]), deleteItem);

export default router;
