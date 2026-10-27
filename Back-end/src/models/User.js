import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: [true, "L'email est obligatoire"],
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: [true, "Le mot de passe est obligatoire"],
		},
		// Permet de savoir si l'utilisateur a fini son questionnaire d'onboarding
		isOnboarded: {
			type: Boolean,
			default: false,
		},
		// Le profil détaillé rempli lors du questionnaire post-inscription
		profile: {
			educationLevel: { type: String }, // Ex: "Bac+5"
			currentDegree: { type: String }, // Ex: "Mastère Dev Manager Full Stack"
			searchDomain: { type: String }, // Ex: "Développement Full-Stack" (pour le scraping)
			contractType: { type: String }, // Ex: "Alternance", "Stage", "CDI"
			contractDuration: { type: String }, // Ex: "12 à 24 mois"
			rhythm: { type: String }, // Ex: "2 semaines en entreprise / 1 semaine à l'école"
			location: { type: String }, // Ex: "Île-de-France"
		},
	},
	{
		timestamps: true,
	},
);

const User = mongoose.model("User", userSchema);

export default User;
