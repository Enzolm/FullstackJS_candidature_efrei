import { useEffect, useMemo, useState } from "react"
import {
  ChartLine,
  Check,
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
  MapPin,
  Navigation,
  TrendingUp,
  X,
  Paperclip,
  Filter,
  ArrowUpDown,
  Eye,
  UploadCloud,
  CheckCircle2,
} from "lucide-react"
import { Select as BaseSelect } from "@base-ui/react/select"
import { Button } from "@/components/ui/button"
import { DashboardNavbar } from "@/components/DashboardNavbar"
import { useAuth } from "@/hooks/auth/useAuth"

const API_URL = `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api`

/* ------------------------------------------------------------------ */
/*                              Types                                 */
/* ------------------------------------------------------------------ */

type Status =
  | "applied"
  | "pending"
  | "interview"
  | "offer"
  | "followup"
  | "rejected"

type TimelineEntry = {
  date: string
  type: "email" | "call" | "interview" | "note" | "status"
  title: string
  note?: string
}

export type Application = {
  id: string
  company: string
  role: string
  city?: string
  address?: string
  jobUrl?: string
  contact?: {
    name?: string
    email?: string
    phone?: string
  }
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
  pending: {
    label: "En attente",
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
  city?: string
  address?: string
  jobUrl?: string
  contact?: {
    name?: string
    email?: string
    phone?: string
  }
  channel?: string
  status: string
  applicationDate: string
  nextFollowUpDate?: string
  timeline?: {
    date: string
    type: TimelineEntry["type"]
    title: string
    note?: string
  }[]
}

type CommuteSummary = {
  averageMinutes: number | null
  calculatedTrips: number
  configured: boolean
  details: {
    applicationId: string
    minutes: number
    origin: RoutePoint
    destination: RoutePoint
  }[]
}

type RoutePoint = {
  label: string
  latitude: number
  longitude: number
}

export const API_STATUS_BY_UI_STATUS: Record<Status, string> = {
  applied: "postulé",
  pending: "en attente",
  interview: "entretien prévu",
  offer: "offre reçue",
  followup: "relance faite",
  rejected: "refusé",
}

function mapApiApplication(application: ApiApplication): Application {
  const status =
    (Object.keys(API_STATUS_BY_UI_STATUS) as Status[]).find(
      (candidate) =>
        API_STATUS_BY_UI_STATUS[candidate] === application.status
    ) ?? (application.status === "entretien" ? "interview" : "applied")
  const availableChannels = ["LinkedIn", "WTTJ", "Site", "Référence"] as const
  const channel =
    availableChannels.find((candidate) => candidate === application.channel) ??
    "Site"
  const sentAt = new Date(application.applicationDate)

  return {
    id: application._id,
    company: application.company,
    role: application.position,
    city: application.city,
    address: application.address,
    jobUrl: application.jobUrl,
    contact: application.contact,
    sentAt: Number.isNaN(sentAt.getTime())
      ? application.applicationDate
      : sentAt.toISOString().slice(0, 10),
    status,
    channel,
    docs: { cv: false, lm: false },
    timeline: application.timeline?.length
      ? application.timeline
      : [
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

type AddressSuggestion = {
  label: string
  city: string
}

function RouteActions({
  destination,
  destinationPoint,
  origin,
  minutes,
}: {
  destination?: string
  destinationPoint?: RoutePoint
  origin?: RoutePoint
  minutes?: number
}) {
  if (!destination) return null

  const encodedDestination = encodeURIComponent(destination)
  const encodedOrigin = origin ? encodeURIComponent(origin.label) : ""
  const mapsUrl = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`
  const citymapperUrl = origin && destinationPoint
    ? `https://citymapper.com/directions?startcoord=${origin.latitude}%2C${origin.longitude}&endcoord=${destinationPoint?.latitude}%2C${destinationPoint?.longitude}&startname=${encodeURIComponent(origin.label)}&endname=${encodedDestination}&startaddress=${encodedOrigin}&endaddress=${encodedDestination}`
    : `https://citymapper.com/directions?endaddress=${encodedDestination}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf4f0] px-2.5 py-1.5 text-xs font-bold text-[#1e463e] hover:bg-[#2b7a78] hover:text-white"
        title="Ouvrir l’itinéraire dans Google Maps"
      >
        <Navigation className="size-3.5" />
        Itinéraire{minutes !== undefined ? ` · ${minutes} min` : ""}
      </a>
      <a
        href={citymapperUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="text-xs font-bold text-[#2b7a78] underline-offset-2 hover:underline"
        title="Ouvrir la destination dans Citymapper"
      >
        Citymapper
      </a>
    </div>
  )
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: AddressSuggestion) => void
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (value.trim().length < 3) {
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      const token =
        localStorage.getItem("token") ?? sessionStorage.getItem("token")
      if (!token) return

      setIsLoading(true)
      try {
        const response = await fetch(
          `${API_URL}/addresses/search?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        const result = (await response.json()) as {
          features?: {
            properties: { label: string; city?: string }
          }[]
        }
        if (!response.ok) throw new Error("Recherche d’adresse indisponible.")
        setSuggestions(
          (result.features ?? []).map((feature) => ({
            label: feature.properties.label,
            city: feature.properties.city ?? "",
          }))
        )
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [value])

  return (
    <div className="relative">
      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-[#1e463e]/80">
        <MapPin className="size-4 text-[#2b7a78]" />
        Adresse de l’entreprise
        <span className="font-normal text-[#1e463e]/50">(facultatif)</span>
      </label>
      <input
        value={value}
        onChange={(event) => {
          setSuggestions([])
          onChange(event.target.value)
        }}
        placeholder="Commence à saisir l’adresse..."
        autoComplete="street-address"
        className="w-full rounded-xl border border-transparent bg-white px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
      />
      {(isLoading || suggestions.length > 0) && (
        <div className="absolute right-0 left-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#ddd8ce] bg-white shadow-lg">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-[#6b7c77]">
              Recherche des adresses...
            </p>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => {
                  onSelect(suggestion)
                  setSuggestions([])
                }}
                className="block w-full px-4 py-3 text-left text-sm hover:bg-[#edf4f0]"
              >
                {suggestion.label}
              </button>
            ))
          )}
        </div>
      )}
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
  const [commuteMinutes, setCommuteMinutes] = useState<Record<string, number>>({})
  const [commuteRoutes, setCommuteRoutes] = useState<Record<string, CommuteSummary["details"][number]>>({})
  const [commuteAverageMinutes, setCommuteAverageMinutes] = useState<number | null>(null)
  const [calculatedCommuteTrips, setCalculatedCommuteTrips] = useState(0)
  const [activeNav, setActiveNav] = useState<string>("dashboard")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [channelFilter, setChannelFilter] = useState<
    Application["channel"] | "all"
  >("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(
    null
  )
  const [applicationToEdit, setApplicationToEdit] =
    useState<Application | null>(null)
  const [applicationToView, setApplicationToView] =
    useState<Application | null>(null)
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

        const mappedApplications = result.data.map(mapApiApplication)
        setApplications(mappedApplications)

        try {
          const commuteResponse = await fetch(`${API_URL}/analytics/commute`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          const commuteResult = (await commuteResponse.json()) as {
            data?: CommuteSummary
          }
          if (commuteResponse.ok && commuteResult.data) {
            setCommuteAverageMinutes(commuteResult.data.averageMinutes)
            setCalculatedCommuteTrips(commuteResult.data.calculatedTrips)
            setCommuteMinutes(
              Object.fromEntries(
                commuteResult.data.details.map((detail) => [
                  detail.applicationId,
                  detail.minutes,
                ])
              )
            )
            setCommuteRoutes(
              Object.fromEntries(
                commuteResult.data.details.map((detail) => [
                  detail.applicationId,
                  detail,
                ])
              )
            )
          }
        } catch (commuteError) {
          if (commuteError instanceof Error && commuteError.name === "AbortError") {
            return
          }
        }
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

  const averageCommuteMinutes = useMemo(() => {
    return commuteAverageMinutes
  }, [commuteAverageMinutes])

  const handleCreate = async (
    payload: Omit<Application, "id" | "timeline" | "docs" | "status"> & {
      docs: Application["docs"]
    }
  ) => {
    const dataToSend = {
      company: payload.company,
      position: payload.role,
      city: payload.city,
      address: payload.address,
      jobUrl: payload.jobUrl,
      contact: payload.contact,
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

  const handleDelete = async (id: string) => {
    const token =
      localStorage.getItem("token") ?? sessionStorage.getItem("token")

    if (!token) {
      setApplicationsError("Reconnecte-toi pour supprimer une candidature.")
      return
    }

    setApplicationsError("")
    setDeletingApplicationId(id)

    try {
      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = (await response.json()) as { message?: string }

      if (!response.ok) {
        throw new Error(
          result.message ??
            `Le serveur a refusé la suppression (${response.status}).`
        )
      }

      setApplications((previous) =>
        previous.filter((application) => application.id !== id)
      )
      if (expandedId === id) setExpandedId(null)
    } catch (error) {
      setApplicationsError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer la candidature."
      )
    } finally {
      setDeletingApplicationId(null)
    }
  }

  const handleUpdate = async (
    applicationId: string,
    updates: Omit<Application, "id" | "timeline">
  ) => {
    const token =
      localStorage.getItem("token") ?? sessionStorage.getItem("token")

    if (!token) {
      throw new Error("Reconnecte-toi pour modifier une candidature.")
    }

    const response = await fetch(
      `${API_URL}/applications/${applicationId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company: updates.company,
          position: updates.role,
          city: updates.city,
          address: updates.address,
          jobUrl: updates.jobUrl,
          contact: updates.contact,
          applicationDate: updates.sentAt,
          channel: updates.channel,
          nextFollowUpDate: updates.followupDue,
          status: API_STATUS_BY_UI_STATUS[updates.status],
        }),
      }
    )
    const result = (await response.json()) as {
      data?: ApiApplication
      message?: string
    }

    if (!response.ok || !result.data) {
      throw new Error(
        result.message ??
          `Le serveur a refusé la modification (${response.status}).`
      )
    }

    const updatedApplication = mapApiApplication(result.data)
    setApplications((previous) =>
      previous.map((application) =>
        application.id === applicationId ? updatedApplication : application
      )
    )
    setApplicationToEdit(null)
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
            <StyledSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as Status | "all")}
              ariaLabel="Filtrer par statut"
              options={[
                { value: "all", label: "Tous statuts" },
                ...Object.entries(STATUS_META).map(([key, meta]) => ({
                  value: key,
                  label: meta.label,
                })),
              ]}
              className="h-[42px] rounded-2xl border border-transparent bg-white px-4 text-sm shadow-[0_4px_15px_rgba(30,70,62,0.04)] outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
            />
            <StyledSelect
              value={channelFilter}
              onChange={(value) =>
                setChannelFilter(value as Application["channel"] | "all")
              }
              ariaLabel="Filtrer par canal"
              options={[
                { value: "all", label: "Tous canaux" },
                { value: "LinkedIn", label: "LinkedIn" },
                { value: "WTTJ", label: "WTTJ" },
                { value: "Site", label: "Site" },
                { value: "Référence", label: "Référence" },
              ]}
              className="h-[42px] rounded-2xl border border-transparent bg-white px-4 text-sm shadow-[0_4px_15px_rgba(30,70,62,0.04)] outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
            />
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
                const destination = [app.address, app.city]
                  .filter(Boolean)
                  .join(", ")
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
                          {commuteMinutes[app.id] !== undefined && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#2b7a78]">
                              <Clock className="size-3.5" />
                              {commuteMinutes[app.id]} min de trajet
                            </p>
                          )}
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
                          className="flex size-9 items-center justify-center rounded-full bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#2b7a78] hover:text-white"
                          aria-label={
                            expanded
                              ? "Masquer la progression"
                              : "Voir la progression"
                          }
                          title="Progression"
                        >
                          <ChevronDown
                            className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setApplicationToView(app)
                          }}
                          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#2b7a78] hover:text-white"
                          aria-label="Consulter la candidature"
                          title="Consulter"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setApplicationToEdit(app)
                          }}
                          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#1e463e] hover:text-white"
                          aria-label="Éditer"
                          title="Modifier"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDelete(app.id)
                          }}
                          disabled={deletingApplicationId === app.id}
                          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f5f0] text-[#1e463e]/70 transition-colors hover:bg-[#d96c4a] hover:text-white disabled:cursor-wait disabled:opacity-50"
                          aria-label="Supprimer"
                          title={
                            deletingApplicationId === app.id
                              ? "Suppression..."
                              : "Supprimer"
                          }
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
                        {destination && (
                          <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1e463e]/55">
                              Informations rapides
                            </p>
                            <p className="mb-3 text-sm text-[#1e463e]/75">
                              {destination}
                            </p>
                            <RouteActions
                              destination={destination}
                              destinationPoint={commuteRoutes[app.id]?.destination}
                              origin={commuteRoutes[app.id]?.origin}
                              minutes={commuteMinutes[app.id]}
                            />
                          </div>
                        )}
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

            {/* KPI 4 */}
            <div className="col-span-2 flex flex-col rounded-2xl bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)] xl:col-span-1">
              <span className="mb-2 text-sm font-bold tracking-wider text-[#1e463e]/60 uppercase">
                Temps de trajet moyen
              </span>
              <div className="flex min-h-12 items-end gap-3">
                <span className="text-4xl font-bold text-[#2b7a78]">
                  {averageCommuteMinutes === null
                    ? "--"
                    : `${averageCommuteMinutes} min`}
                </span>
                <span className="mb-1 text-sm font-medium text-[#1e463e]/50">
                  {averageCommuteMinutes === null
                    ? "Adresse ou trajet manquant"
                    : `${calculatedCommuteTrips} trajet${calculatedCommuteTrips > 1 ? "s" : ""} calculé${calculatedCommuteTrips > 1 ? "s" : ""}`}
                </span>
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
      {applicationToEdit && (
        <EditApplicationModal
          application={applicationToEdit}
          onClose={() => setApplicationToEdit(null)}
          onSubmit={(updates) =>
            handleUpdate(applicationToEdit.id, updates)
          }
        />
      )}
      {applicationToView && (
        <ApplicationDetailsModal
          application={applicationToView}
          commuteMinutes={commuteMinutes[applicationToView.id]}
          commuteRoute={commuteRoutes[applicationToView.id]}
          onClose={() => setApplicationToView(null)}
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
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [hasContact, setHasContact] = useState(false)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
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
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        jobUrl: jobUrl.trim() || undefined,
        contact: hasContact
          ? {
              name: contactName.trim() || undefined,
              email: contactEmail.trim() || undefined,
              phone: contactPhone.trim() || undefined,
            }
          : undefined,
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
            <AddressAutocomplete
              value={address}
              onChange={(value) => {
                setAddress(value)
                setCity("")
              }}
              onSelect={(suggestion) => {
                setAddress(suggestion.label)
                setCity(suggestion.city)
              }}
            />
            <div>
              <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                Job link <span className="font-normal text-[#1e463e]/50">(optional)</span>
              </label>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
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
              <StyledSelect
                value={channel}
                onChange={(value) =>
                  setChannel(value as Application["channel"])
                }
                ariaLabel="Canal"
                options={[
                  { value: "LinkedIn", label: "LinkedIn" },
                  { value: "WTTJ", label: "WTTJ" },
                  { value: "Site", label: "Site" },
                  { value: "Référence", label: "Référence" },
                ]}
                className="h-[50px] w-full rounded-xl border border-transparent bg-white px-4 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
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

          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[#1e463e]/80">
              <input
                type="checkbox"
                checked={hasContact}
                onChange={(e) => setHasContact(e.target.checked)}
                className="size-4 rounded border-[#ddd8ce] accent-[#1e463e]"
              />
              J’ai un contact pour cette candidature
              <span className="font-normal text-[#1e463e]/50">(facultatif)</span>
            </label>

            {hasContact && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                    Nom du contact
                  </label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nom"
                    className="w-full rounded-xl border border-transparent bg-[#f7f5f0] px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                    E-mail du contact
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@entreprise.fr"
                    className="w-full rounded-xl border border-transparent bg-[#f7f5f0] px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#1e463e]/80">
                    Téléphone du contact
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="06 00 00 00 00"
                    className="w-full rounded-xl border border-transparent bg-[#f7f5f0] px-4 py-3 shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
                  />
                </div>
              </div>
            )}
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

export function EditApplicationModal({
  application,
  heading = "Modifier le dossier",
  onClose,
  onSubmit,
}: {
  application: Application
  heading?: string
  onClose: () => void
  onSubmit: (
    updates: Omit<Application, "id" | "timeline">
  ) => Promise<void>
}) {
  const [company, setCompany] = useState(application.company)
  const [role, setRole] = useState(application.role)
  const [city, setCity] = useState(application.city ?? "")
  const [address, setAddress] = useState(application.address ?? "")
  const [jobUrl, setJobUrl] = useState(application.jobUrl ?? "")
  const [channel, setChannel] = useState(application.channel)
  const [status, setStatus] = useState(application.status)
  const [sentAt, setSentAt] = useState(application.sentAt)
  const [followupDue, setFollowupDue] = useState(application.followupDue ?? "")
  const [hasContact, setHasContact] = useState(Boolean(application.contact))
  const [contactName, setContactName] = useState(
    application.contact?.name ?? ""
  )
  const [contactEmail, setContactEmail] = useState(
    application.contact?.email ?? ""
  )
  const [contactPhone, setContactPhone] = useState(
    application.contact?.phone ?? ""
  )
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await onSubmit({
        company: company.trim(),
        role: role.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        jobUrl: jobUrl.trim() || undefined,
        contact: hasContact
          ? {
              name: contactName.trim() || undefined,
              email: contactEmail.trim() || undefined,
              phone: contactPhone.trim() || undefined,
            }
          : undefined,
        channel,
        status,
        sentAt,
        followupDue: followupDue || undefined,
        docs: application.docs,
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de modifier la candidature."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1e463e]/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-application-title"
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#f7f5f0] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#1e463e]/10 bg-white px-8 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#d96c4a]">
              {heading}
            </p>
            <h2
              id="edit-application-title"
              className="mt-1 text-2xl font-bold text-[#1e463e]"
            >
              {application.company}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[#1e463e]/50 transition-colors hover:text-[#d96c4a]"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-6 overflow-y-auto p-8">
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField label="Entreprise" value={company} onChange={setCompany} />
            <FormField label="Poste" value={role} onChange={setRole} />
            <AddressAutocomplete
              value={address}
              onChange={(value) => {
                setAddress(value)
                setCity("")
              }}
              onSelect={(suggestion) => {
                setAddress(suggestion.label)
                setCity(suggestion.city)
              }}
            />
            <FormField
              label="Lien de l’offre (facultatif)"
              type="url"
              value={jobUrl}
              onChange={setJobUrl}
            />
            <label className="block text-sm font-bold text-[#1e463e]/80">
              Statut
              <StyledSelect
                value={status}
                onChange={(value) => setStatus(value as Status)}
                ariaLabel="Statut"
                options={Object.entries(STATUS_META).map(([key, meta]) => ({
                  value: key,
                  label: meta.label,
                }))}
                className="mt-2 h-[50px] w-full rounded-xl border border-transparent bg-white px-4 font-normal shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </label>
            <label className="block text-sm font-bold text-[#1e463e]/80">
              Canal
              <StyledSelect
                value={channel}
                onChange={(value) =>
                  setChannel(value as Application["channel"])
                }
                ariaLabel="Canal"
                options={[
                  { value: "LinkedIn", label: "LinkedIn" },
                  { value: "WTTJ", label: "WTTJ" },
                  { value: "Site", label: "Site" },
                  { value: "Référence", label: "Référence" },
                ]}
                className="mt-2 h-[50px] w-full rounded-xl border border-transparent bg-white px-4 font-normal shadow-sm transition-all outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
              />
            </label>
            <FormField
              label="Date de candidature"
              type="date"
              value={sentAt}
              onChange={setSentAt}
            />
            <FormField
              label="Date de relance (facultatif)"
              type="date"
              value={followupDue}
              onChange={setFollowupDue}
            />
          </div>

          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[#1e463e]/80">
              <input
                type="checkbox"
                checked={hasContact}
                onChange={(event) => setHasContact(event.target.checked)}
                className="size-4 rounded border-[#ddd8ce] accent-[#1e463e]"
              />
              J’ai un contact pour cette candidature
              <span className="font-normal text-[#1e463e]/50">(facultatif)</span>
            </label>
            {hasContact && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField label="Nom du contact" value={contactName} onChange={setContactName} />
                <FormField label="E-mail du contact" type="email" value={contactEmail} onChange={setContactEmail} />
                <FormField label="Téléphone du contact" type="tel" value={contactPhone} onChange={setContactPhone} />
              </div>
            )}
          </section>

          <footer className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || !company.trim() || !role.trim()}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function ApplicationDetailsModal({
  application,
  commuteMinutes,
  commuteRoute,
  onClose,
}: {
  application: Application
  commuteMinutes?: number
  commuteRoute?: CommuteSummary["details"][number]
  onClose: () => void
}) {
  const destination = [application.address, application.city]
    .filter(Boolean)
    .join(", ")

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1e463e]/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-details-title"
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-[#f7f5f0] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#1e463e]/10 bg-white px-8 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#d96c4a]">
              Détail de la candidature
            </p>
            <h2
              id="application-details-title"
              className="mt-1 text-2xl font-bold text-[#1e463e]"
            >
              {application.company}
            </h2>
            <p className="text-sm text-[#1e463e]/70">{application.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-[#1e463e]/50 transition-colors hover:text-[#d96c4a]"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-8">
          <section className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#1e463e]/50">
                Statut actuel
              </p>
              <StatusBadge status={application.status} />
            </div>
            <div className="text-right">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#1e463e]/50">
                Canal
              </p>
              <p className="font-semibold text-[#1e463e]">
                {application.channel}
              </p>
            </div>
          </section>

          {destination && (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1e463e]/55">
                Localisation
              </p>
              <p className="mb-3 text-sm text-[#1e463e]/75">{destination}</p>
              <RouteActions
                destination={destination}
                destinationPoint={commuteRoute?.destination}
                origin={commuteRoute?.origin}
                minutes={commuteMinutes}
              />
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <DetailCard label="Date de candidature">
              {new Date(application.sentAt).toLocaleDateString("fr-FR")}
            </DetailCard>
            <DetailCard label="Ville">
              {application.city || "Non renseignée"}
            </DetailCard>
            <DetailCard label="Date de relance">
              {application.followupDue
                ? new Date(application.followupDue).toLocaleDateString("fr-FR")
                : "Aucune relance prévue"}
            </DetailCard>
            <DetailCard label="Lien de l’offre">
              {application.jobUrl ? (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[#2b7a78] underline"
                >
                  Ouvrir l’offre
                </a>
              ) : (
                "Aucun lien renseigné"
              )}
            </DetailCard>
          </section>

          <section className="space-y-3 rounded-2xl border border-[#1e463e]/10 bg-white p-5">
            <h3 className="font-bold text-[#1e463e]">Contact</h3>
            {application.contact &&
            (application.contact.name ||
              application.contact.email ||
              application.contact.phone) ? (
              <div className="space-y-2 text-sm text-[#1e463e]/75">
                {application.contact.name && (
                  <p>Nom : {application.contact.name}</p>
                )}
                {application.contact.email && (
                  <p>
                    E-mail :{" "}
                    <a
                      className="text-[#2b7a78] underline"
                      href={`mailto:${application.contact.email}`}
                    >
                      {application.contact.email}
                    </a>
                  </p>
                )}
                {application.contact.phone && (
                  <p>
                    Téléphone :{" "}
                    <a
                      className="text-[#2b7a78] underline"
                      href={`tel:${application.contact.phone}`}
                    >
                      {application.contact.phone}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#1e463e]/60">
                Aucun contact renseigné.
              </p>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-[#1e463e]/10 bg-white p-5">
            <h3 className="flex items-center gap-2 font-bold text-[#1e463e]">
              <Clock className="size-4 text-[#2b7a78]" />
              Historique des échanges
            </h3>
            {application.timeline.length > 0 ? (
              <ol className="relative space-y-5 border-l-2 border-[#8da399]/40 pl-6">
                {application.timeline.map((entry, index) => (
                  <li key={`${entry.date}-${index}`} className="relative">
                    <span className="absolute -left-[33px] flex size-7 items-center justify-center rounded-full bg-[#f7f5f0] text-[#2b7a78] ring-2 ring-[#8da399]/40">
                      <TimelineIcon type={entry.type} />
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <p className="font-bold text-[#1e463e]">{entry.title}</p>
                      <p className="text-xs text-[#1e463e]/55">
                        {new Date(entry.date).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    {entry.note && (
                      <p className="mt-1 text-sm text-[#1e463e]/70">
                        {entry.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#1e463e]/60">
                Aucun événement pour le moment.
              </p>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block text-sm font-bold text-[#1e463e]/80">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-transparent bg-white px-4 py-3 font-normal shadow-sm outline-none focus:border-[#2b7a78] focus:ring-2 focus:ring-[#2b7a78]/20"
      />
    </label>
  )
}

function StyledSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  ariaLabel: string
  className: string
}) {
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") onChange(nextValue)
      }}
      items={options}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={`flex min-w-0 items-center justify-between gap-3 text-left text-[#1e463e] ${className}`}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon className="shrink-0 text-[#1e463e]/60">
          <ChevronDown className="size-4" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          side="bottom"
          sideOffset={6}
          alignItemWithTrigger={false}
          collisionAvoidance={{
            side: "shift",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          className="z-[200] w-[var(--anchor-width)] outline-none"
        >
          <BaseSelect.Popup className="max-h-60 overflow-y-auto rounded-xl border border-[#eae5da] bg-white p-1.5 text-sm text-[#1e463e] shadow-[0_12px_30px_rgba(30,70,62,0.16)] outline-none">
            <BaseSelect.List>
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none transition-colors data-[highlighted]:bg-[#edf4f1] data-[selected]:font-semibold data-[selected]:text-[#1e463e]"
                >
                  <BaseSelect.ItemIndicator className="flex size-4 shrink-0 items-center justify-center text-[#2b7a78]">
                    <Check className="size-4" />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

function DetailCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-[#eae5da] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#1e463e]/50">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[#1e463e]">{children}</p>
    </div>
  )
}

export default JobPulseDashboard
