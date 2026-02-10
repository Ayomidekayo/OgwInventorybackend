import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middlewares/authMIddleware.js';

const router = express.Router();
router.get('/', protect, async (req,res)=>{ const n = await Notification.find().sort('-date'); res.json(n); });

router.put('/:id', protect, async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ message: "Notification not found" });

    n.read = req.body.read ?? n.read;
    await n.save();

    res.json({ success: true, message: "Notification updated", n });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Server error updating notification" });
  }
});

export default router;
