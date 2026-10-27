import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Clé secrète temporaire (on la mettra dans le fichier .env plus tard pour plus de sécurité)
const JWT_SECRET =
	process.env.JWT_SECRET || "cle_secrete_temporaire_super_securisee";
const RESET_PASSWORD_CODE = "123456";

// --- INSCRIPTION ---
export const register = async (req, res) => {
	try {
		const { email, password, firstName, lastName, targetRole } = req.body;

		// 1. Vérifier si l'utilisateur existe déjà
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "Cet email est déjà utilisé.",
			});
		}

		// 2. Crypter le mot de passe (hachage avec bcrypt)
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// 3. Créer et sauvegarder le nouvel utilisateur
		const newUser = new User({
			email,
			password: hashedPassword,
			isOnboarded: false, // Il devra remplir le questionnaire après
			profile: {
				firstName,
				lastName,
				searchDomain: targetRole,
			},
		});

		const savedUser = await newUser.save();

		// 4. Générer un token JWT pour le connecter directement après l'inscription
		const token = jwt.sign(
			{ userId: savedUser._id, email: savedUser.email },
			JWT_SECRET,
			{ expiresIn: "7d" }, // Le token expire dans 7 jours
		);

		res.status(201).json({
			success: true,
			message: "Inscription réussie !",
			token,
			data: {
				id: savedUser._id,
				email: savedUser.email,
				isOnboarded: savedUser.isOnboarded,
				profile: savedUser.profile,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de l'inscription",
			error: error.message,
		});
	}
};

// --- CONNEXION ---
export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// 1. Chercher l'utilisateur par son email
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "Email ou mot de passe incorrect.",
			});
		}

		// 2. Comparer le mot de passe tapé avec le mot de passe crypté en base
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json({
				success: false,
				message: "Email ou mot de passe incorrect.",
			});
		}

		// 3. Générer un nouveau token JWT
		const token = jwt.sign(
			{ userId: user._id, email: user.email },
			JWT_SECRET,
			{ expiresIn: "7d" },
		);

		res.status(200).json({
			success: true,
			message: "Connexion réussie !",
			token,
			data: {
				id: user._id,
				email: user.email,
				isOnboarded: user.isOnboarded,
				profile: user.profile,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la connexion",
			error: error.message,
		});
	}
};

// --- RÉINITIALISATION DE MOT DE PASSE (DÉMONSTRATION) ---
export const resetPassword = async (req, res) => {
	try {
		const { email, code, newPassword } = req.body;

		if (code !== RESET_PASSWORD_CODE) {
			return res.status(400).json({
				success: false,
				message: "Code de réinitialisation invalide.",
			});
		}

		if (!newPassword || newPassword.length < 8) {
			return res.status(400).json({
				success: false,
				message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
			});
		}

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Aucun compte ne correspond à cette adresse email.",
			});
		}

		user.password = await bcrypt.hash(newPassword, 10);
		await user.save();

		res.status(200).json({
			success: true,
			message: "Mot de passe réinitialisé avec succès.",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la réinitialisation du mot de passe",
			error: error.message,
		});
	}
};

// --- CHANGEMENT DE MOT DE PASSE (UTILISATEUR CONNECTÉ) ---
export const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword || newPassword.length < 8) {
			return res.status(400).json({
				success: false,
				message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
			});
		}

		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Utilisateur introuvable.",
			});
		}

		const isCurrentPasswordValid = await bcrypt.compare(
			currentPassword,
			user.password,
		);
		if (!isCurrentPasswordValid) {
			return res.status(401).json({
				success: false,
				message: "Le mot de passe actuel est incorrect.",
			});
		}

		user.password = await bcrypt.hash(newPassword, 10);
		await user.save();

		res.status(200).json({
			success: true,
			message: "Mot de passe modifié avec succès.",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors du changement de mot de passe",
			error: error.message,
		});
	}
};

// --- FINALISATION DE L'ONBOARDING ---
export const completeOnboarding = async (req, res) => {
	try {
		const { profile } = req.body;
		const user = await User.findById(req.user.userId);

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Utilisateur introuvable.",
			});
		}

		user.profile = { ...user.profile.toObject(), ...profile };
		user.isOnboarded = true;
		await user.save();

		res.status(200).json({
			success: true,
			message: "Profil complété avec succès.",
			data: {
				id: user._id,
				email: user.email,
				isOnboarded: user.isOnboarded,
				profile: user.profile,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la sauvegarde du profil",
			error: error.message,
		});
	}
};

// --- MISE À JOUR DU PROFIL ---
export const updateProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user.userId);

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Utilisateur introuvable.",
			});
		}

		user.profile = { ...user.profile.toObject(), ...req.body.profile };
		await user.save();

		res.status(200).json({
			success: true,
			message: "Profil mis à jour avec succès.",
			data: {
				id: user._id,
				email: user.email,
				isOnboarded: user.isOnboarded,
				profile: user.profile,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Erreur lors de la mise à jour du profil",
			error: error.message,
		});
	}
};
