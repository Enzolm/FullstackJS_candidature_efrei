import express from "express";
import {
	createApplication,
	getApplications,
	getApplicationById,
	updateApplication,
	deleteApplication,
} from "../controllers/applicationController.js";
import { protect } from "../middlewares/authMiddleware.js"; // <-- On importe le middleware

const router = express.Router();

// --- NOUVEAU : Toutes les routes de ce fichier exigent désormais d'être authentifié ---
router.use(protect);

router.route("/").get(getApplications).post(createApplication);

router
	.route("/:id")
	.get(getApplicationById)
	.put(updateApplication)
	.delete(deleteApplication);

export default router;
