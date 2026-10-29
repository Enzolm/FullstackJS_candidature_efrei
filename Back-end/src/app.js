import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "./docs/openapi.js";
// 1. On importe notre fichier de routes qu'on vient de créer
import authRoutes from "./routes/authRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const app = express();

// Middlewares essentiels
app.use(cors());
app.use(express.json()); // Indispensable pour lire le JSON dans les requêtes POST

// Route de santé (pour tester si le serveur répond)
app.get("/api/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

app.get("/api-docs.json", (_req, res) => {
	res.json(openApiSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/auth", authRoutes);
// 2. On branche toutes nos routes de candidatures sous le préfixe "/api/applications"
app.use("/api/applications", applicationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/analytics", analyticsRoutes);

export default app;
