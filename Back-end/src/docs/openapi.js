const jsonResponse = (description, schema) => ({
	description,
	content: {
		"application/json": { schema },
	},
});

const errorResponse = (description) =>
	jsonResponse(description, { $ref: "#/components/schemas/Error" });

const successMessage = {
	type: "object",
	properties: {
		success: { type: "boolean", example: true },
		message: { type: "string" },
	},
	required: ["success", "message"],
};

const authenticated = [{ bearerAuth: [] }];

const openApiSpec = {
	openapi: "3.0.3",
	info: {
		title: "JobPulse API",
		version: "1.0.0",
		description:
			"API REST de TrackMyApply pour l’authentification, les candidatures, les documents et les outils de recherche. Les routes protégées nécessitent un JWT Bearer.",
	},
	servers: [{ url: "/api", description: "API locale" }],
	tags: [
		{ name: "Santé", description: "État de disponibilité de l’API" },
		{ name: "Authentification", description: "Comptes et profils" },
		{ name: "Candidatures", description: "Suivi des candidatures" },
		{ name: "Documents", description: "Documents personnels" },
		{ name: "Offres", description: "Offres d’emploi distantes" },
		{ name: "Adresses", description: "Recherche d’adresses" },
		{ name: "Analytique", description: "Temps de trajet" },
	],
	paths: {
		"/health": {
			get: {
				tags: ["Santé"],
				summary: "Vérifier que l’API répond",
				responses: {
					200: jsonResponse("API disponible.", {
						type: "object",
						properties: {
							status: { type: "string", example: "ok" },
						},
						required: ["status"],
					}),
				},
			},
		},
		"/auth/register": {
			post: {
				tags: ["Authentification"],
				summary: "Créer un compte",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/RegisterRequest" },
						},
					},
				},
				responses: {
					201: jsonResponse("Compte créé et JWT retourné.", {
						$ref: "#/components/schemas/AuthResponse",
					}),
					400: errorResponse("Adresse e-mail déjà utilisée ou données invalides."),
					500: errorResponse("Erreur pendant l’inscription."),
				},
			},
		},
		"/auth/login": {
			post: {
				tags: ["Authentification"],
				summary: "Se connecter",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/LoginRequest" },
						},
					},
				},
				responses: {
					200: jsonResponse("Connexion réussie et JWT retourné.", {
						$ref: "#/components/schemas/AuthResponse",
					}),
					401: errorResponse("Identifiants incorrects."),
					500: errorResponse("Erreur pendant la connexion."),
				},
			},
		},
		"/auth/reset-password": {
			post: {
				tags: ["Authentification"],
				summary: "Réinitialiser un mot de passe (démonstration)",
				description:
					"Cette route de démonstration vérifie un code fixe dans le backend. Elle ne constitue pas un flux sécurisé de réinitialisation pour la production.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
						},
					},
				},
				responses: {
					200: jsonResponse("Mot de passe réinitialisé.", successMessage),
					400: errorResponse("Code invalide ou mot de passe trop court."),
					404: errorResponse("Aucun compte ne correspond à cette adresse."),
					500: errorResponse("Erreur pendant la réinitialisation."),
				},
			},
		},
		"/auth/password": {
			put: {
				tags: ["Authentification"],
				summary: "Modifier son mot de passe",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
						},
					},
				},
				responses: {
					200: jsonResponse("Mot de passe modifié.", successMessage),
					400: errorResponse("Mot de passe manquant ou trop court."),
					401: errorResponse("JWT absent/invalide ou mot de passe actuel incorrect."),
					404: errorResponse("Utilisateur introuvable."),
					500: errorResponse("Erreur pendant la modification."),
				},
			},
		},
		"/auth/onboarding": {
			put: {
				tags: ["Authentification"],
				summary: "Finaliser l’onboarding",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ProfileRequest" },
						},
					},
				},
				responses: {
					200: jsonResponse("Profil complété.", {
						$ref: "#/components/schemas/ProfileResponse",
					}),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Utilisateur introuvable."),
					500: errorResponse("Erreur pendant la sauvegarde du profil."),
				},
			},
		},
		"/auth/profile": {
			put: {
				tags: ["Authentification"],
				summary: "Mettre à jour son profil",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ProfileRequest" },
						},
					},
				},
				responses: {
					200: jsonResponse("Profil mis à jour.", {
						$ref: "#/components/schemas/ProfileResponse",
					}),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Utilisateur introuvable."),
					500: errorResponse("Erreur pendant la mise à jour du profil."),
				},
			},
		},
		"/applications": {
			get: {
				tags: ["Candidatures"],
				summary: "Lister ses candidatures",
				security: authenticated,
				responses: {
					200: jsonResponse("Liste des candidatures du compte connecté.", {
						type: "object",
						properties: {
							success: { type: "boolean", example: true },
							count: { type: "integer", example: 1 },
							data: {
								type: "array",
								items: { $ref: "#/components/schemas/Application" },
							},
						},
						required: ["success", "count", "data"],
					}),
					401: errorResponse("JWT absent ou invalide."),
					500: errorResponse("Erreur pendant la récupération."),
				},
			},
			post: {
				tags: ["Candidatures"],
				summary: "Créer une candidature",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ApplicationInput" },
						},
					},
				},
				responses: {
					201: jsonResponse("Candidature créée.", {
						$ref: "#/components/schemas/ApplicationResponse",
					}),
					400: errorResponse("Entreprise/poste manquant ou données invalides."),
					401: errorResponse("JWT absent ou invalide."),
					409: errorResponse("Cette offre existe déjà."),
				},
			},
		},
		"/applications/{id}": {
			parameters: [{ $ref: "#/components/parameters/Id" }],
			get: {
				tags: ["Candidatures"],
				summary: "Récupérer une candidature",
				security: authenticated,
				responses: {
					200: jsonResponse("Candidature trouvée.", {
						$ref: "#/components/schemas/ApplicationResponse",
					}),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Candidature introuvable pour ce compte."),
					500: errorResponse("Erreur pendant la récupération."),
				},
			},
			put: {
				tags: ["Candidatures"],
				summary: "Modifier une candidature",
				description:
					"Seuls les champs éditables sont mis à jour. Le propriétaire et la timeline ne sont pas modifiables depuis cette requête.",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/ApplicationUpdate" },
						},
					},
				},
				responses: {
					200: jsonResponse("Candidature mise à jour.", {
						$ref: "#/components/schemas/ApplicationResponse",
					}),
					400: errorResponse("Données de candidature invalides."),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Candidature introuvable pour ce compte."),
				},
			},
			delete: {
				tags: ["Candidatures"],
				summary: "Supprimer une candidature",
				security: authenticated,
				responses: {
					200: jsonResponse("Candidature supprimée.", successMessage),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Candidature introuvable pour ce compte."),
					500: errorResponse("Erreur pendant la suppression."),
				},
			},
		},
		"/documents": {
			get: {
				tags: ["Documents"],
				summary: "Lister ses documents",
				security: authenticated,
				responses: {
					200: jsonResponse("Documents appartenant au compte connecté.", {
						type: "object",
						properties: {
							success: { type: "boolean", example: true },
							data: {
								type: "array",
								items: { $ref: "#/components/schemas/Document" },
							},
						},
					}),
					401: errorResponse("JWT absent ou invalide."),
					500: errorResponse("Erreur pendant la récupération."),
				},
			},
			post: {
				tags: ["Documents"],
				summary: "Déposer un document",
				description:
					"Envoie un fichier multipart/form-data de 10 Mo maximum. Les formats autorisés dépendent du serveur.",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"multipart/form-data": {
							schema: { $ref: "#/components/schemas/DocumentUpload" },
						},
					},
				},
				responses: {
					201: jsonResponse("Document enregistré.", {
						type: "object",
						properties: {
							success: { type: "boolean", example: true },
							data: { $ref: "#/components/schemas/Document" },
						},
					}),
					400: errorResponse("Fichier absent, catégorie invalide ou nom requis."),
					401: errorResponse("JWT absent ou invalide."),
					500: errorResponse("Erreur pendant l’enregistrement."),
				},
			},
		},
		"/documents/{id}/download": {
			parameters: [{ $ref: "#/components/parameters/Id" }],
			get: {
				tags: ["Documents"],
				summary: "Télécharger un document",
				security: authenticated,
				responses: {
					200: {
						description: "Fichier du compte connecté.",
						content: {
							"application/octet-stream": {
								schema: { type: "string", format: "binary" },
							},
						},
					},
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Document introuvable."),
					500: errorResponse("Erreur pendant le téléchargement."),
				},
			},
		},
		"/documents/{id}": {
			parameters: [{ $ref: "#/components/parameters/Id" }],
			patch: {
				tags: ["Documents"],
				summary: "Renommer un document",
				security: authenticated,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["displayName"],
								properties: {
									displayName: { type: "string", example: "CV développeur" },
								},
							},
						},
					},
				},
				responses: {
					200: jsonResponse("Nom d’affichage mis à jour.", {
						type: "object",
						properties: {
							success: { type: "boolean", example: true },
							data: { $ref: "#/components/schemas/Document" },
						},
					}),
					400: errorResponse("Nom d’affichage manquant."),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Document introuvable."),
				},
			},
			delete: {
				tags: ["Documents"],
				summary: "Supprimer un document",
				security: authenticated,
				responses: {
					200: jsonResponse("Document supprimé.", successMessage),
					401: errorResponse("JWT absent ou invalide."),
					404: errorResponse("Document introuvable."),
					500: errorResponse("Erreur pendant la suppression."),
				},
			},
		},
		"/jobs/rss": {
			get: {
				tags: ["Offres"],
				summary: "Récupérer les offres distantes",
				security: authenticated,
				responses: {
					200: jsonResponse("Offres lues depuis le flux RSS distant.", {
						type: "object",
						properties: {
							success: { type: "boolean", example: true },
							data: {
								type: "array",
								items: { $ref: "#/components/schemas/RemoteJob" },
							},
						},
					}),
					401: errorResponse("JWT absent ou invalide."),
					502: errorResponse("Flux d’offres indisponible."),
				},
			},
		},
		"/addresses/search": {
			get: {
				tags: ["Adresses"],
				summary: "Rechercher des adresses françaises",
				description:
					"Recherche d’abord auprès de l’API Adresse du gouvernement, puis utilise Photon en secours. Une requête de moins de 3 caractères renvoie une liste vide.",
				security: authenticated,
				parameters: [
					{
						name: "q",
						in: "query",
						required: true,
						description: "Texte recherché (3 caractères minimum pour lancer la recherche).",
						schema: { type: "string", example: "10 rue de la Paix, Paris" },
					},
				],
				responses: {
					200: jsonResponse("Suggestions d’adresses.", {
						type: "object",
						properties: {
							features: {
								type: "array",
								items: { $ref: "#/components/schemas/AddressFeature" },
							},
							source: { type: "string", enum: ["gouv", "photon"] },
						},
						required: ["features"],
					}),
					401: errorResponse("JWT absent ou invalide."),
					502: errorResponse("Services d’adresses indisponibles."),
				},
			},
		},
		"/analytics/commute": {
			get: {
				tags: ["Analytique"],
				summary: "Calculer les temps de trajet des candidatures",
				description:
					"Utilise l’adresse du domicile du profil, l’API Adresse et OSRM. Si le domicile n’est pas configuré, la réponse indique configured=false.",
				security: authenticated,
				responses: {
					200: jsonResponse("Statistiques de trajets.", {
						type: "object",
						properties: {
							success: { type: "boolean", example: true },
							data: { $ref: "#/components/schemas/CommuteAnalytics" },
						},
					}),
					401: errorResponse("JWT absent ou invalide."),
					502: errorResponse("Erreur de calcul des trajets."),
				},
			},
		},
	},
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description:
					"Utiliser le jeton retourné par /auth/register ou /auth/login.",
			},
		},
		parameters: {
			Id: {
				name: "id",
				in: "path",
				required: true,
				description: "Identifiant MongoDB de la ressource.",
				schema: { type: "string", example: "507f1f77bcf86cd799439011" },
			},
		},
		schemas: {
			Error: {
				type: "object",
				properties: {
					success: { type: "boolean", example: false },
					message: { type: "string", example: "Ressource introuvable." },
					error: { type: "string" },
				},
				required: ["success", "message"],
			},
			RegisterRequest: {
				type: "object",
				required: ["email", "password"],
				properties: {
					email: { type: "string", format: "email", example: "ada@example.com" },
					password: { type: "string", format: "password", example: "secret123" },
					firstName: { type: "string", example: "Ada" },
					lastName: { type: "string", example: "Lovelace" },
					targetRole: { type: "string", example: "Développement Full-Stack" },
				},
			},
			LoginRequest: {
				type: "object",
				required: ["email", "password"],
				properties: {
					email: { type: "string", format: "email", example: "ada@example.com" },
					password: { type: "string", format: "password", example: "secret123" },
				},
			},
			ResetPasswordRequest: {
				type: "object",
				required: ["email", "code", "newPassword"],
				properties: {
					email: { type: "string", format: "email" },
					code: { type: "string", description: "Code de démonstration." },
					newPassword: { type: "string", minLength: 8, format: "password" },
				},
			},
			ChangePasswordRequest: {
				type: "object",
				required: ["currentPassword", "newPassword"],
				properties: {
					currentPassword: { type: "string", format: "password" },
					newPassword: { type: "string", minLength: 8, format: "password" },
				},
			},
			ProfileRequest: {
				type: "object",
				required: ["profile"],
				properties: {
					profile: {
						type: "object",
						properties: {
							firstName: { type: "string" },
							lastName: { type: "string" },
							educationLevel: { type: "string" },
							currentDegree: { type: "string" },
							exactDegreeTitle: { type: "string" },
							school: { type: "string" },
							searchDomain: { type: "string" },
							contractType: { type: "string" },
							contractDuration: { type: "string" },
							rhythm: { type: "string" },
							location: { type: "string" },
							homeAddress: {
								type: "object",
								properties: {
									label: { type: "string" },
									postcode: { type: "string" },
									city: { type: "string" },
									latitude: { type: "number" },
									longitude: { type: "number" },
								},
							},
						},
					},
				},
			},
			AuthResponse: {
				type: "object",
				properties: {
					success: { type: "boolean", example: true },
					message: { type: "string" },
					token: { type: "string", description: "JWT valable 7 jours." },
					data: { $ref: "#/components/schemas/User" },
				},
				required: ["success", "message", "token", "data"],
			},
			ProfileResponse: {
				type: "object",
				properties: {
					success: { type: "boolean", example: true },
					message: { type: "string" },
					data: { $ref: "#/components/schemas/User" },
				},
			},
			User: {
				type: "object",
				properties: {
					id: { type: "string" },
					email: { type: "string", format: "email" },
					isOnboarded: { type: "boolean" },
					profile: { type: "object", additionalProperties: true },
				},
			},
			ApplicationFields: {
				type: "object",
				properties: {
					company: { type: "string", example: "Exemple SAS" },
					position: { type: "string", example: "Développeur Full-Stack" },
					city: { type: "string", example: "Paris" },
					address: { type: "string", example: "10 rue de la Paix, Paris" },
					commuteTime: { type: "string", example: "35 min" },
					salary: { type: "string", example: "38 000 €" },
					contractType: { type: "string", example: "Alternance" },
					channel: { type: "string", example: "LinkedIn" },
					jobUrl: { type: "string", format: "uri" },
					applicationDate: { type: "string", format: "date-time" },
					nextFollowUpDate: { type: "string", format: "date-time" },
					status: {
						type: "string",
						enum: [
							"postulé",
							"en attente",
							"entretien prévu",
							"entretien",
							"relance faite",
							"offre reçue",
							"refusé",
						],
						default: "postulé",
					},
					contact: {
						type: "object",
						properties: {
							name: { type: "string" },
							email: { type: "string", format: "email" },
							phone: { type: "string" },
						},
					},
				},
			},
			ApplicationInput: {
				allOf: [
					{ $ref: "#/components/schemas/ApplicationFields" },
					{
						type: "object",
						required: ["company", "position"],
					},
				],
			},
			ApplicationUpdate: {
				$ref: "#/components/schemas/ApplicationFields",
			},
			Application: {
				allOf: [
					{ $ref: "#/components/schemas/ApplicationFields" },
					{
						type: "object",
						properties: {
							_id: { type: "string" },
							user: { type: "string", description: "Identifiant propriétaire." },
							timeline: {
								type: "array",
								items: {
									type: "object",
									properties: {
										date: { type: "string", format: "date-time" },
										type: {
											type: "string",
											enum: ["email", "call", "interview", "note", "status"],
										},
										title: { type: "string" },
										note: { type: "string" },
									},
								},
							},
							createdAt: { type: "string", format: "date-time" },
							updatedAt: { type: "string", format: "date-time" },
						},
					},
				],
			},
			ApplicationResponse: {
				type: "object",
				properties: {
					success: { type: "boolean", example: true },
					message: { type: "string" },
					data: { $ref: "#/components/schemas/Application" },
				},
			},
			Document: {
				type: "object",
				properties: {
					id: { type: "string" },
					originalName: { type: "string" },
					displayName: { type: "string" },
					category: {
						type: "string",
						enum: ["CV", "Lettre de motivation", "Certificat", "Autre"],
					},
					mimeType: { type: "string" },
					size: { type: "integer", description: "Taille en octets." },
					createdAt: { type: "string", format: "date-time" },
				},
			},
			DocumentUpload: {
				type: "object",
				required: ["file", "category"],
				properties: {
					file: { type: "string", format: "binary" },
					category: {
						type: "string",
						enum: ["CV", "Lettre de motivation", "Certificat", "Autre"],
					},
					customName: {
						type: "string",
						description: "Obligatoire lorsque category vaut Autre.",
					},
				},
			},
			RemoteJob: {
				type: "object",
				properties: {
					id: { type: "string" },
					title: { type: "string" },
					link: { type: "string", format: "uri" },
					description: { type: "string" },
					publishedAt: { type: "string" },
					category: { type: "string" },
				},
			},
			AddressFeature: {
				type: "object",
				properties: {
					type: { type: "string", example: "Feature" },
					geometry: {
						type: "object",
						properties: {
							coordinates: {
								type: "array",
								items: { type: "number" },
								example: [2.3317, 48.8686],
							},
						},
					},
					properties: {
						type: "object",
						properties: {
							label: { type: "string" },
							city: { type: "string" },
							postcode: { type: "string" },
						},
					},
				},
			},
			CommuteAnalytics: {
				type: "object",
				properties: {
					configured: { type: "boolean" },
					averageMinutes: { type: "integer", nullable: true },
					calculatedTrips: { type: "integer" },
					totalApplications: { type: "integer" },
					missingAddresses: { type: "integer" },
					details: {
						type: "array",
						items: {
							type: "object",
							properties: {
								applicationId: { type: "string" },
								company: { type: "string" },
								position: { type: "string" },
								address: { type: "string" },
								minutes: { type: "integer" },
								origin: { type: "object", additionalProperties: true },
								destination: { type: "object", additionalProperties: true },
							},
						},
					},
				},
			},
		},
	},
};

export default openApiSpec;
