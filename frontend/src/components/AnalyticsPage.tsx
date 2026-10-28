import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  LoaderCircle,
  MapPin,
  MailCheck,
  Route,
  Target,
  TrendingUp,
} from "lucide-react"
import { DashboardNavbar } from "@/components/DashboardNavbar"

const API_URL = `${(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api`

type TimelineEntry = {
  date: string
  type: "email" | "call" | "interview" | "note" | "status"
}

type ApiApplication = {
  _id: string
  company: string
  position: string
  status: string
  channel?: string
  applicationDate: string
  timeline?: TimelineEntry[]
}

type CommuteAnalytics = {
  configured: boolean
  averageMinutes: number | null
  calculatedTrips: number
  totalApplications: number
  missingAddresses: number
  details: {
    applicationId: string
    company: string
    position: string
    address: string
    minutes: number
  }[]
}

const STATUS_LABELS: Record<string, string> = {
  postulé: "Postulées",
  "en attente": "En attente",
  "entretien prévu": "Entretiens prévus",
  entretien: "Entretiens",
  "relance faite": "Relances faites",
  "offre reçue": "Offres reçues",
  refusé: "Refusées",
}

const RESPONSE_STATUSES = new Set([
  "entretien prévu",
  "entretien",
  "relance faite",
  "offre reçue",
  "refusé",
])

const formatDuration = (days: number | null) => {
  if (days === null) return "Données insuffisantes"
  if (days < 1) return "Moins d’un jour"
  return `${Math.round(days)} jour${Math.round(days) > 1 ? "s" : ""}`
}

const formatPercent = (value: number) =>
  `${Math.round(value)} %`

const formatMinutes = (minutes: number | null) => {
  if (minutes === null) return "Données insuffisantes"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`
}

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

const getMonthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "short",
  })
}

const getToken = () =>
  localStorage.getItem("token") ?? sessionStorage.getItem("token")

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Clock3
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="rounded-2xl border border-[#eae5da] bg-white p-5 shadow-[0_4px_15px_rgba(30,70,62,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-xl bg-[#edf4f0] p-2.5 text-[#1e463e]">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="text-sm text-[#1e463e]/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1e463e]">{value}</p>
      <p className="mt-2 text-xs text-[#6b7c77]">{detail}</p>
    </article>
  )
}

export function AnalyticsPage() {
  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [commute, setCommute] = useState<CommuteAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const loadApplications = async () => {
      const token = getToken()
      if (!token) {
        setError("Reconnecte-toi pour accéder à tes statistiques.")
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = (await response.json()) as {
          data?: ApiApplication[]
          message?: string
        }
        if (!response.ok || !result.data) {
          throw new Error(result.message ?? "Impossible de charger les statistiques.")
        }
        setApplications(result.data)
        const commuteResponse = await fetch(`${API_URL}/analytics/commute`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const commuteResult = (await commuteResponse.json()) as {
          data?: CommuteAnalytics
          message?: string
        }
        if (!commuteResponse.ok || !commuteResult.data) {
          throw new Error(
            commuteResult.message ?? "Impossible de calculer les temps de trajet."
          )
        }
        setCommute(commuteResult.data)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger les statistiques."
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadApplications()
  }, [])

  const analytics = useMemo(() => {
    const responseDelays = applications.flatMap((application) => {
      const applicationTime = new Date(application.applicationDate).getTime()
      if (Number.isNaN(applicationTime)) return []

      const responseEvent = application.timeline
        ?.map((event) => ({ ...event, time: new Date(event.date).getTime() }))
        .filter(
          (event) =>
            !Number.isNaN(event.time) &&
            event.time > applicationTime &&
            event.type !== "note"
        )
        .sort((a, b) => a.time - b.time)[0]

      return responseEvent
        ? [(responseEvent.time - applicationTime) / 86_400_000]
        : []
    })
    const responded = applications.filter(
      (application) =>
        RESPONSE_STATUSES.has(application.status) ||
        application.timeline?.some((event) => event.type === "interview")
    ).length
    const averageResponseTime = responseDelays.length
      ? responseDelays.reduce((sum, delay) => sum + delay, 0) /
        responseDelays.length
      : null
    const statusCounts = applications.reduce<Record<string, number>>(
      (counts, application) => {
        counts[application.status] = (counts[application.status] ?? 0) + 1
        return counts
      },
      {}
    )
    const channelCounts = applications.reduce<Record<string, number>>(
      (counts, application) => {
        const channel = application.channel || "Non renseigné"
        counts[channel] = (counts[channel] ?? 0) + 1
        return counts
      },
      {}
    )
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - 5 + index)
      return getMonthKey(date)
    })
    const monthlyCounts = monthKeys.map((key) => ({
      key,
      label: getMonthLabel(key),
      count: applications.filter(
        (application) =>
          getMonthKey(new Date(application.applicationDate)) === key
      ).length,
    }))
    const pending = applications.filter(
      (application) =>
        application.status === "postulé" || application.status === "en attente"
    )

    return {
      responded,
      responseDelays,
      averageResponseTime,
      statusCounts,
      channelCounts,
      monthlyCounts,
      pending,
      responseRate: applications.length ? (responded / applications.length) * 100 : 0,
      maxMonthlyCount: Math.max(...monthlyCounts.map((month) => month.count), 1),
    }
  }, [applications])

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f5f0] font-sans text-[#1e463e] antialiased">
      <DashboardNavbar
        activeNav="analytics"
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
        <div className="max-w-7xl p-6 lg:p-10">
          <header className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-[#1e463e] p-3 text-white">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="mt-1 text-sm text-[#1e463e]/65">
                Comprends les tendances de ta recherche d’emploi.
              </p>
            </div>
          </header>

          {error && (
            <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-[#1e463e]/65">
              <LoaderCircle className="size-4 animate-spin" />
              Calcul des statistiques...
            </p>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={BriefcaseBusiness}
                  label="Candidatures envoyées"
                  value={String(applications.length)}
                  detail="Depuis le début du suivi"
                />
                <MetricCard
                  icon={MailCheck}
                  label="Taux de réponse"
                  value={formatPercent(analytics.responseRate)}
                  detail={`${analytics.responded} candidature${analytics.responded > 1 ? "s" : ""} avec une réponse`}
                />
                <MetricCard
                  icon={Clock3}
                  label="Temps de réponse moyen"
                  value={formatDuration(analytics.averageResponseTime)}
                  detail={`${analytics.responseDelays.length} délai${analytics.responseDelays.length > 1 ? "s" : ""} calculé${analytics.responseDelays.length > 1 ? "s" : ""} depuis la timeline`}
                />
                <MetricCard
                  icon={Target}
                  label="Taux d’entretien"
                  value={formatPercent(
                    applications.length
                      ? (applications.filter((application) =>
                          ["entretien prévu", "entretien", "offre reçue"].includes(
                            application.status
                          )
                        ).length /
                          applications.length) *
                          100
                      : 0
                  )}
                  detail="Entretiens prévus ou réalisés"
                />
                <MetricCard
                  icon={Route}
                  label="Temps de trajet moyen"
                  value={formatMinutes(commute?.averageMinutes ?? null)}
                  detail={
                    commute?.configured
                      ? `${commute.calculatedTrips} trajet${commute.calculatedTrips > 1 ? "s" : ""} calculé${commute.calculatedTrips > 1 ? "s" : ""}`
                      : "Ajoute ton adresse dans Paramètres"
                  }
                />
              </section>

              <section className="mt-6 rounded-2xl border border-[#eae5da] bg-white p-6">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-[#edf4f0] p-2.5 text-[#1e463e]">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold">Mobilité vers les entreprises</h2>
                    <p className="mt-1 text-sm text-[#6b7c77]">
                      Temps estimé en voiture depuis ton adresse du domicile.
                    </p>
                  </div>
                </div>
                {!commute?.configured ? (
                  <p className="mt-5 rounded-xl bg-[#f7f5f0] p-4 text-sm text-[#6b7c77]">
                    Sélectionne ton adresse du domicile dans Paramètres pour activer
                    le calcul des trajets.
                  </p>
                ) : commute.calculatedTrips === 0 ? (
                  <p className="mt-5 rounded-xl bg-[#f7f5f0] p-4 text-sm text-[#6b7c77]">
                    Ajoute une ville ou une adresse à tes candidatures pour calculer
                    les temps de trajet.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-[#edf4f0] p-4">
                        <p className="text-sm text-[#6b7c77]">Moyenne</p>
                        <p className="mt-1 text-xl font-bold">{formatMinutes(commute.averageMinutes)}</p>
                      </div>
                      <div className="rounded-xl bg-[#f7f5f0] p-4">
                        <p className="text-sm text-[#6b7c77]">Trajets calculés</p>
                        <p className="mt-1 text-xl font-bold">{commute.calculatedTrips}</p>
                      </div>
                      <div className="rounded-xl bg-[#f7f5f0] p-4">
                        <p className="text-sm text-[#6b7c77]">Adresses manquantes</p>
                        <p className="mt-1 text-xl font-bold">{commute.missingAddresses}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {commute.details.slice(0, 6).map((detail) => (
                        <div key={detail.applicationId} className="rounded-xl border border-[#eee9df] p-4">
                          <p className="truncate font-bold">{detail.company}</p>
                          <p className="truncate text-xs text-[#6b7c77]">{detail.position}</p>
                          <p className="mt-3 flex items-center gap-2 text-sm text-[#2b7a78]">
                            <Clock3 className="size-4" />
                            {formatMinutes(detail.minutes)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <article className="rounded-2xl border border-[#eae5da] bg-white p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">Candidatures par mois</h2>
                      <p className="mt-1 text-sm text-[#6b7c77]">Les six derniers mois</p>
                    </div>
                    <TrendingUp className="size-5 text-[#2b7a78]" />
                  </div>
                  <div className="flex h-52 items-end gap-3">
                    {analytics.monthlyCounts.map((month) => (
                      <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-xs font-bold">{month.count}</span>
                        <div className="flex h-36 w-full items-end rounded-lg bg-[#edf4f0]">
                          <div
                            className="w-full rounded-lg bg-[#2b7a78] transition-all"
                            style={{
                              height: `${Math.max((month.count / analytics.maxMonthlyCount) * 100, month.count ? 8 : 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs capitalize text-[#6b7c77]">{month.label}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-[#eae5da] bg-white p-6">
                  <h2 className="text-lg font-bold">Répartition par statut</h2>
                  <div className="mt-5 space-y-4">
                    {Object.entries(STATUS_LABELS).map(([status, label]) => {
                      const count = analytics.statusCounts[status] ?? 0
                      const ratio = applications.length ? (count / applications.length) * 100 : 0
                      return (
                        <div key={status}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{label}</span>
                            <strong>{count}</strong>
                          </div>
                          <div className="h-2 rounded-full bg-[#edf4f0]">
                            <div className="h-2 rounded-full bg-[#8da399]" style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              </section>

              <section className="mt-6 grid gap-6 lg:grid-cols-2">
                <article className="rounded-2xl border border-[#eae5da] bg-white p-6">
                  <h2 className="text-lg font-bold">Canaux les plus utilisés</h2>
                  <div className="mt-5 space-y-3">
                    {Object.entries(analytics.channelCounts).length ? (
                      Object.entries(analytics.channelCounts)
                        .sort(([, a], [, b]) => b - a)
                        .map(([channel, count]) => (
                          <div key={channel} className="flex items-center justify-between rounded-xl bg-[#f7f5f0] px-4 py-3">
                            <span>{channel}</span>
                            <strong>{count}</strong>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-[#6b7c77]">Aucune donnée disponible.</p>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-[#eae5da] bg-white p-6">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-5 text-[#2b7a78]" />
                    <h2 className="text-lg font-bold">À surveiller</h2>
                  </div>
                  <p className="mt-1 text-sm text-[#6b7c77]">
                    Candidatures encore sans réponse ou en attente.
                  </p>
                  <div className="mt-5 space-y-3">
                    {analytics.pending.slice(0, 4).map((application) => (
                      <div key={application._id} className="flex items-center justify-between rounded-xl border border-[#eee9df] px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{application.company}</p>
                          <p className="truncate text-xs text-[#6b7c77]">{application.position}</p>
                        </div>
                        <span className="ml-3 shrink-0 text-xs text-[#6b7c77]">
                          {new Date(application.applicationDate).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    ))}
                    {!analytics.pending.length && (
                      <p className="text-sm text-[#6b7c77]">Toutes les candidatures ont avancé.</p>
                    )}
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
