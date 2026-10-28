import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Check,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react"
import { DashboardNavbar } from "@/components/DashboardNavbar"

const API_URL = `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api`

type Job = {
  id: string
  title: string
  link: string
  description: string
  publishedAt: string
  category: string
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [addingJobId, setAddingJobId] = useState<string | null>(null)
  const [addedJobLinks, setAddedJobLinks] = useState<string[]>([])
  const [addError, setAddError] = useState("")

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const token =
          localStorage.getItem("token") ?? sessionStorage.getItem("token")
        const response = await fetch(`${API_URL}/jobs/rss`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = (await response.json()) as {
          success: boolean
          data?: Job[]
          message?: string
        }

        if (!response.ok || !data.data) {
          throw new Error(data.message ?? "Impossible de charger les offres.")
        }

        setJobs(data.data)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger les offres."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadJobs()
  }, [])

  // Retrouve les offres déjà ajoutées au dashboard (même lien d'offre)
  useEffect(() => {
    const loadAddedJobs = async () => {
      const token =
        localStorage.getItem("token") ?? sessionStorage.getItem("token")

      if (!token) return

      try {
        const response = await fetch(`${API_URL}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = (await response.json()) as {
          data?: { jobUrl?: string }[]
        }

        if (!response.ok || !Array.isArray(result.data)) return

        setAddedJobLinks(
          result.data.flatMap((application) =>
            application.jobUrl ? [application.jobUrl] : []
          )
        )
      } catch {
        // Sans cette liste, le bouton reste simplement actif
      }
    }

    void loadAddedJobs()
  }, [])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return jobs

    return jobs.filter((job) =>
      [job.title, job.description, job.category]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [jobs, query])

  const handleAddToDashboard = async (job: Job) => {
    // Le titre du flux a la forme "Entreprise: Poste"
    const separatorIndex = job.title.indexOf(": ")
    const hasCompany = separatorIndex > 0
    const dataToSend = {
      company: hasCompany ? job.title.slice(0, separatorIndex) : "Non précisée",
      position: hasCompany ? job.title.slice(separatorIndex + 2) : job.title,
      jobUrl: job.link,
      channel: "Site",
      status: "postulé",
    }
    const token =
      localStorage.getItem("token") ?? sessionStorage.getItem("token")

    if (!token) {
      setAddError("Reconnecte-toi pour ajouter une offre.")
      return
    }

    setAddError("")
    setAddingJobId(job.id)

    try {
      const response = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      })
      const result = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(
          result.message ??
            `Le serveur a refusé la candidature (${response.status}).`
        )
      }

      setAddedJobLinks((previous) => [...previous, job.link])
    } catch (requestError) {
      setAddError(
        requestError instanceof Error
          ? requestError.message
          : "Impossible d'ajouter l'offre."
      )
    } finally {
      setAddingJobId(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f5f0] font-sans text-[#1e463e] antialiased">
      <DashboardNavbar
        activeNav="jobs"
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
        <div className="p-6 lg:p-10">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Offres d’emploi</h1>
            <p className="mt-1 text-sm font-medium text-[#1e463e]/65">
              Les dernières offres remote full-stack de We Work Remotely.
            </p>
          </header>

          <div className="mb-6 max-w-2xl">
            <div className="relative">
              <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#1e463e]/45" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un poste, une compétence..."
                className="w-full rounded-2xl border border-transparent bg-white py-3.5 pr-4 pl-12 text-sm shadow-[0_4px_15px_rgba(30,70,62,0.04)] outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[#1e463e]/65">
              <LoaderCircle className="size-4 animate-spin" />
              Chargement des offres...
            </div>
          )}

          {error && (
            <div className="flex max-w-2xl items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="size-5 shrink-0" />
              {error}
            </div>
          )}

          {addError && (
            <div className="mb-5 flex max-w-2xl items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="size-5 shrink-0" />
              {addError}
            </div>
          )}

          {!isLoading && !error && filteredJobs.length === 0 && (
            <p className="text-sm text-[#1e463e]/65">Aucune offre trouvée.</p>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-2xl border border-[#eae5da] bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">{job.title}</h2>
                    <p className="mt-1 text-xs text-[#1e463e]/55">
                      {job.category || "Full-stack programming"}{" "}
                      {job.publishedAt &&
                        `· ${new Date(job.publishedAt).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAddToDashboard(job)}
                      disabled={
                        addingJobId === job.id ||
                        addedJobLinks.includes(job.link)
                      }
                      className="rounded-xl bg-[#2b7a78] p-2.5 text-white hover:bg-[#1f5c5a] disabled:cursor-not-allowed disabled:bg-[#8b9b95] disabled:opacity-60"
                      aria-label={
                        addedJobLinks.includes(job.link)
                          ? `L'offre ${job.title} est déjà dans le dashboard`
                          : `Ajouter l'offre ${job.title} au dashboard`
                      }
                    >
                      {addingJobId === job.id ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : addedJobLinks.includes(job.link) ? (
                        <Check className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </button>
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-[#1e463e] p-2.5 text-white hover:bg-[#15332d]"
                      aria-label={`Voir l'offre ${job.title}`}
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-[#1e463e]/70">
                  {job.description.replace(/<[^>]*>/g, " ")}
                </p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
