import express from "express";
import { getCommuteAnalytics } from "../controllers/analyticsController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/commute", protect, getCommuteAnalytics);

export default router;
