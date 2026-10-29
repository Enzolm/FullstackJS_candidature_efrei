const GOUV_TIMEOUT_MS = 3500;
const PHOTON_TIMEOUT_MS = 5000;

export const searchAddresses = async (req, res) => {
	try {
		const query = String(req.query.q || "").trim();

		if (query.length < 3) {
			return res.status(200).json({ features: [] });
		}

		const normalizedQuery = query.replace(/\s+/g, " ");

		const gouvResult = await searchFromGouv(normalizedQuery);
		if (gouvResult) {
			return res.status(200).json({ features: gouvResult, source: "gouv" });
		}

		const photonResult = await searchFromPhoton(normalizedQuery);
		if (photonResult) {
			return res.status(200).json({ features: photonResult, source: "photon" });
		}

		return res.status(502).json({
			success: false,
			message: "Les services d'adresses sont momentanément indisponibles.",
		});
	} catch (error) {
		return res.status(502).json({
			success: false,
			message: "Impossible de rechercher cette adresse.",
			error: error.message,
		});
	}
};

async function searchFromGouv(query) {
	try {
		const response = await fetch(
			`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`,
			{
				signal: AbortSignal.timeout(GOUV_TIMEOUT_MS),
				headers: { Accept: "application/json" },
			},
		);
		if (!response.ok) return null;
		const result = await response.json();
		return result.features ?? [];
	} catch (error) {
		console.warn("[addresses] gouv failed, falling back:", error.message);
		return null;
	}
}

async function searchFromPhoton(query) {
	try {
		const response = await fetch(
			`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=fr`,
			{
				signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
				headers: { Accept: "application/json" },
			},
		);
		if (!response.ok) return null;
		const result = await response.json();
		return (result.features ?? [])
			.filter((feature) => feature.properties?.countrycode === "FR")
			.map(toGouvFeature);
	} catch (error) {
		console.warn("[addresses] photon failed:", error.message);
		return null;
	}
}

// Photon → même shape que l'API gouv (features[].properties.label, .city, .postcode, geometry.coordinates)
function toGouvFeature(feature) {
	const p = feature.properties ?? {};
	const parts = [
		[p.housenumber, p.street].filter(Boolean).join(" "),
		[p.postcode, p.city].filter(Boolean).join(" "),
	].filter(Boolean);
	return {
		type: "Feature",
		geometry: feature.geometry,
		properties: {
			label: parts.join(", ") || p.name || "",
			postcode: p.postcode ?? "",
			city: p.city ?? "",
			name: p.name ?? "",
			street: p.street ?? "",
			housenumber: p.housenumber ?? "",
		},
	};
}
