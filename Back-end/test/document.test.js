import { jest } from "@jest/globals";

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockUnlink = jest.fn();

jest.unstable_mockModule("../src/models/Document.js", () => ({
	default: {
		find: mockFind,
		findOne: mockFindOne,
		create: mockCreate,
	},
}));

jest.unstable_mockModule("node:fs/promises", () => ({
	default: { unlink: mockUnlink },
}));

const {
	listDocuments,
	uploadDocument,
	downloadDocument,
	updateDocument,
	deleteDocument,
} = await import("../src/controllers/documentController.js");

const createResponse = () => {
	const response = {
		statusCode: 200,
		body: undefined,
		headersSent: false,
		downloaded: undefined,
		status(code) {
			response.statusCode = code;
			return response;
		},
		json(body) {
			response.body = body;
			return response;
		},
		download(filePath, fileName, callback) {
			response.downloaded = { filePath, fileName, callback };
			return response;
		},
	};
	return response;
};

const createDocument = (overrides = {}) => ({
	_id: "doc-1",
	originalName: "cv.pdf",
	displayName: "CV",
	category: "CV",
	mimeType: "application/pdf",
	size: 1234,
	createdAt: new Date("2026-01-01"),
	storedName: "stored-uuid.pdf",
	save: jest.fn(async function save() {
		return this;
	}),
	deleteOne: jest.fn(async () => {}),
	...overrides,
});

const createFile = () => ({
	path: "uploads/stored-uuid.pdf",
	filename: "stored-uuid.pdf",
	originalname: "cv.pdf",
	mimetype: "application/pdf",
	size: 1234,
});

const createRequest = (overrides = {}) => ({
	user: { userId: "user-123" },
	params: {},
	body: {},
	...overrides,
});

const fileError = (code) => Object.assign(new Error("erreur disque"), { code });

beforeEach(() => {
	jest.clearAllMocks();
	mockFind.mockReset();
	mockFindOne.mockReset();
	mockCreate.mockReset();
	mockUnlink.mockReset();
	mockUnlink.mockResolvedValue(undefined);
});

test("listDocuments renvoie les documents de l'utilisateur sans exposer le nom stocké", async () => {
	const sort = jest.fn().mockResolvedValue([createDocument()]);
	mockFind.mockReturnValue({ sort });
	const response = createResponse();

	await listDocuments(createRequest(), response);

	expect(mockFind).toHaveBeenCalledWith({ user: "user-123" });
	expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
	expect(response.statusCode).toBe(200);
	expect(response.body.data).toHaveLength(1);
	expect(response.body.data[0].id).toBe("doc-1");
	expect(response.body.data[0].storedName).toBeUndefined();
});

test("listDocuments renvoie 500 si la base échoue", async () => {
	mockFind.mockReturnValue({
		sort: jest.fn().mockRejectedValue(new Error("db indisponible")),
	});
	const response = createResponse();

	await listDocuments(createRequest(), response);

	expect(response.statusCode).toBe(500);
	expect(response.body.success).toBe(false);
});

test("uploadDocument refuse une requête sans fichier", async () => {
	const response = createResponse();

	await uploadDocument(createRequest({ body: { category: "CV" } }), response);

	expect(response.statusCode).toBe(400);
	expect(mockCreate).not.toHaveBeenCalled();
});

test("uploadDocument refuse une catégorie invalide et supprime le fichier envoyé", async () => {
	const response = createResponse();

	await uploadDocument(
		createRequest({ file: createFile(), body: { category: "Inconnue" } }),
		response,
	);

	expect(response.statusCode).toBe(400);
	expect(mockUnlink).toHaveBeenCalledWith("uploads/stored-uuid.pdf");
	expect(mockCreate).not.toHaveBeenCalled();
});

test("uploadDocument exige un nom pour la catégorie Autre", async () => {
	const response = createResponse();

	await uploadDocument(
		createRequest({
			file: createFile(),
			body: { category: "Autre", customName: "   " },
		}),
		response,
	);

	expect(response.statusCode).toBe(400);
	expect(response.body.message).toMatch(/catégorie Autre/i);
	expect(mockUnlink).toHaveBeenCalledTimes(1);
	expect(mockCreate).not.toHaveBeenCalled();
});

test("uploadDocument enregistre le document avec la catégorie comme nom d'affichage", async () => {
	mockCreate.mockResolvedValue(createDocument());
	const response = createResponse();

	await uploadDocument(
		createRequest({ file: createFile(), body: { category: "CV" } }),
		response,
	);

	expect(mockCreate).toHaveBeenCalledWith(
		expect.objectContaining({
			user: "user-123",
			originalName: "cv.pdf",
			displayName: "CV",
			category: "CV",
			storedName: "stored-uuid.pdf",
			mimeType: "application/pdf",
			size: 1234,
		}),
	);
	expect(response.statusCode).toBe(201);
	expect(response.body.data.storedName).toBeUndefined();
});

test("uploadDocument utilise le nom personnalisé pour la catégorie Autre", async () => {
	mockCreate.mockResolvedValue(createDocument({ displayName: "Diplôme" }));

	await uploadDocument(
		createRequest({
			file: createFile(),
			body: { category: "Autre", customName: " Diplôme " },
		}),
		createResponse(),
	);

	expect(mockCreate.mock.calls[0][0].displayName).toBe("Diplôme");
});

test("uploadDocument supprime le fichier et renvoie 500 si la base échoue", async () => {
	mockCreate.mockRejectedValue(new Error("db indisponible"));
	const response = createResponse();

	await uploadDocument(
		createRequest({ file: createFile(), body: { category: "CV" } }),
		response,
	);

	expect(response.statusCode).toBe(500);
	expect(mockUnlink).toHaveBeenCalledWith("uploads/stored-uuid.pdf");
});

test("downloadDocument renvoie 404 si le document est introuvable", async () => {
	mockFindOne.mockResolvedValue(null);
	const response = createResponse();

	await downloadDocument(createRequest({ params: { id: "missing" } }), response);

	expect(mockFindOne).toHaveBeenCalledWith({
		_id: "missing",
		user: "user-123",
	});
	expect(response.statusCode).toBe(404);
	expect(response.downloaded).toBeUndefined();
});

test("downloadDocument envoie le fichier sous son nom d'origine", async () => {
	mockFindOne.mockResolvedValue(createDocument());
	const response = createResponse();

	await downloadDocument(createRequest({ params: { id: "doc-1" } }), response);

	expect(response.downloaded.filePath).toMatch(/stored-uuid\.pdf$/);
	expect(response.downloaded.fileName).toBe("cv.pdf");
});

test("downloadDocument renvoie 500 si l'envoi du fichier échoue", async () => {
	mockFindOne.mockResolvedValue(createDocument());
	const response = createResponse();

	await downloadDocument(createRequest({ params: { id: "doc-1" } }), response);
	response.downloaded.callback(fileError("ENOENT"));

	expect(response.statusCode).toBe(500);
});

test("updateDocument refuse un nom d'affichage vide", async () => {
	const response = createResponse();

	await updateDocument(
		createRequest({ params: { id: "doc-1" }, body: { displayName: "   " } }),
		response,
	);

	expect(response.statusCode).toBe(400);
	expect(mockFindOne).not.toHaveBeenCalled();
});

test("updateDocument renvoie 404 si le document est introuvable", async () => {
	mockFindOne.mockResolvedValue(null);
	const response = createResponse();

	await updateDocument(
		createRequest({ params: { id: "missing" }, body: { displayName: "Nouveau" } }),
		response,
	);

	expect(response.statusCode).toBe(404);
});

test("updateDocument renomme le document en supprimant les espaces", async () => {
	const document = createDocument();
	mockFindOne.mockResolvedValue(document);
	const response = createResponse();

	await updateDocument(
		createRequest({
			params: { id: "doc-1" },
			body: { displayName: " CV 2026 " },
		}),
		response,
	);

	expect(response.statusCode).toBe(200);
	expect(document.displayName).toBe("CV 2026");
	expect(document.save).toHaveBeenCalledTimes(1);
});

test("deleteDocument renvoie 404 si le document est introuvable", async () => {
	mockFindOne.mockResolvedValue(null);
	const response = createResponse();

	await deleteDocument(createRequest({ params: { id: "missing" } }), response);

	expect(response.statusCode).toBe(404);
	expect(mockUnlink).not.toHaveBeenCalled();
});

test("deleteDocument supprime le fichier puis le document", async () => {
	const document = createDocument();
	mockFindOne.mockResolvedValue(document);
	const response = createResponse();

	await deleteDocument(createRequest({ params: { id: "doc-1" } }), response);

	expect(mockUnlink).toHaveBeenCalledTimes(1);
	expect(mockUnlink.mock.calls[0][0]).toMatch(/stored-uuid\.pdf$/);
	expect(document.deleteOne).toHaveBeenCalledTimes(1);
	expect(response.statusCode).toBe(200);
});

test("deleteDocument supprime quand même le document si le fichier est déjà absent", async () => {
	const document = createDocument();
	mockFindOne.mockResolvedValue(document);
	mockUnlink.mockRejectedValue(fileError("ENOENT"));
	const response = createResponse();

	await deleteDocument(createRequest({ params: { id: "doc-1" } }), response);

	expect(document.deleteOne).toHaveBeenCalledTimes(1);
	expect(response.statusCode).toBe(200);
});

test("deleteDocument renvoie 500 et garde le document si le fichier ne peut pas être supprimé", async () => {
	const document = createDocument();
	mockFindOne.mockResolvedValue(document);
	mockUnlink.mockRejectedValue(fileError("EACCES"));
	const response = createResponse();

	await deleteDocument(createRequest({ params: { id: "doc-1" } }), response);

	expect(response.statusCode).toBe(500);
	expect(document.deleteOne).not.toHaveBeenCalled();
});
