import express from "express";
import cors from "cors";
// 1. On importe notre fichier de routes qu'on vient de créer
import applicationRoutes from "./routes/applicationRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

const app = express();

// Middlewares essentiels
app.use(cors());
app.use(express.json()); // Indispensable pour lire le JSON dans les requêtes POST

// Route de santé (pour tester si le serveur répond)
app.get("/api/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

// 2. On branche toutes nos routes de candidatures sous le préfixe "/api/applications"
app.use("/api/applications", applicationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/documents", documentRoutes);

export default app;
