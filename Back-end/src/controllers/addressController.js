export const searchAddresses = async (req, res) => {
	try {
		const query = String(req.query.q || "").trim();

		if (query.length < 3) {
			return res.status(200).json({ features: [] });
		}

		const response = await fetch(
			`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
		);

		if (!response.ok) {
			return res.status(502).json({
				success: false,
				message: "Le service d'adresses est temporairement indisponible.",
			});
		}

		const result = await response.json();
		return res.status(200).json({ features: result.features ?? [] });
	} catch (error) {
		return res.status(502).json({
			success: false,
			message: "Impossible de rechercher cette adresse.",
			error: error.message,
		});
	}
};
