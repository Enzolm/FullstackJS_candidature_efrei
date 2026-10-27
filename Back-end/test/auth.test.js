import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();

class MockUser {
	constructor(data) {
		Object.assign(this, data);
		this.save = jest.fn(async () => this);
	}

	static findOne = mockFindOne;
	static findById = mockFindById;
}

jest.unstable_mockModule("../src/models/User.js", () => ({
	default: MockUser,
}));

jest.unstable_mockModule("bcrypt", () => ({
	default: {
		hash: mockHash,
		compare: mockCompare,
	},
}));

const { protect } = await import("../src/middlewares/authMiddleware.js");
const {
	register,
	login,
	resetPassword,
	changePassword,
	completeOnboarding,
	updateProfile,
} = await import("../src/controllers/authController.js");

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

const createUser = (overrides = {}) => ({
	_id: "user-123",
	email: "test@example.com",
	password: "hashed-password",
	isOnboarded: false,
	profile: {
		toObject: () => ({
			firstName: "Ada",
			lastName: "Lovelace",
		}),
	},
	save: jest.fn(async function save() {
		return this;
	}),
	...overrides,
});

beforeEach(() => {
	jest.clearAllMocks();
	mockFindOne.mockReset();
	mockFindById.mockReset();
	mockHash.mockReset();
	mockCompare.mockReset();
});

test("protect refuse une requête sans token", () => {
	const response = createResponse();
	const next = jest.fn();

	protect({ headers: {} }, response, next);

	expect(response.statusCode).toBe(401);
	expect(response.body.success).toBe(false);
	expect(next).not.toHaveBeenCalled();
});

test("protect refuse un token invalide ou expiré", () => {
	const response = createResponse();

	protect(
		{ headers: { authorization: "Bearer token-invalide" } },
		response,
		jest.fn(),
	);

	expect(response.statusCode).toBe(401);
	expect(response.body.message).toMatch(/invalide ou expiré/i);
});

test("protect transmet l'identifiant avec un token valide", () => {
	const token = jwt.sign(
		{ userId: "user-123", email: "test@example.com" },
		process.env.JWT_SECRET,
	);
	const request = { headers: { authorization: `Bearer ${token}` } };
	const response = createResponse();
	const next = jest.fn();

	protect(request, response, next);

	expect(next).toHaveBeenCalledTimes(1);
	expect(request.user.userId).toBe("user-123");
});

test("register crée un compte, hash le mot de passe et renvoie un JWT", async () => {
	mockFindOne.mockResolvedValue(null);
	mockHash.mockResolvedValue("hashed-password");
	const response = createResponse();

	await register(
		{
			body: {
				email: "test@example.com",
				password: "mot-de-passe",
				firstName: "Ada",
				lastName: "Lovelace",
				targetRole: "Développement",
			},
		},
		response,
	);

	expect(response.statusCode).toBe(201);
	expect(response.body.success).toBe(true);
	expect(response.body.token).toBeDefined();
	expect(mockHash).toHaveBeenCalledWith("mot-de-passe", 10);
});

test("register refuse un email déjà utilisé", async () => {
	mockFindOne.mockResolvedValue(createUser());
	const response = createResponse();

	await register(
		{ body: { email: "test@example.com", password: "mot-de-passe" } },
		response,
	);

	expect(response.statusCode).toBe(400);
	expect(response.body.message).toMatch(/déjà utilisé/i);
});

test("login renvoie un JWT avec des identifiants valides", async () => {
	mockFindOne.mockResolvedValue(createUser());
	mockCompare.mockResolvedValue(true);
	const response = createResponse();

	await login(
		{
			body: { email: "test@example.com", password: "mot-de-passe" },
		},
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(response.body.success).toBe(true);
	expect(response.body.token).toBeDefined();
	expect(mockCompare).toHaveBeenCalledWith(
		"mot-de-passe",
		"hashed-password",
	);
});

test("login refuse un utilisateur inexistant ou un mauvais mot de passe", async () => {
	const responseForUnknownUser = createResponse();
	mockFindOne.mockResolvedValue(null);

	await login(
		{ body: { email: "unknown@example.com", password: "mot-de-passe" } },
		responseForUnknownUser,
	);

	expect(responseForUnknownUser.statusCode).toBe(401);

	const responseForWrongPassword = createResponse();
	mockFindOne.mockResolvedValue(createUser());
	mockCompare.mockResolvedValue(false);

	await login(
		{ body: { email: "test@example.com", password: "mauvais" } },
		responseForWrongPassword,
	);

	expect(responseForWrongPassword.statusCode).toBe(401);
});

test("resetPassword refuse un code invalide ou un mot de passe trop court", async () => {
	const invalidCodeResponse = createResponse();
	await resetPassword(
		{
			body: {
				email: "test@example.com",
				code: "000000",
				newPassword: "mot-de-passe-valide",
			},
		},
		invalidCodeResponse,
	);
	expect(invalidCodeResponse.statusCode).toBe(400);

	const shortPasswordResponse = createResponse();
	await resetPassword(
		{
			body: {
				email: "test@example.com",
				code: "123456",
				newPassword: "court",
			},
		},
		shortPasswordResponse,
	);
	expect(shortPasswordResponse.statusCode).toBe(400);
});

test("resetPassword modifie le mot de passe d'un compte existant", async () => {
	const user = createUser();
	mockFindOne.mockResolvedValue(user);
	mockHash.mockResolvedValue("new-hashed-password");
	const response = createResponse();

	await resetPassword(
		{
			body: {
				email: "test@example.com",
				code: "123456",
				newPassword: "nouveau-password",
			},
		},
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(user.password).toBe("new-hashed-password");
	expect(user.save).toHaveBeenCalledTimes(1);
});

test("changePassword refuse un mot de passe trop court ou incorrect", async () => {
	const shortResponse = createResponse();
	await changePassword(
		{ body: { currentPassword: "ancien", newPassword: "court" } },
		shortResponse,
	);
	expect(shortResponse.statusCode).toBe(400);

	const wrongPasswordResponse = createResponse();
	mockFindById.mockResolvedValue(createUser());
	mockCompare.mockResolvedValue(false);
	await changePassword(
		{
			user: { userId: "user-123" },
			body: { currentPassword: "mauvais", newPassword: "nouveau-password" },
		},
		wrongPasswordResponse,
	);
	expect(wrongPasswordResponse.statusCode).toBe(401);
});

test("changePassword modifie le mot de passe avec l'ancien mot de passe valide", async () => {
	const user = createUser();
	mockFindById.mockResolvedValue(user);
	mockCompare.mockResolvedValue(true);
	mockHash.mockResolvedValue("new-hashed-password");
	const response = createResponse();

	await changePassword(
		{
			user: { userId: "user-123" },
			body: {
				currentPassword: "ancien-password",
				newPassword: "nouveau-password",
			},
		},
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(user.password).toBe("new-hashed-password");
	expect(user.save).toHaveBeenCalledTimes(1);
});

test("completeOnboarding fusionne le profil et active isOnboarded", async () => {
	const user = createUser();
	mockFindById.mockResolvedValue(user);
	const response = createResponse();

	await completeOnboarding(
		{
			user: { userId: "user-123" },
			body: { profile: { school: "EFREI", location: "Paris" } },
		},
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(user.isOnboarded).toBe(true);
	expect(user.profile).toEqual({
		firstName: "Ada",
		lastName: "Lovelace",
		school: "EFREI",
		location: "Paris",
	});
	expect(user.save).toHaveBeenCalledTimes(1);
});

test("updateProfile conserve les champs existants et ajoute les nouveaux", async () => {
	const user = createUser();
	mockFindById.mockResolvedValue(user);
	const response = createResponse();

	await updateProfile(
		{
			user: { userId: "user-123" },
			body: { profile: { location: "Lyon" } },
		},
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(user.profile).toEqual({
		firstName: "Ada",
		lastName: "Lovelace",
		location: "Lyon",
	});
	expect(user.save).toHaveBeenCalledTimes(1);
});

test("les contrôleurs renvoient 404 si l'utilisateur est introuvable", async () => {
	mockFindById.mockResolvedValue(null);

	const passwordResponse = createResponse();
	await changePassword(
		{
			user: { userId: "missing" },
			body: { currentPassword: "ancien", newPassword: "nouveau-password" },
		},
		passwordResponse,
	);
	expect(passwordResponse.statusCode).toBe(404);

	const onboardingResponse = createResponse();
	await completeOnboarding(
		{ user: { userId: "missing" }, body: { profile: {} } },
		onboardingResponse,
	);
	expect(onboardingResponse.statusCode).toBe(404);

	const profileResponse = createResponse();
	await updateProfile(
		{ user: { userId: "missing" }, body: { profile: {} } },
		profileResponse,
	);
	expect(profileResponse.statusCode).toBe(404);
});
