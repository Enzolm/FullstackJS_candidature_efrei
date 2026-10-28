import Application from "../models/Application.js";
import User from "../models/User.js";

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const geocode = async (query) => {
	const response = await fetch(
		`${BAN_URL}?q=${encodeURIComponent(query)}&limit=1`,
	);
	if (!response.ok) return null;

	const result = await response.json();
	const coordinates = result.features?.[0]?.geometry?.coordinates;
	if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

	return {
		longitude: Number(coordinates[0]),
		latitude: Number(coordinates[1]),
	};
};

const getApplicationAddress = (application) =>
	[application.address, application.city].filter(Boolean).join(", ");

export const getCommuteAnalytics = async (req, res) => {
	try {
		const user = await User.findById(req.user.userId).select("profile.homeAddress");
		const homeAddress = user?.profile?.homeAddress;

		if (!homeAddress?.latitude || !homeAddress?.longitude) {
			return res.status(200).json({
				success: true,
				data: {
					configured: false,
					averageMinutes: null,
					calculatedTrips: 0,
					totalApplications: 0,
					missingAddresses: 0,
					details: [],
				},
			});
		}

		const applications = await Application.find({
			user: req.user.userId,
		}).select("company position address city");

		const details = [];
		let missingAddresses = 0;

		for (const application of applications) {
			const address = getApplicationAddress(application);
			if (!address) {
				missingAddresses += 1;
				continue;
			}

			const destination = await geocode(address);
			if (!destination) {
				missingAddresses += 1;
				continue;
			}

			const routeResponse = await fetch(
				`${OSRM_URL}/${homeAddress.longitude},${homeAddress.latitude};${destination.longitude},${destination.latitude}?overview=false`,
			);
			if (!routeResponse.ok) {
				missingAddresses += 1;
				continue;
			}

			const routeResult = await routeResponse.json();
			const durationSeconds = routeResult.routes?.[0]?.duration;
			if (!Number.isFinite(durationSeconds)) {
				missingAddresses += 1;
				continue;
			}

			details.push({
				applicationId: application._id,
				company: application.company,
				position: application.position,
				address,
				minutes: Math.round(durationSeconds / 60),
				origin: {
					label: homeAddress.label,
					latitude: homeAddress.latitude,
					longitude: homeAddress.longitude,
				},
				destination: {
					label: address,
					latitude: destination.latitude,
					longitude: destination.longitude,
				},
			});
		}

		const averageMinutes = details.length
			? Math.round(
					details.reduce((sum, detail) => sum + detail.minutes, 0) /
						details.length,
				)
			: null;

		return res.status(200).json({
			success: true,
			data: {
				configured: true,
				averageMinutes,
				calculatedTrips: details.length,
				totalApplications: applications.length,
				missingAddresses,
				details,
			},
		});
	} catch (error) {
		return res.status(502).json({
			success: false,
			message: "Impossible de calculer les temps de trajet.",
			error: error.message,
		});
	}
};
