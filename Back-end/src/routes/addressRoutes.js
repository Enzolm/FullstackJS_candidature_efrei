import express from "express";
import { searchAddresses } from "../controllers/addressController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", protect, searchAddresses);

export default router;
