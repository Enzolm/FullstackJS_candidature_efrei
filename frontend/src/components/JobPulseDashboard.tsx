import { useEffect, useMemo, useState } from "react"
import {
  ChartLine,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Clock,
  FileText,
  FileType,
  Mail,
  Phone,
  Users,
  Globe,
  Bell,
  AlertTriangle,
  CalendarCheck,
  TrendingUp,
  X,
  Paperclip,
  Filter,
  ArrowUpDown,
  Eye,
  UploadCloud,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardNavbar } from "@/components/DashboardNavbar"
import { useAuth } from "@/hooks/auth/useAuth"

const API_URL = `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api`

/* ------------------------------------------------------------------ */
/*                              Types                                 */
/* ------------------------------------------------------------------ */

type Status = "applied" | "interview" | "offer" | "followup" | "rejected"

type TimelineEntry = {
  date: string
  type: "email" | "call" | "interview" | "note"
  title: string
  note?: string
}

type Application = {
  id: string
  company: string
  role: string
  sentAt: string
  status: Status
  channel: "LinkedIn" | "WTTJ" | "Site" | "Référence"
  docs: { cv: boolean; lm: boolean }
  timeline: TimelineEntry[]
  followupDue?: string
}

/* ------------------------------------------------------------------ */
/*                        Palette + metadata                          */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<
  Status,
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  applied: {
    label: "Applied",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  interview: {
    label: "Interview Scheduled",
    bg: "bg-[#2b7a78]/10",
    text: "text-[#2b7a78]",
    dot: "bg-[#2b7a78]",
    pulse: true,
  },
  offer: {
    label: "Offer Received",
    bg: "bg-[#8da399]/20",
    text: "text-[#1e463e]",
    dot: "bg-[#8da399]",
  },
  followup: {
    label: "À relancer",
    bg: "bg-[#d96c4a]/10",
    text: "text-[#d96c4a]",
    dot: "bg-[#d96c4a]",
    pulse: true,
  },
  rejected: {
    label: "Rejected",
    bg: "bg-[#d96c4a]/10",
    text: "text-[#d96c4a]",
    dot: "bg-[#d96c4a]",
  },
}

const CHANNEL_ICON: Record<
  Application["channel"],
  React.ComponentType<{ className?: string }>
> = {
  LinkedIn: Globe,
  WTTJ: Globe,
  Site: Globe,
  Référence: Users,
}

type ApiApplication = {
  _id: string
  company: string
  position: string
  channel?: string
  status: string
  applicationDate: string
  nextFollowUpDate?: string
}

function mapApiApplication(application: ApiApplication): Application {
  const status: Status =
    application.status === "refusé"
      ? "rejected"
      : application.status === "entretien" ||
          application.status === "entretien prévu"
        ? "interview"
        : application.status === "relance faite"
          ? "followup"
          : "applied"
  const availableChannels = ["LinkedIn", "WTTJ", "Site", "Référence"] as const
  const channel =
    availableChannels.find((candidate) => candidate === application.channel) ??
    "Site"
  const sentAt = new Date(application.applicationDate)

  return {
    id: application._id,
    company: application.company,
    role: application.position,
    sentAt: Number.isNaN(sentAt.getTime())
      ? application.applicationDate
      : sentAt.toISOString().slice(0, 10),
    status,
    channel,
    docs: { cv: false, lm: false },
    timeline: [
      {
        date: application.applicationDate,
        type: "email",
        title: "Candidature enregistrée",
      },
    ],
    followupDue: application.nextFollowUpDate,
  }
}

/* ------------------------------------------------------------------ */
/*                         Small components                           */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${meta.bg} ${meta.text}`}
    >
      <span
        className={`size-2 rounded-full ${meta.dot} ${meta.pulse ? "animate-pulse" : ""}`}
      />
      {meta.label}
    </span>
  )
}

function TimelineIcon({ type }: { type: TimelineEntry["type"] }) {
  const base = "size-4"
  if (type === "email") return <Mail className={base} />
  if (type === "call") return <Phone className={base} />
  if (type === "interview") return <Users className={base} />
  return <FileText className={base} />
}

function CompanyAvatar({ name }: { name: string }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-xl font-bold text-[#1e463e]">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                            Dashboard                               */
/* ------------------------------------------------------------------ */

export function JobPulseDashboard() {
  const { user } = useAuth()
  const displayName =
    user?.profile?.firstName || user?.email.split("@")[0] || "Mon compte"
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [applicationsError, setApplicationsError] = useState("")
  const [activeNav, setActiveNav] = useState<string>("dashboard")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [channelFilter, setChannelFilter] = useState<
    Application["channel"] | "all"
  >("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadApplications = async () => {
      const token =
        localStorage.getItem("token") ?? sessionStorage.getItem("token")

      if (!token) {
        setApplicationsError("Reconnecte-toi pour charger tes candidatures.")
        setIsLoadingApplications(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const result = (await response.json()) as {
          data?: ApiApplication[]
          message?: string
        }

        if (!response.ok || !Array.isArray(result.data)) {
          throw new Error(
            result.message ?? "Impossible de charger les candidatures."
          )
        }

        setApplications(result.data.map(mapApiApplication))
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        setApplicationsError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les candidatures."
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingApplications(false)
        }
      }
    }

    void loadApplications()
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchQuery =
        !query ||
        app.company.toLowerCase().includes(query.toLowerCase()) ||
        app.role.toLowerCase().includes(query.toLowerCase())
      const matchStatus = statusFilter === "all" || app.status === statusFilter
      const matchChannel =
        channelFilter === "all" || app.channel === channelFilter
      return matchQuery && matchStatus && matchChannel
    })
  }, [applications, query, statusFilter, channelFilter])

  const kpis = useMemo(() => {
    const active = applications.filter((a) => a.status !== "rejected").length
    const interviews = applications.filter(
      (a) => a.status === "interview"
    ).length
    const answered = applications.filter((a) => a.status !== "applied").length
    const rate =
      applications.length === 0
        ? 0
        : Math.round((answered / applications.length) * 100)
    return { active, interviews, rate }
  }, [applications])

  const followups = useMemo(
    () => applications.filter((a) => a.status === "followup"),
    [applications]
  )

  const upcomingInterviews = useMemo(
    () => applications.filter((a) => a.status === "interview"),
    [applications]
  )

  const handleCreate = async (
    payload: Omit<Application, "id" | "timeline" | "docs" | "status"> & {
      docs: Application["docs"]
    }
  ) => {
    const dataToSend = {
      company: payload.company,
      position: payload.role,
      applicationDate: payload.sentAt,
      channel: payload.channel,
      nextFollowUpDate: payload.followupDue,
      status: "postulé",
    }
    const token =
      localStorage.getItem("token") ?? sessionStorage.getItem("token")

    if (!token) {
      throw new Error("Reconnecte-toi pour enregistrer une candidature.")
    }

    const response = await fetch(`${API_URL}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dataToSend),
    })

    const result = (await response.json()) as {
      data?: ApiApplication
      message?: string
    }

    if (!response.ok) {
      throw new Error(
        result.message ??
          `Le serveur a refusé la candidature (${response.status}).`
      )
    }

    if (!result.data) {
      throw new Error("Le serveur n’a pas renvoyé la candidature enregistrée.")
    }

    const newApp = mapApiApplication(result.data)
    setApplications((prev) => [newApp, ...prev])
  }

  const handleDelete = (id: string) => {
    setApplications((prev) => prev.filter((a) => a.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f5f0] font-sans text-[#1e463e] antialiased">
      <DashboardNavbar
        activeNav={activeNav}
        onActiveNavChange={setActiveNav}
        isSidebarOpen={isSidebarOpen}
        onSidebarOpenChange={setIsSidebarOpen}
      />

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1e463e]/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ===== Main ===== */}
      <main className="flex flex-1 flex-col overflow-hidden pt-16 lg:flex-row lg:pt-0">
        {/* --- Center column --- */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* Header */}
          <header className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="mb-1 text-3xl font-bold">My Job Dashboard</h1>
              <p className="font-medium text-[#1e463e]/70">
                Welcome back, {displayName}. You have{" "}
                <span className="font-bold text-[#d96c4a]">
                  {followups.length} follow-up{followups.length > 1 ? "s" : ""}
                </span>{" "}
                today.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-[#1e463e] px-6 py-3 font-bold text-[#f7f5f0] shadow-[0_8px_30px_rgba(30,70,62,0.08)] transition-all hover:-translate-y-1 hover:bg-[#15332d]"
            >
              <Plus className="size-4" />
              Add Application
            </button>
          </header>

          {/* Search + filters bar */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#1e463e]/50" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher entreprise ou poste…"
                className="w-full rounded-2xl border border-transparent bg-white py-2.5 pr-3 pl-9 text-sm shadow-[0_4px_15px_rgba(30,70,62,0.04)] outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as Status | "all")
              }
              className="rounded-2xl border border-transparent bg-white px-4 py-2.5 text-sm shadow-[0_4px_15px_rgba(30,70,62,0.04)] outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
            >
              <option value="all">Tous statuts</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <select
              value={channelFilter}
              onChange={(e) =>
                setChannelFilter(
                  e.target.value as Application["channel"] | "all"
                )
              }
              className="rounded-2xl border border-transparent bg-white px-4 py-2.5 text-sm shadow-[0_4px_15px_rgba(30,70,62,0.04)] outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
            >
              <option value="all">Tous canaux</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="WTTJ">WTTJ</option>
              <option value="Site">Site</option>
              <option value="Référence">Référence</option>
            </select>
          </div>

          {/* Section title + sort/filter icons */}
          <section className="mb-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Applications</h2>
              <div className="flex gap-2">
                <button
                  className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#1e463e]/60 shadow-[0_4px_15px_rgba(30,70,62,0.04)] hover:text-[#1e463e]"
                  aria-label="Filtrer"
                >
                  <Filter className="size-4" />
                </button>
                <button
                  className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#1e463e]/60 shadow-[0_4px_15px_rgba(30,70,62,0.04)] hover:text-[#1e463e]"
                  aria-label="Trier"
                >
                  <ArrowUpDown className="size-4" />
                </button>
              </div>
            </div>

            {/* Desktop header */}
            <div className="mb-2 hidden grid-cols-12 gap-4 px-6 text-sm font-bold tracking-wide text-[#1e463e]/60 uppercase lg:grid">
              <div className="col-span-3">Company & Role</div>
              <div className="col-span-2">Date Applied</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2">Documents</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {isLoadingApplications && (
              <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#1e463e]/60 shadow-[0_4px_15px_rgba(30,70,62,0.04)]">
                Chargement des candidatures...
              </div>
            )}

            {applicationsError && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              >
                {applicationsError}
              </div>
            )}

            {!isLoadingApplications &&
              !applicationsError &&
              filtered.length === 0 && (
                <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#1e463e]/60 shadow-[0_4px_15px_rgba(30,70,62,0.04)]">
                  {applications.length === 0
                    ? "Aucune candidature enregistrée pour le moment."
                    : "Aucune candidature ne correspond aux filtres."}
                </div>
              )}

            <ul className="flex flex-col gap-4">
              {filtered.map((app) => {
                const Channel = CHANNEL_ICON[app.channel]
                const expanded = expandedId === app.id
                const faded = app.status === "rejected" ? "opacity-75" : ""
                return (
                  <li key={app.id}>
                    <div
                      onClick={() => setExpandedId(expanded ? null : app.id)}
                      className={`group grid cursor-pointer grid-cols-1 items-center gap-4 rounded-2xl border border-transparent bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)] transition-all hover:border-[#8da399]/30 hover:shadow-[0_8px_30px_rgba(30,70,62,0.08)] lg:grid-cols-12 ${faded}`}
                    >
                      {/* Company & Role */}
                      <div className="col-span-3 mb-3 flex items-center gap-4 lg:mb-0">
                        <CompanyAvatar name={app.company} />
                        <div className="min-w-0">
                          <h3 className="truncate text-lg leading-tight font-bold">
                            {app.company}
                          </h3>
                          <p className="truncate text-sm text-[#1e463e]/70">
                            {app.role}
                          </p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 mb-3 flex items-center gap-2 text-sm font-medium text-[#1e463e]/80 lg:mb-0 lg:block">
                        <Clock className="size-4 text-[#1e463e]/50 lg:hidden" />
                        {new Date(app.sentAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </div>

                      {/* Status */}
                      <div className="col-span-3 mb-4 lg:mb-0">
                        <StatusBadge status={app.status} />
                      </div>

                      {/* Docs */}
                      <div className="col-span-2 mb-4 flex items-center gap-3 lg:mb-0">
                        <div className="flex -space-x-2">
                          {app.docs.cv && (
                            <div
                              title="CV"
                              className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#f7f5f0] text-xs text-[#1e463e]/60"
                            >
                              <FileType className="size-3.5" />
                            </div>
                          )}
                          {app.docs.lm && (
                            <div
                              title="Lettre de motivation"
                              className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#f7f5f0] text-xs text-[#1e463e]/60"
                            >
                              <FileText className="size-3.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-2 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId(expanded ? null : app.id)
                          }}
                          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#2b7a78] hover:text-white"
                          aria-label="Voir timeline"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#1e463e] hover:text-white"
                          aria-label="Éditer"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(app.id)
                          }}
                          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#d96c4a] hover:text-white"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {/* Channel + expand chevron (mobile hint) */}
                      <div className="col-span-12 flex items-center justify-between gap-2 border-t border-[#1e463e]/5 pt-3 text-xs text-[#1e463e]/60 lg:hidden">
                        <span className="flex items-center gap-1.5">
                          <Channel className="size-3.5" />
                          {app.channel}
                        </span>
                        {expanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </div>
                    </div>

                    {/* Timeline (accordion) */}
                    {expanded && (
                      <div className="mt-2 rounded-2xl border border-[#8da399]/20 bg-[#f7f5f0]/70 p-6">
                        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#1e463e]">
                          <Clock className="size-4 text-[#2b7a78]" />
                          Timeline des échanges
                        </div>
                        <ol className="relative space-y-5 border-l-2 border-[#8da399]/40 pl-6">
                          {app.timeline.map((entry, i) => (
                            <li key={i} className="relative">
                              <span className="absolute -left-[33px] flex size-7 items-center justify-center rounded-full bg-white text-[#2b7a78] ring-2 ring-[#8da399]/40">
                                <TimelineIcon type={entry.type} />
                              </span>
                              <div className="flex flex-wrap items-baseline gap-x-3">
                                <span className="font-bold">{entry.title}</span>
                                <span className="text-xs text-[#1e463e]/60">
                                  {new Date(entry.date).toLocaleDateString(
                                    "fr-FR",
                                    {
                                      day: "2-digit",
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                              </div>
                              {entry.note && (
                                <p className="mt-1 text-sm text-[#1e463e]/70">
                                  {entry.note}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        {/* --- Right side panel --- */}
        <aside className="w-full overflow-y-auto bg-[#f7f5f0]/60 p-6 lg:p-10 xl:w-96 xl:border-l xl:border-[#1e463e]/10">
          {/* Overview */}
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <ChartLine className="size-5 text-[#2b7a78]" />
            Overview
          </h2>

          <div className="mb-10 grid grid-cols-2 gap-4 xl:grid-cols-1">
            {/* KPI 1 */}
            <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)]">
              <span className="mb-2 text-sm font-bold tracking-wider text-[#1e463e]/60 uppercase">
                Active Applications
              </span>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-[#1e463e]">
                  {kpis.active}
                </span>
                <span className="mb-1 flex items-center gap-1 text-sm font-bold text-[#8da399]">
                  <TrendingUp className="size-3.5" />
                  +3 this week
                </span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)]">
              <span className="mb-2 text-sm font-bold tracking-wider text-[#1e463e]/60 uppercase">
                Interviews
              </span>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-[#2b7a78]">
                  {kpis.interviews}
                </span>
                <span className="mb-1 text-sm font-medium text-[#1e463e]/50">
                  Upcoming
                </span>
              </div>
            </div>

            {/* KPI 3 (full width in xl) */}
            <div className="col-span-2 flex flex-col rounded-2xl bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)] xl:col-span-1">
              <span className="mb-2 text-sm font-bold tracking-wider text-[#1e463e]/60 uppercase">
                Response Rate
              </span>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-[#1e463e]">
                  {kpis.rate}%
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f7f5f0]">
                  <div
                    className="h-full rounded-full bg-[#8da399]"
                    style={{ width: `${kpis.rate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Needed */}
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#d96c4a]">
            <Bell className="size-5" />
            Action Needed
          </h2>

          <div className="flex flex-col gap-4">
            {followups.length === 0 && upcomingInterviews.length === 0 && (
              <div className="rounded-2xl bg-white p-5 text-center text-sm text-[#1e463e]/60 shadow-[0_4px_15px_rgba(30,70,62,0.04)]">
                Tout est à jour. Souffle un coup.
              </div>
            )}

            {/* Follow-up card */}
            {followups.slice(0, 1).map((app) => (
              <div
                key={app.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-l-4 border-[#d96c4a] bg-white p-5 shadow-[0_8px_30px_rgba(30,70,62,0.08)] transition-transform hover:-translate-y-1"
              >
                <Mail className="absolute top-3 right-3 size-10 translate-x-2 -translate-y-2 text-[#d96c4a]/10" />
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#d96c4a]">
                  <AlertTriangle className="size-4" />
                  Follow-up
                </div>
                <h4 className="mb-1 font-bold text-[#1e463e]">
                  {app.company} — {app.role}
                </h4>
                <p className="mb-4 text-sm text-[#1e463e]/70">
                  Candidature envoyée il y a plusieurs jours. Il est temps
                  d'envoyer une relance au recruteur.
                </p>
                <button className="w-full rounded-xl bg-[#d96c4a]/10 py-2 font-bold text-[#d96c4a] transition-colors hover:bg-[#d96c4a] hover:text-white">
                  Générer relance
                </button>
              </div>
            ))}

            {/* Interview prep card */}
            {upcomingInterviews.slice(0, 1).map((app) => (
              <div
                key={app.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-l-4 border-[#2b7a78] bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)] transition-transform hover:-translate-y-1"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#2b7a78]">
                  <CalendarCheck className="size-4" />
                  Interview Prep
                </div>
                <h4 className="mb-1 font-bold text-[#1e463e]">
                  {app.company} — Technical Test
                </h4>
                <p className="mb-4 text-sm text-[#1e463e]/70">
                  Prévu bientôt. Révise la présentation du portfolio et les
                  points techniques.
                </p>
                <button className="w-full rounded-xl bg-[#2b7a78]/10 py-2 font-bold text-[#2b7a78] transition-colors hover:bg-[#2b7a78] hover:text-white">
                  Voir détails
                </button>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* ===== Modal ===== */}
      {isModalOpen && (
        <ApplicationModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                              Modal                                 */
/* ------------------------------------------------------------------ */

function ApplicationModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (
    data: Omit<Application, "id" | "timeline" | "status">
  ) => Promise<void>
}) {
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [channel, setChannel] = useState<Application["channel"]>("LinkedIn")
  const [sentAt, setSentAt] = useState(new Date().toISOString().slice(0, 10))
  const [followupDue, setFollowupDue] = useState("")
  const [cv, setCv] = useState(true)
  const [lm, setLm] = useState(false)
  const [toast, setToast] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = company.trim() && role.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitError("")
    setIsSubmitting(true)

    try {
      await onSubmit({
        company: company.trim(),
        role: role.trim(),
        channel,
        sentAt,
        followupDue: followupDue || undefined,
        docs: { cv, lm },
      })
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Impossible d’enregistrer."
      )
      return
    } finally {
      setIsSubmitting(false)
    }
    setToast(true)
    window.setTimeout(() => {
      setToast(false)
      onClose()
    }, 1200)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1e463e]/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#f7f5f0] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e463e]/10 bg-white px-8 py-6">
          <h2 className="text-2xl font-bold text-[#1e463e]">New Application</h2>
          <button
            onClick={onClose}
            className="text-xl text-[#1e463e]/50 transition-colors hover:text-[#d96c4a]"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-6 p-8">
          {submitError && (
            <p role="alert" className="text-sm text-red-700">
              {submitError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Company Name
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Spotify"
                className="w-full rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Job Title
              </label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <span className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Status at creation
              </span>
              <p className="rounded-xl bg-white px-4 py-3 text-sm text-[#1e463e]/70 shadow-sm">
                Postulé
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Date Applied
              </label>
              <input
                type="date"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as Application["channel"])
                }
                className="w-full cursor-pointer appearance-none rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="WTTJ">WTTJ</option>
                <option value="Site">Site</option>
                <option value="Référence">Référence</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Follow-up Date
              </label>
              <input
                type="date"
                value={followupDue}
                onChange={(e) => setFollowupDue(e.target.value)}
                className="w-full rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
              Attach Documents (CV, Cover Letter)
            </label>
            <div className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1e463e]/20 bg-white py-8 transition-colors hover:bg-[#1e463e]/5">
              <UploadCloud className="mb-2 size-8 text-[#1e463e]/40" />
              <span className="font-medium text-[#1e463e]/70">
                Click to upload or drag & drop
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  cv
                    ? "border-[#2b7a78] bg-[#2b7a78]/10 text-[#2b7a78]"
                    : "border-transparent bg-white text-[#1e463e]/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={cv}
                  onChange={(e) => setCv(e.target.checked)}
                  className="sr-only"
                />
                <Paperclip className="size-4" />
                CV
              </label>
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  lm
                    ? "border-[#2b7a78] bg-[#2b7a78]/10 text-[#2b7a78]"
                    : "border-transparent bg-white text-[#1e463e]/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={lm}
                  onChange={(e) => setLm(e.target.checked)}
                  className="sr-only"
                />
                <Paperclip className="size-4" />
                Lettre de motivation
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl px-6 py-3 font-bold text-[#1e463e] hover:bg-[#1e463e]/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-xl bg-[#1e463e] px-8 py-3 font-bold text-[#f7f5f0] shadow-[0_8px_30px_rgba(30,70,62,0.08)] hover:bg-[#15332d]"
            >
              {isSubmitting ? "Enregistrement..." : "Save Application"}
            </Button>
          </div>
        </form>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#8da399] px-6 py-3 font-bold text-[#1e463e] shadow-[0_8px_30px_rgba(30,70,62,0.08)]">
          <CheckCircle2 className="size-4" />
          Application saved successfully!
        </div>
      )}
    </div>
  )
}

export default JobPulseDashboard
