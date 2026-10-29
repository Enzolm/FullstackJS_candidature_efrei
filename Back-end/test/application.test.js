import { jest } from "@jest/globals";

const mockFindOne = jest.fn();
const mockFind = jest.fn();
const mockFindOneAndDelete = jest.fn();

class MockApplication {
	constructor(data) {
		Object.assign(this, data);
		this.save = jest.fn(async () => this);
	}

	static findOne = mockFindOne;
	static find = mockFind;
	static findOneAndDelete = mockFindOneAndDelete;
}

jest.unstable_mockModule("../src/models/Application.js", () => ({
	default: MockApplication,
}));

const {
	createApplication,
	getApplications,
	getApplicationById,
	updateApplication,
	deleteApplication,
} = await import("../src/controllers/applicationController.js");

const createResponse = () => {
	const response = {
		statusCode: 200,
		body: undefined,
		status(code) {
			response.statusCode = code;
			return response;
		},
		json(body) {
			response.body = body;
			return response;
		},
	};
	return response;
};

const createApplicationDocument = (overrides = {}) => {
	const application = {
		_id: "app-1",
		company: "Acme",
		position: "Développeur",
		status: "postulé",
		timeline: [],
		set: jest.fn((field, value) => {
			application[field] = value;
		}),
		save: jest.fn(async () => application),
		...overrides,
	};
	return application;
};

const createRequest = (overrides = {}) => ({
	user: { userId: "user-123" },
	params: {},
	body: {},
	...overrides,
});

// createApplication enchaîne findOne(...).select(...)
const mockDuplicateCheck = (result) => {
	mockFindOne.mockReturnValue({
		select: jest.fn().mockResolvedValue(result),
	});
};

beforeEach(() => {
	jest.clearAllMocks();
	mockFindOne.mockReset();
	mockFind.mockReset();
	mockFindOneAndDelete.mockReset();
});

test("createApplication refuse une candidature sans entreprise ou sans poste", async () => {
	const missingCompanyResponse = createResponse();
	await createApplication(
		createRequest({ body: { company: "   ", position: "Développeur" } }),
		missingCompanyResponse,
	);
	expect(missingCompanyResponse.statusCode).toBe(400);

	const missingPositionResponse = createResponse();
	await createApplication(
		createRequest({ body: { company: "Acme" } }),
		missingPositionResponse,
	);
	expect(missingPositionResponse.statusCode).toBe(400);
	expect(mockFindOne).not.toHaveBeenCalled();
});

test("createApplication renvoie 409 si l'offre existe déjà", async () => {
	const existing = { _id: "app-1", company: "Acme", position: "Développeur" };
	mockDuplicateCheck(existing);
	const response = createResponse();

	await createApplication(
		createRequest({ body: { company: "acme", position: "développeur" } }),
		response,
	);

	expect(response.statusCode).toBe(409);
	expect(response.body.success).toBe(false);
	expect(response.body.data).toBe(existing);
});

test("createApplication cherche les doublons de l'utilisateur, y compris par jobUrl", async () => {
	mockDuplicateCheck(null);

	await createApplication(
		createRequest({
			body: { company: "Acme", position: "Dev", jobUrl: "https://acme.io/1" },
		}),
		createResponse(),
	);

	const query = mockFindOne.mock.calls[0][0];
	expect(query.user).toBe("user-123");
	expect(query.$or).toContainEqual({ jobUrl: "https://acme.io/1" });
});

test("createApplication enregistre la candidature de l'utilisateur avec une timeline initiale", async () => {
	mockDuplicateCheck(null);
	const response = createResponse();

	await createApplication(
		createRequest({
			body: {
				company: "  Acme ",
				position: " Développeur ",
				jobUrl: "   ",
				status: "en attente",
			},
		}),
		response,
	);

	expect(response.statusCode).toBe(201);
	expect(response.body.success).toBe(true);

	const created = response.body.data;
	expect(created.user).toBe("user-123");
	expect(created.company).toBe("Acme");
	expect(created.position).toBe("Développeur");
	expect(created.jobUrl).toBeUndefined();
	expect(created.timeline).toHaveLength(1);
	expect(created.timeline[0].note).toMatch(/en attente/);
	expect(created.save).toHaveBeenCalledTimes(1);
});

test("createApplication renvoie 400 si la base échoue", async () => {
	mockFindOne.mockReturnValue({
		select: jest.fn().mockRejectedValue(new Error("db indisponible")),
	});
	const response = createResponse();

	await createApplication(
		createRequest({ body: { company: "Acme", position: "Dev" } }),
		response,
	);

	expect(response.statusCode).toBe(400);
	expect(response.body.success).toBe(false);
});

test("getApplications renvoie les candidatures de l'utilisateur, les plus récentes d'abord", async () => {
	const applications = [{ _id: "1" }, { _id: "2" }];
	const sort = jest.fn().mockResolvedValue(applications);
	mockFind.mockReturnValue({ sort });
	const response = createResponse();

	await getApplications(createRequest(), response);

	expect(mockFind).toHaveBeenCalledWith({ user: "user-123" });
	expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
	expect(response.statusCode).toBe(200);
	expect(response.body.count).toBe(2);
	expect(response.body.data).toBe(applications);
});

test("getApplications renvoie 500 si la base échoue", async () => {
	mockFind.mockReturnValue({
		sort: jest.fn().mockRejectedValue(new Error("db indisponible")),
	});
	const response = createResponse();

	await getApplications(createRequest(), response);

	expect(response.statusCode).toBe(500);
	expect(response.body.success).toBe(false);
});

test("getApplicationById cherche par identifiant et par utilisateur", async () => {
	const application = createApplicationDocument();
	mockFindOne.mockResolvedValue(application);
	const response = createResponse();

	await getApplicationById(createRequest({ params: { id: "app-1" } }), response);

	expect(mockFindOne).toHaveBeenCalledWith({
		_id: "app-1",
		user: "user-123",
	});
	expect(response.statusCode).toBe(200);
	expect(response.body.data).toBe(application);
});

test("getApplicationById renvoie 404 si la candidature est introuvable", async () => {
	mockFindOne.mockResolvedValue(null);
	const response = createResponse();

	await getApplicationById(createRequest({ params: { id: "missing" } }), response);

	expect(response.statusCode).toBe(404);
});

test("getApplicationById renvoie 500 si la requête échoue", async () => {
	mockFindOne.mockRejectedValue(new Error("identifiant invalide"));
	const response = createResponse();

	await getApplicationById(createRequest({ params: { id: "bad" } }), response);

	expect(response.statusCode).toBe(500);
});

test("updateApplication renvoie 404 si la candidature est introuvable", async () => {
	mockFindOne.mockResolvedValue(null);
	const response = createResponse();

	await updateApplication(
		createRequest({ params: { id: "missing" }, body: { city: "Paris" } }),
		response,
	);

	expect(response.statusCode).toBe(404);
});

test("updateApplication modifie les champs autorisés et ignore les autres", async () => {
	const application = createApplicationDocument();
	mockFindOne.mockResolvedValue(application);
	const response = createResponse();

	await updateApplication(
		createRequest({
			params: { id: "app-1" },
			body: { city: "Paris", user: "autre-user", timeline: ["x"] },
		}),
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(application.city).toBe("Paris");
	expect(application.user).toBeUndefined();
	expect(application.timeline).toEqual([]);
	expect(application.save).toHaveBeenCalledTimes(1);
});

test("updateApplication ajoute une entrée à la timeline quand le statut change", async () => {
	const application = createApplicationDocument();
	mockFindOne.mockResolvedValue(application);

	await updateApplication(
		createRequest({ params: { id: "app-1" }, body: { status: "refusé" } }),
		createResponse(),
	);

	expect(application.timeline).toHaveLength(1);
	expect(application.timeline[0].note).toBe("postulé → refusé");
});

test("updateApplication n'ajoute rien à la timeline si le statut est identique", async () => {
	const application = createApplicationDocument();
	mockFindOne.mockResolvedValue(application);

	await updateApplication(
		createRequest({ params: { id: "app-1" }, body: { status: "postulé" } }),
		createResponse(),
	);

	expect(application.timeline).toHaveLength(0);
});

test("updateApplication renvoie 400 si la sauvegarde échoue", async () => {
	const application = createApplicationDocument({
		save: jest.fn().mockRejectedValue(new Error("statut invalide")),
	});
	mockFindOne.mockResolvedValue(application);
	const response = createResponse();

	await updateApplication(
		createRequest({ params: { id: "app-1" }, body: { status: "inconnu" } }),
		response,
	);

	expect(response.statusCode).toBe(400);
	expect(response.body.success).toBe(false);
});

test("deleteApplication supprime la candidature de l'utilisateur", async () => {
	mockFindOneAndDelete.mockResolvedValue({ _id: "app-1" });
	const response = createResponse();

	await deleteApplication(createRequest({ params: { id: "app-1" } }), response);

	expect(mockFindOneAndDelete).toHaveBeenCalledWith({
		_id: "app-1",
		user: "user-123",
	});
	expect(response.statusCode).toBe(200);
	expect(response.body.success).toBe(true);
});

test("deleteApplication renvoie 404 si la candidature est introuvable", async () => {
	mockFindOneAndDelete.mockResolvedValue(null);
	const response = createResponse();

	await deleteApplication(createRequest({ params: { id: "missing" } }), response);

	expect(response.statusCode).toBe(404);
});

test("deleteApplication renvoie 500 si la base échoue", async () => {
	mockFindOneAndDelete.mockRejectedValue(new Error("db indisponible"));
	const response = createResponse();

	await deleteApplication(createRequest({ params: { id: "app-1" } }), response);

	expect(response.statusCode).toBe(500);
});
