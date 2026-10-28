import { useEffect, useRef, useState } from "react"
import {
  Download,
  File,
  FileArchive,
  FileImage,
  FileText,
  FolderOpen,
  Grid2X2,
  List,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  Eye,
  X,
} from "lucide-react"
import { DashboardNavbar } from "@/components/DashboardNavbar"

const API_URL = `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api`
const DOCUMENT_TYPES = ["CV", "Lettre de motivation", "Certificat", "Autre"]

type CloudDocument = {
  id: string
  originalName: string
  displayName: string
  category: string
  size: number
  mimeType: string
  createdAt: string
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} octets`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType.includes("pdf") || mimeType.includes("word")) return FileText
  if (mimeType.includes("zip") || mimeType.includes("compressed")) {
    return FileArchive
  }
  return File
}

const getToken = () =>
  localStorage.getItem("token") ?? sessionStorage.getItem("token")

export function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<CloudDocument[]>([])
  const [selectedType, setSelectedType] = useState("CV")
  const [customName, setCustomName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [preview, setPreview] = useState<{
    document: CloudDocument
    url: string
  } | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const filteredDocuments = documents.filter((document) => {
    const query = searchQuery.trim().toLocaleLowerCase()
    if (!query) return true

    const extension = document.originalName.includes(".")
      ? (document.originalName.split(".").pop() ?? "")
      : ""
    return [document.displayName, document.originalName, extension].some(
      (value) => value.toLocaleLowerCase().includes(query)
    )
  })

  const loadDocuments = async () => {
    const token = getToken()
    if (!token) {
      setError("Reconnecte-toi pour accéder à tes documents.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = (await response.json()) as {
        data?: CloudDocument[]
        message?: string
      }
      if (!response.ok || !result.data) {
        throw new Error(
          result.message ?? "Impossible de charger les documents."
        )
      }
      setDocuments(result.data)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Impossible de charger les documents."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const addFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files)
    const token = getToken()
    if (!selectedFiles.length || !token) return
    if (selectedType === "Autre" && !customName.trim()) {
      setError("Indique un nom pour la catégorie Autre.")
      return
    }

    setError("")
    setIsUploading(true)
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("category", selectedType)
        if (selectedType === "Autre")
          formData.append("customName", customName.trim())

        const response = await fetch(`${API_URL}/documents`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const result = (await response.json()) as {
          data?: CloudDocument
          message?: string
        }
        if (!response.ok || !result.data) {
          throw new Error(
            result.message ?? `Impossible d'ajouter ${file.name}.`
          )
        }
        setDocuments((current) => [result.data!, ...current])
      }
      if (selectedType === "Autre") setCustomName("")
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Impossible d'ajouter les fichiers."
      )
    } finally {
      setIsUploading(false)
    }
  }

  const removeDocument = async (id: string) => {
    const token = getToken()
    if (!token) return
    setError("")
    try {
      const response = await fetch(`${API_URL}/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = (await response.json()) as { message?: string }
      if (!response.ok)
        throw new Error(result.message ?? "Suppression impossible.")
      setDocuments((current) =>
        current.filter((document) => document.id !== id)
      )
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer le document."
      )
    }
  }

  const renameDocument = async (id: string) => {
    const token = getToken()
    const name = editingName.trim()
    if (!token || !name) return
    try {
      const response = await fetch(`${API_URL}/documents/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: name }),
      })
      const result = (await response.json()) as {
        data?: CloudDocument
        message?: string
      }
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Impossible de renommer le document.")
      }
      setDocuments((current) =>
        current.map((document) =>
          document.id === id ? result.data! : document
        )
      )
      setEditingId(null)
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "Impossible de renommer le document."
      )
    }
  }

  const downloadDocument = async (document: CloudDocument) => {
    const token = getToken()
    if (!token) return
    try {
      const response = await fetch(
        `${API_URL}/documents/${document.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok)
        throw new Error("Impossible de télécharger le document.")
      const blobUrl = URL.createObjectURL(await response.blob())
      const link = window.document.createElement("a")
      link.href = blobUrl
      link.download = document.originalName
      link.click()
      URL.revokeObjectURL(blobUrl)
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Impossible de télécharger le document."
      )
    }
  }

  /* preview helpers moved below downloadDocument */
  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const previewDocument = async (document: CloudDocument) => {
    const token = getToken()
    if (
      !token ||
      !["application/pdf", "image/"].some((type) =>
        type.endsWith("/")
          ? document.mimeType.startsWith(type)
          : document.mimeType === type
      )
    ) {
      return
    }

    setIsPreviewLoading(true)
    setError("")
    try {
      const response = await fetch(
        `${API_URL}/documents/${document.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok)
        throw new Error("Impossible de prévisualiser le document.")
      const url = URL.createObjectURL(await response.blob())
      if (preview) URL.revokeObjectURL(preview.url)
      setPreview({ document, url })
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Impossible de prévisualiser le document."
      )
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void addFiles(event.dataTransfer.files)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f5f0] font-sans text-[#1e463e] antialiased">
      <DashboardNavbar
        activeNav="documents"
        onActiveNavChange={() => undefined}
        isSidebarOpen={isSidebarOpen}
        onSidebarOpenChange={setIsSidebarOpen}
      />
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1e463e]/50 backdrop-blur-sm lg:hidden"
        />
      )}
      <main className="flex flex-1 flex-col overflow-y-auto pt-16 lg:pt-0">
        <div className="max-w-6xl p-6 lg:p-10">
          <header className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-[#1e463e] p-3 text-white">
              <FolderOpen className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Mon espace documents</h1>
              <p className="mt-1 text-sm text-[#1e463e]/65">
                Tes fichiers sont maintenant sauvegardés sur ton compte.
              </p>
            </div>
          </header>

          <section className="rounded-2xl border border-[#ddd8ce] bg-[#fcfaf7] p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Ajouter un document</h2>
                <p className="mt-1 text-sm text-[#6b7c77]">
                  Le nom original est conservé. Le nom affiché peut être
                  modifié.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-bold">
                  Catégorie
                  <select
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value)}
                    className="ml-3 rounded-xl border border-[#ddd8ce] bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-[#1e463e]"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                {selectedType === "Autre" && (
                  <input
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    placeholder="Nom du document"
                    className="rounded-xl border border-[#ddd8ce] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e463e]"
                  />
                )}
              </div>
            </div>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${isDragging ? "border-[#2b7a78] bg-[#edf4f0]" : "border-[#b8cbc4] bg-white hover:border-[#2b7a78] hover:bg-[#edf4f0]/60"}`}
            >
              <UploadCloud className="mb-3 size-10 text-[#2b7a78]" />
              <p className="font-bold">Dépose tes fichiers ici</p>
              <p className="mt-1 text-sm text-[#1e463e]/60">
                ou clique pour parcourir ton ordinateur
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void addFiles(event.target.files)
                  event.target.value = ""
                }}
              />
            </div>
            {isUploading && (
              <p className="mt-4 flex items-center gap-2 text-sm text-[#1e463e]/65">
                <LoaderCircle className="size-4 animate-spin" />
                Envoi des fichiers...
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
          </section>

          <section className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Mes documents</h2>
              <div className="flex items-center gap-3">
                <label className="relative w-56">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6b7c77]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher..."
                    aria-label="Rechercher un document par nom ou extension"
                    className="w-full rounded-xl border border-[#ddd8ce] bg-white py-2.5 pr-4 pl-10 text-sm transition outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
                  />
                </label>
                git add . git commit -m "feat: add address and commute tracking"
                git push{" "}
                <span className="text-sm text-[#1e463e]/60">
                  {filteredDocuments.length} document
                  {filteredDocuments.length > 1 ? "s" : ""}
                </span>
                <div className="flex rounded-xl border border-[#ddd8ce] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-[#1e463e] text-white" : "text-[#1e463e]/55 hover:text-[#1e463e]"}`}
                    aria-label="Afficher les documents en grille"
                    title="Vue grille"
                  >
                    <Grid2X2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-lg p-2 ${viewMode === "list" ? "bg-[#1e463e] text-white" : "text-[#1e463e]/55 hover:text-[#1e463e]"}`}
                    aria-label="Afficher les documents en liste"
                    title="Vue liste"
                  >
                    <List className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            {isLoading ? (
              <p className="flex items-center gap-2 text-sm text-[#1e463e]/65">
                <LoaderCircle className="size-4 animate-spin" />
                Chargement des documents...
              </p>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#b8cbc4] bg-white p-10 text-center">
                <FolderOpen className="mx-auto mb-3 size-10 text-[#8da399]" />
                <p className="font-bold">Aucun document pour le moment</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#b8cbc4] bg-white p-10 text-center">
                <Search className="mx-auto mb-3 size-10 text-[#8da399]" />
                <p className="font-bold">Aucun document trouvé</p>
                <p className="mt-1 text-sm text-[#1e463e]/60">
                  Essaie avec un autre nom ou une autre extension.
                </p>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    : "space-y-3"
                }
              >
                {filteredDocuments.map((document) => {
                  const Icon = getFileIcon(document.mimeType)
                  const isEditing = editingId === document.id
                  return (
                    <article
                      key={document.id}
                      className={`rounded-2xl border border-[#eae5da] bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)] ${viewMode === "list" ? "flex flex-wrap items-center gap-4" : "flex flex-col"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-xl bg-[#edf4f0] p-2.5 text-[#1e463e]">
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(event) =>
                                  setEditingName(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter")
                                    void renameDocument(document.id)
                                  if (event.key === "Escape") setEditingId(null)
                                }}
                                className="w-full rounded-lg border border-[#b8cbc4] px-2 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-[#1e463e]"
                              />
                            ) : (
                              <h3
                                className="truncate font-bold"
                                title={document.displayName}
                              >
                                {document.displayName}
                              </h3>
                            )}
                            <p
                              className="truncate text-xs text-[#1e463e]/55"
                              title={document.originalName}
                            >
                              {document.originalName}
                            </p>
                            <p className="text-xs text-[#1e463e]/55">
                              {document.category} · {formatSize(document.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg p-2 text-[#1e463e]/45 hover:text-[#d96c4a]"
                              aria-label="Annuler le renommage"
                            >
                              <X className="size-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(document.id)
                                setEditingName(document.displayName)
                              }}
                              className="rounded-lg p-2 text-[#1e463e]/45 hover:text-[#1e463e]"
                              aria-label={`Renommer ${document.displayName}`}
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeDocument(document.id)}
                            className="rounded-lg p-2 text-[#1e463e]/45 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Supprimer ${document.displayName}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      <p
                        className={`${viewMode === "grid" ? "mt-4" : "ml-auto"} text-xs text-[#1e463e]/50`}
                      >
                        Ajouté le{" "}
                        {new Date(document.createdAt).toLocaleDateString(
                          "fr-FR"
                        )}
                      </p>
                      <div
                        className={`${viewMode === "grid" ? "mt-4" : ""} flex gap-2 ${viewMode === "list" ? "ml-auto" : ""}`}
                      >
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => void renameDocument(document.id)}
                            className="rounded-xl bg-[#1e463e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#15332d]"
                          >
                            Enregistrer
                          </button>
                        ) : (
                          <>
                            {(document.mimeType === "application/pdf" ||
                              document.mimeType.startsWith("image/")) && (
                              <button
                                type="button"
                                onClick={() => void previewDocument(document)}
                                className="flex items-center justify-center gap-2 rounded-xl border border-[#1e463e] px-4 py-2.5 text-sm font-bold text-[#1e463e] hover:bg-[#edf4f0]"
                              >
                                <Eye className="size-4" />
                                Aperçu
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void downloadDocument(document)}
                              className="flex items-center justify-center gap-2 rounded-xl bg-[#1e463e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#15332d]"
                            >
                              <Download className="size-4" />
                              Télécharger
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#15332d]/75 p-4"
          onClick={closePreview}
        >
          <div
            className="flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#fcfaf7] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#ddd8ce] px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate font-bold">
                  {preview.document.displayName}
                </h2>
                <p className="truncate text-xs text-[#1e463e]/55">
                  {preview.document.originalName}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-xl p-2 text-[#1e463e]/60 hover:bg-[#f7f5f0]"
                aria-label="Fermer l'aperçu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#eae5da] p-4">
              {preview.document.mimeType.startsWith("image/") ? (
                <img
                  src={preview.url}
                  alt={preview.document.displayName}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <iframe
                  src={preview.url}
                  title={`Aperçu de ${preview.document.displayName}`}
                  className="h-full w-full rounded-lg bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {isPreviewLoading && (
        <div className="fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-xl bg-[#1e463e] px-4 py-3 text-sm font-bold text-white shadow-lg">
          <LoaderCircle className="size-4 animate-spin" />
          Chargement de l’aperçu...
        </div>
      )}
    </div>
  )
}
