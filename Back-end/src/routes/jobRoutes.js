import express from "express";
import { getRemoteJobs } from "../controllers/jobController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/rss", protect, getRemoteJobs);

export default router;
