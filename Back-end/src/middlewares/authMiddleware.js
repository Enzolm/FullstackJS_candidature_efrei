import jwt from "jsonwebtoken";

const JWT_SECRET =
	process.env.JWT_SECRET || "cle_secrete_temporaire_super_securisee";

export const protect = (req, res, next) => {
	try {
		// 1. Récupérer le header "Authorization" de la requête
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				success: false,
				message: "Accès non autorisé. Token manquant.",
			});
		}

		// 2. Extraire le token (en retirant le mot "Bearer ")
		const token = authHeader.split(" ")[1];

		// 3. Vérifier la valadité du token avec notre clé secrète
		const decoded = jwt.verify(token, JWT_SECRET);

		// 4. Ajouter les infos de l'utilisateur décodé à la requête pour les utiliser plus tard
		req.user = decoded;

		// 5. Tout est bon, on passe au contrôleur suivant !
		next();
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: "Token invalide ou expiré.",
			error: error.message,
		});
	}
};
