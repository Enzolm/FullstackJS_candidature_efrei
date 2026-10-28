import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { protect } from "../middlewares/authMiddleware.js";
import {
	deleteDocument,
	downloadDocument,
	listDocuments,
	updateDocument,
	uploadDocument,
} from "../controllers/documentController.js";

const uploadDirectory = path.resolve("uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, callback) =>
			callback(null, uploadDirectory),
		filename: (_req, file, callback) =>
			callback(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();
router.use(protect);
router.get("/", listDocuments);
router.post("/", upload.single("file"), uploadDocument);
router.get("/:id/download", downloadDocument);
router.patch("/:id", updateDocument);
router.delete("/:id", deleteDocument);

export default router;
