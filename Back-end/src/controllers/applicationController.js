import Application from "../models/Application.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// --- CREATE : Ajouter une nouvelle candidature ---
export const createApplication = async (req, res) => {
	try {
		const company = req.body.company?.trim();
		const position = req.body.position?.trim();
		const jobUrl = req.body.jobUrl?.trim();

		if (!company || !position) {
			return res.status(400).json({
				success: false,
				message: "L’entreprise et l’intitulé du poste sont obligatoires.",
			});
		}

		const duplicateConditions = [
			{
				company: new RegExp(`^${escapeRegex(company)}$`, "i"),
				position: new RegExp(`^${escapeRegex(position)}$`, "i"),
			},
		];
		if (jobUrl) duplicateConditions.push({ jobUrl });

		const existingApplication = await Application.findOne({
			user: req.user.userId,
			$or: duplicateConditions,
		}).select("_id company position jobUrl");

		if (existingApplication) {
			return res.status(409).json({
				success: false,
				message: "Cette offre existe déjà dans tes candidatures.",
				data: existingApplication,
			});
		}

		const newApplication = new Application({
			...req.body,
			company,
			position,
			jobUrl: jobUrl || undefined,
			user: req.user.userId, // On associe la candidature à l'utilisateur connecté
			timeline: [
				{
					date: new Date(),
					type: "status",
					title: "Candidature créée",
					note: `Statut initial : ${req.body.status || "postulé"}`,
				},
			],
		});

		const savedApplication = await newApplication.save();

		res.status(201).json({
			success: true,
			message: "Candidature enregistrée avec succès !",
			data: savedApplication,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: "Erreur lors de l'enregistrement de la candidature",
			error: error.message,
		});
	}
};

// --- READ : Récupérer toutes les candidatures de l'utilisateur ---
export const getApplications = async (req, res) => {
	try {
		const applications = await Application.find({
			user: req.user.userId,
		}).sort({
			createdAt: -1,
		});

		res.status(200).json({
			success: true,
			count: applications.length,
			data: applications,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la récupération des candidatures",
			error: error.message,
		});
	}
};

// --- READ : Récupérer une seule candidature par son ID ---
export const getApplicationById = async (req, res) => {
	try {
		// On cherche par ID ET par utilisateur pour la sécurité
		const application = await Application.findOne({
			_id: req.params.id,
			user: req.user.userId,
		});

		if (!application) {
			return res.status(404).json({
				success: false,
				message: "Candidature non trouvée",
			});
		}

		res.status(200).json({
			success: true,
			data: application,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la récupération de la candidature",
			error: error.message,
		});
	}
};

// --- UPDATE : Modifier une candidature ---
export const updateApplication = async (req, res) => {
	try {
		const application = await Application.findOne({
			_id: req.params.id,
			user: req.user.userId,
		});

		if (!application) {
			return res.status(404).json({
				success: false,
				message: "Candidature non trouvée",
			});
		}

		const editableFields = [
			"company",
			"position",
			"city",
			"address",
			"commuteTime",
			"salary",
			"contractType",
			"channel",
			"jobUrl",
			"applicationDate",
			"nextFollowUpDate",
			"contact",
			"status",
		];
		const previousStatus = application.status;

		for (const field of editableFields) {
			if (Object.hasOwn(req.body, field)) {
				application.set(field, req.body[field]);
			}
		}

		if (application.status !== previousStatus) {
			application.timeline.push({
				date: new Date(),
				type: "status",
				title: "Statut modifié",
				note: `${previousStatus} → ${application.status}`,
			});
		}

		const updatedApplication = await application.save();

		res.status(200).json({
			success: true,
			message: "Candidature mise à jour avec succès !",
			data: updatedApplication,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			message: "Erreur lors de la mise à jour",
			error: error.message,
		});
	}
};

// --- DELETE : Supprimer une candidature ---
export const deleteApplication = async (req, res) => {
	try {
		const deletedApplication = await Application.findOneAndDelete({
			_id: req.params.id,
			user: req.user.userId,
		});

		if (!deletedApplication) {
			return res.status(404).json({
				success: false,
				message: "Candidature non trouvée",
			});
		}

		res.status(200).json({
			success: true,
			message: "Candidature supprimée avec succès !",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la suppression",
			error: error.message,
		});
	}
};
