import User from "../models/User.js";

const ARBEITNOW_URL = "https://www.arbeitnow.fr/api/job-board-api";

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const normalize = (value) =>
	clean(value)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

const buildLocation = (profile) =>
	clean(profile.location).replace(/[,;].*$/, "").trim();

const searchArbeitnow = async ({ query, domain, degree, location, contractType }) => {
	const response = await fetch(ARBEITNOW_URL, {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error(`Arbeitnow a répondu avec le statut ${response.status}.`);
	}

	const data = await response.json();
	if (!Array.isArray(data.data)) {
		throw new Error("La réponse Arbeitnow est invalide.");
	}

	const searchTerms = [query, domain, degree]
		.map(normalize)
		.filter((term) => term.length > 2);
	const locationTerm = normalize(location);
	const contractTerm = normalize(contractType);

	return data.data
		.filter((job) => {
			const searchable = normalize(
				[
					job.title,
					job.description,
					job.company_name,
					job.location,
					job.remote,
					job.job_types,
					...(Array.isArray(job.tags) ? job.tags : []),
				].join(" "),
			);
			const matchesSearch =
				searchTerms.length === 0 ||
				searchTerms.some((term) => searchable.includes(term));
			const matchesLocation =
				!locationTerm ||
				normalize(job.location).includes(locationTerm) ||
				normalize(job.description).includes(locationTerm) ||
				normalize(job.remote).includes(locationTerm);
			const matchesContract =
				!contractTerm || searchable.includes(contractTerm);

			return matchesSearch && matchesLocation && matchesContract;
		})
		.map((job) => ({
			id: `arbeitnow-${job.slug || job.id}`,
			source: "Arbeitnow",
			title: job.title ?? "Offre sans intitulé",
			link: job.url ?? "",
			description: job.description ?? "",
			publishedAt: job.created_at ?? "",
			category: Array.isArray(job.tags) ? job.tags.join(", ") : "",
			location: job.location ?? "",
			company: job.company_name ?? "",
		}));
};

export const searchJobs = async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select("profile");
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Utilisateur introuvable.",
			});
		}

		const profile = user.profile?.toObject?.() ?? user.profile ?? {};
		const query = clean(req.query.query);
		const domain = Object.prototype.hasOwnProperty.call(req.query, "domain")
			? clean(req.query.domain)
			: clean(profile.searchDomain);
		const degree = Object.prototype.hasOwnProperty.call(req.query, "degree")
			? clean(req.query.degree)
			: clean(profile.currentDegree);
		const location = Object.prototype.hasOwnProperty.call(req.query, "location")
			? clean(req.query.location)
			: buildLocation(profile);
		const contractType = Object.prototype.hasOwnProperty.call(
			req.query,
			"contractType",
		)
			? clean(req.query.contractType)
			: clean(profile.contractType);
		const jobs = await searchArbeitnow({
			query,
			domain,
			degree,
			location,
			contractType,
		});
		const uniqueJobs = [...new Map(jobs.map((job) => [job.id, job])).values()]
			.sort(
				(first, second) =>
					new Date(second.publishedAt || 0) -
					new Date(first.publishedAt || 0),
			);

		return res.status(200).json({
			success: true,
			data: uniqueJobs,
			preferences: { query, domain, degree, location, contractType },
		});
	} catch (error) {
		return res.status(502).json({
			success: false,
			message: "Impossible de récupérer les offres Arbeitnow.",
			error: error.message,
		});
	}
};
