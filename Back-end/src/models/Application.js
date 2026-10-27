import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
    {
        // --- Lien vers l'utilisateur connecté ---
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // --- Informations principales ---
        company: {
            type: String,
            required: [true, "Le nom de l'entreprise est obligatoire"],
        },
        position: {
            type: String,
            required: [true, "L'intitulé du poste est obligatoire"],
        },
        city: { type: String },
        address: { type: String },
        commuteTime: { type: String }, // Ex: "45 min"

        // --- Détails de l'offre ---
        channel: { type: String }, // Ex: LinkedIn, Indeed, Site officiel...
        jobUrl: { type: String },

        // --- Statut et Suivi ---
        status: {
            type: String,
            enum: [
                "postulé",
                "en attente",
                "entretien prévu",
                "entretien",
                "relance faite",
                "refusé",
            ],
            default: "postulé",
        },
        applicationDate: {
            type: Date,
            default: Date.now,
        },
        nextFollowUpDate: { type: Date },

        // --- Contact (Sous-objet pour structurer) ---
        contact: {
            name: { type: String },
            email: { type: String },
            phone: { type: String },
        },
    },
    {
        timestamps: true, // Ajoute automatiquement createdAt et updatedAt
    },
);

const Application = mongoose.model("Application", applicationSchema);

export default Application;