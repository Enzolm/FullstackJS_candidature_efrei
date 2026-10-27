import "dotenv/config"; // Charge les variables du fichier .env dès le démarrage
import app from "./app.js";
import connectDB from "./config/db.js";
import authRoutes from './routes/authRoutes.js';

// On définit le port : soit celui du fichier .env, soit le port 5000 par défaut
const PORT = process.env.PORT || 5000;

// Règle d'or : On connecte d'abord la base de données, et SEULEMENT SI ça réussit, on lance le serveur
connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`🚀 Serveur en cours d'exécution sur le port ${PORT}`);
	});
});

app.use('/api/auth', authRoutes);



