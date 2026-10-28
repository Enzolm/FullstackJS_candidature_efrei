import fs from "node:fs/promises";
import path from "node:path";
import Document from "../models/Document.js";

const UPLOAD_DIRECTORY = path.resolve("uploads");
const CATEGORIES = new Set([
	"CV",
	"Lettre de motivation",
	"Certificat",
	"Autre",
]);

const serializeDocument = (document) => ({
	id: document._id,
	originalName: document.originalName,
	displayName: document.displayName,
	category: document.category,
	mimeType: document.mimeType,
	size: document.size,
	createdAt: document.createdAt,
});

const findOwnedDocument = (id, userId) =>
	Document.findOne({ _id: id, user: userId });

export const listDocuments = async (req, res) => {
	try {
		const documents = await Document.find({ user: req.user.userId }).sort({
			createdAt: -1,
		});
		return res.status(200).json({
			success: true,
			data: documents.map(serializeDocument),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Impossible de récupérer les documents.",
			error: error.message,
		});
	}
};

export const uploadDocument = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: "Aucun fichier n'a été envoyé.",
			});
		}

		const category = req.body.category;
		const customName = typeof req.body.customName === "string"
			? req.body.customName.trim()
			: "";
		if (!CATEGORIES.has(category)) {
			await fs.unlink(req.file.path).catch(() => {});
			return res.status(400).json({
				success: false,
				message: "La catégorie du document est invalide.",
			});
		}
		if (category === "Autre" && !customName) {
			await fs.unlink(req.file.path).catch(() => {});
			return res.status(400).json({
				success: false,
				message: "Un nom est obligatoire pour la catégorie Autre.",
			});
		}

		const document = await Document.create({
			user: req.user.userId,
			originalName: req.file.originalname,
			displayName: category === "Autre" ? customName : category,
			category,
			storedName: req.file.filename,
			mimeType: req.file.mimetype || "application/octet-stream",
			size: req.file.size,
		});

		return res.status(201).json({
			success: true,
			data: serializeDocument(document),
		});
	} catch (error) {
		if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
		return res.status(500).json({
			success: false,
			message: "Impossible d'enregistrer le document.",
			error: error.message,
		});
	}
};

export const downloadDocument = async (req, res) => {
	try {
		const document = await findOwnedDocument(req.params.id, req.user.userId);
		if (!document) {
			return res.status(404).json({
				success: false,
				message: "Document introuvable.",
			});
		}

		return res.download(
			path.join(UPLOAD_DIRECTORY, document.storedName),
			document.originalName,
			(error) => {
				if (error && !res.headersSent) {
					res.status(500).json({
						success: false,
						message: "Impossible de télécharger le document.",
					});
				}
			},
		);
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Impossible de télécharger le document.",
			error: error.message,
		});
	}
};

export const updateDocument = async (req, res) => {
	try {
		const displayName =
			typeof req.body.displayName === "string"
				? req.body.displayName.trim()
				: "";
		if (!displayName) {
			return res.status(400).json({
				success: false,
				message: "Le nom d'affichage est obligatoire.",
			});
		}

		const document = await findOwnedDocument(req.params.id, req.user.userId);
		if (!document) {
			return res.status(404).json({
				success: false,
				message: "Document introuvable.",
			});
		}

		document.displayName = displayName;
		await document.save();
		return res.status(200).json({
			success: true,
			data: serializeDocument(document),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Impossible de renommer le document.",
			error: error.message,
		});
	}
};

export const deleteDocument = async (req, res) => {
	try {
		const document = await findOwnedDocument(req.params.id, req.user.userId);
		if (!document) {
			return res.status(404).json({
				success: false,
				message: "Document introuvable.",
			});
		}

		await fs.unlink(path.join(UPLOAD_DIRECTORY, document.storedName)).catch(
			(error) => {
				if (error.code !== "ENOENT") throw error;
			},
		);
		await document.deleteOne();
		return res.status(200).json({
			success: true,
			message: "Document supprimé avec succès.",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Impossible de supprimer le document.",
			error: error.message,
		});
	}
};
