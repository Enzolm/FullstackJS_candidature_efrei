import mongoose from "mongoose";

const connectDB = async () => {
	try {
		// On demande à Mongoose de se connecter à l'URI stockée dans les variables d'environnement
		await mongoose.connect(process.env.MONGO_URI);
		console.log("📦 MongoDB connecté avec succès !");
	} catch (error) {
		console.error("❌ Erreur de connexion à MongoDB :", error.message);
		// Si la base de données ne répond pas, on arrête tout (inutile de lancer le serveur sans DB)
		process.exit(1);
	}
};

export default connectDB;
