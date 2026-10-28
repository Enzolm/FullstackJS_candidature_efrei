import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		originalName: { type: String, required: true, trim: true },
		displayName: { type: String, required: true, trim: true, maxlength: 120 },
		category: {
			type: String,
			enum: ["CV", "Lettre de motivation", "Certificat", "Autre"],
			required: true,
		},
		storedName: { type: String, required: true, unique: true },
		mimeType: { type: String, required: true },
		size: { type: Number, required: true },
	},
	{ timestamps: true },
);

export default mongoose.model("Document", documentSchema);
