import express from "express";
import { searchJobs } from "../controllers/jobController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", protect, searchJobs);

export default router;
