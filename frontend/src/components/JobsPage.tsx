import { useEffect, useMemo, useState } from "react"
import { AlertCircle, ExternalLink, LoaderCircle, Search } from "lucide-react"
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
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl bg-[#1e463e] p-2.5 text-white hover:bg-[#15332d]"
                    aria-label={`Voir l'offre ${job.title}`}
                  >
                    <ExternalLink className="size-4" />
                  </a>
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
